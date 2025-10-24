const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const fsp = require('fs').promises;
const { pipeline } = require('stream/promises');
const { URL } = require('url');

const { getChannelInfo, resolveChannelByQuery } = require('./lib/youtube');

const app = express();
const PORT = process.env.PORT || 3001;

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Serve cached images
app.use('/cache', express.static(CACHE_DIR, { maxAge: '7d' }));

// Helper: download image to cache and return local path
async function cacheImage(channelId, imageUrl) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    const ext = path.extname(url.pathname) || '.jpg';
    // sanitize channelId for file name
    const safeId = channelId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeId}${ext}`;
    const filepath = path.join(CACHE_DIR, filename);

    // If already cached, return existing local URL
    try {
      const stat = await fsp.stat(filepath);
      if (stat && stat.size > 0) {
        return `/cache/${filename}`;
      }
    } catch (e) {
      // file doesn't exist, continue to download
    }

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to download image ${res.status}`);

    const dest = fs.createWriteStream(filepath);
    await pipeline(res.body, dest);
    return `/cache/${filename}`;
  } catch (err) {
    console.error('cacheImage error', err && err.message);
    return null;
  }
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Resolve query (handles or names) to channelId/title/logo using search
app.get('/api/resolve', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q query required' });
  try {
    const info = await resolveChannelByQuery(q);
    res.json(info);
  } catch (err) {
    console.error('Resolve error:', err && err.message);
    const status = err && err.status ? err.status : 500;
    res.status(status).json({ error: err.message || 'Failed' });
  }
});

// Proxy endpoint that returns logo + title for a channelId
app.get('/api/channel/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
    // Verify we have an API key before attempting the request
    if (!process.env.YT_API_KEY) {
      throw new Error('YouTube API key not configured. Please set YT_API_KEY in environment variables.');
    }

    console.log(`Fetching channel info for ${channelId}`);
    const info = await getChannelInfo(channelId);
    console.log(`Channel info retrieved:`, { 
      title: info.title, 
      hasLogo: !!info.logo,
      subscriberCount: info.subscriberCount,
      hiddenSubscriberCount: info.hiddenSubscriberCount
    });
    
    // Attempt to cache the logo and return a local URL when possible
    const cachedPath = await cacheImage(channelId, info.logo).catch(err => {
      console.warn(`Cache error for ${channelId}:`, err.message);
      return null;
    });
    const logoUrl = cachedPath || info.logo;
    res.json({ 
      logo: logoUrl, 
      title: info.title, 
      subscriberCount: info.subscriberCount,
      hiddenSubscriberCount: info.hiddenSubscriberCount,
      viewCount: info.viewCount,
      videoCount: info.videoCount
    });
  } catch (err) {
    console.error('API error for channel', channelId, ':', {
      message: err.message,
      status: err.status,
      response: err.text || err.body,
    });
    const status = err && err.status ? err.status : 500;
    res.status(status).json({ 
      error: err.message || 'Failed',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube proxy API listening on http://localhost:${PORT}`);
});
