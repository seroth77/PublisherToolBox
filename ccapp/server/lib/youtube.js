const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const DEFAULT_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Persistent cache file
const CACHE_FILE = path.join(__dirname, '..', 'cache', 'youtube-api-cache.json');

// Simple in-memory cache: { [channelId]: { ts, value } }
const cache = new Map();

// Load cache from disk on startup
function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      Object.entries(parsed).forEach(([key, value]) => {
        cache.set(key, value);
      });
      console.log(`Loaded ${cache.size} cached YouTube API entries from disk`);
    }
  } catch (err) {
    console.warn('Failed to load YouTube API cache from disk:', err.message);
  }
}

// Save cache to disk
function saveCacheToDisk() {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const obj = {};
    cache.forEach((value, key) => {
      obj[key] = value;
    });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save YouTube API cache to disk:', err.message);
  }
}

// Load cache on module initialization
loadCacheFromDisk();

/**
 * getChannelInfo - fetch basic channel info from YouTube Data API
 *
 * @param {string} channelId - YouTube channel ID (starts with 'UC')
 * @param {object} [opts]
 * @param {string} [opts.apiKey] - Optional API key (falls back to process.env.YT_API_KEY)
 * @param {number} [opts.ttl] - Cache TTL in ms
 * @returns {Promise<{logo:string,title:string,raw:object}>}
 */
async function getChannelInfo(channelId, opts = {}) {
  if (!channelId || typeof channelId !== 'string') {
    throw new TypeError('channelId must be a non-empty string');
  }

  const apiKey = opts.apiKey || process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not provided. Set YT_API_KEY or pass opts.apiKey');
  }

  const ttl = typeof opts.ttl === 'number' ? opts.ttl : DEFAULT_TTL;

  // Return cached value when valid
  const cached = cache.get(channelId);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.value;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${apiKey}`;

  console.log('Fetching YouTube API:', url.replace(apiKey, 'REDACTED'));
  
  const res = await fetch(url, { 
    timeout: 10000,
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMessage = `YouTube API error ${res.status}`;
    
    try {
      const errorData = JSON.parse(text);
      if (errorData.error && errorData.error.message) {
        errorMessage = `YouTube API error: ${errorData.error.message}`;
      }
    } catch (e) {
      errorMessage += `: ${text}`;
    }
    
    const err = new Error(errorMessage);
    err.status = res.status;
    err.text = text;
    throw err;
  }

  const data = await res.json();
  if (!data.items || !data.items.length) {
    const err = new Error('Channel not found');
    err.status = 404;
    throw err;
  }

  const snippet = data.items[0].snippet || {};
  const logo = snippet.thumbnails && (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high)
    ? (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high).url
    : null;

  const value = {
    logo,
    title: snippet.title || null,
    raw: data
  };

  // Cache result in memory
  cache.set(channelId, { ts: Date.now(), value });
  
  // Save cache to disk asynchronously (don't wait)
  setImmediate(() => saveCacheToDisk());

  return value;
}

/**
 * resolveChannelByQuery - use YouTube Search API to find a channel by handle or query
 * @param {string} query - handle or search query
 * @param {object} [opts]
 */
async function resolveChannelByQuery(query, opts = {}) {
  if (!query || typeof query !== 'string') {
    throw new TypeError('query must be a non-empty string');
  }

  const apiKey = opts.apiKey || process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YouTube API key not provided. Set YT_API_KEY or pass opts.apiKey');

  const ttl = typeof opts.ttl === 'number' ? opts.ttl : DEFAULT_TTL;
  
  // Check cache using query as key
  const cacheKey = `query:${query}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.value;
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url, { timeout: 10000 });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`YouTube Search API error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data.items || !data.items.length) {
    const err = new Error('Channel not found');
    err.status = 404;
    throw err;
  }

  const item = data.items[0];
  const channelId = (item.id && item.id.channelId) || (item.snippet && item.snippet.channelId) || null;
  const snippet = item.snippet || {};
  const logo = snippet.thumbnails && (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high)
    ? (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high).url
    : null;

  const value = { channelId, title: snippet.title || null, logo, raw: data };
  
  // Cache result in memory
  cache.set(cacheKey, { ts: Date.now(), value });
  
  // Save cache to disk asynchronously
  setImmediate(() => saveCacheToDisk());
  
  return value;
}

module.exports = {
  getChannelInfo,
  resolveChannelByQuery,
  // Expose cache for tests/inspection
  _cache: cache
};
