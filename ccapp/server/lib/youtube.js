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
 * @param {string} channelIdOrName - YouTube channel ID (starts with 'UC') or channel handle/name
 * @param {object} [opts]
 * @param {string} [opts.apiKey] - Optional API key (falls back to process.env.YT_API_KEY)
 * @param {number} [opts.ttl] - Cache TTL in ms
 * @returns {Promise<{logo:string,title:string,subscriberCount:number,raw:object}>}
 */
async function getChannelInfo(channelIdOrName, opts = {}) {
  if (!channelIdOrName || typeof channelIdOrName !== 'string') {
    throw new TypeError('channelIdOrName must be a non-empty string');
  }

  const apiKey = opts.apiKey || process.env.YT_API_KEY || process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not provided. Set YT_API_KEY or pass opts.apiKey');
  }

  const ttl = typeof opts.ttl === 'number' ? opts.ttl : DEFAULT_TTL;

  // Return cached value when valid
  const cached = cache.get(channelIdOrName);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.value;
  }

  let channelId = channelIdOrName;

  // If it doesn't look like a channel ID (UC...), try to resolve it as a handle/name
  if (!/^UC[\w-]{22}$/.test(channelIdOrName)) {
    console.log(`Attempting to resolve channel name/handle: ${channelIdOrName}`);
    try {
      const resolved = await resolveChannelByQuery(channelIdOrName, opts);
      if (resolved && resolved.channelId) {
        channelId = resolved.channelId;
        console.log(`Resolved ${channelIdOrName} to channel ID: ${channelId}`);
      } else {
        throw new Error(`Could not resolve channel name/handle: ${channelIdOrName}`);
      }
    } catch (err) {
      console.error(`Failed to resolve channel name ${channelIdOrName}:`, err.message);
      throw err;
    }
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`;

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
  const statistics = data.items[0].statistics || {};
  const logo = snippet.thumbnails && (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high)
    ? (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high).url
    : null;

  const value = {
    logo,
    title: snippet.title || null,
    subscriberCount: statistics.subscriberCount ? parseInt(statistics.subscriberCount, 10) : null,
    hiddenSubscriberCount: statistics.hiddenSubscriberCount || false,
    viewCount: statistics.viewCount ? parseInt(statistics.viewCount, 10) : null,
    videoCount: statistics.videoCount ? parseInt(statistics.videoCount, 10) : null,
    raw: data
  };

  // Cache result in memory (using both original input and resolved channelId as keys)
  cache.set(channelIdOrName, { ts: Date.now(), value });
  if (channelId !== channelIdOrName) {
    cache.set(channelId, { ts: Date.now(), value });
  }
  
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

  const trimmed = query.trim();
  // Try handle-first: if no leading '@', try '@name' first, then fallback to original query
  const attempts = [];
  if (!trimmed.startsWith('@')) {
    attempts.push(`@${trimmed}`);
  }
  attempts.push(trimmed);

  // Helper to fetch a single attempt and return null if not found (404/empty)
  const tryFetch = async (q) => {
    const cacheKey = `query:${q}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) {
      return { value: cached.value, cacheKey };
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`;
    try {
      console.log(`Resolving via YouTube Search with query: ${q}`);
      const res = await fetch(url, { timeout: 10000 });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`YouTube Search API error ${res.status}: ${text}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      if (!data.items || !data.items.length) {
        return null; // not found for this attempt
      }
      const item = data.items[0];
      const channelId = (item.id && item.id.channelId) || (item.snippet && item.snippet.channelId) || null;
      const snippet = item.snippet || {};
      const logo = snippet.thumbnails && (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high)
        ? (snippet.thumbnails.default || snippet.thumbnails.medium || snippet.thumbnails.high).url
        : null;
      const value = { channelId, title: snippet.title || null, logo, raw: data };
      return { value, cacheKey };
    } catch (e) {
      // Only swallow 404-like empty results; rethrow other API errors
      if (e && (e.status === 404)) {
        return null;
      }
      throw e;
    }
  };

  // Try attempts in order
  for (const attempt of attempts) {
    const result = await tryFetch(attempt);
    if (result && result.value) {
      // Cache under both the attempt-specific key and the original query for faster subsequent lookups
      cache.set(result.cacheKey, { ts: Date.now(), value: result.value });
      cache.set(`query:${trimmed}`, { ts: Date.now(), value: result.value });
      setImmediate(() => saveCacheToDisk());
      if (attempt.startsWith('@') && attempt !== trimmed) {
        console.log(`Resolved by handle-first: used ${attempt} for query '${trimmed}'`);
      }
      return result.value;
    }
  }

  const err = new Error('Channel not found');
  err.status = 404;
  throw err;
}

module.exports = {
  getChannelInfo,
  resolveChannelByQuery,
  // Expose cache for tests/inspection
  _cache: cache
};
