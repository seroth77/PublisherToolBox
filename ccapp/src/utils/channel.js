// Minimal client-side utility to extract channel ID and fetch channel logo/title
export function extractChannelIdFromUrl(url) {
  if (!url) return null;
  try {
    // Remove any trailing whitespace or query parameters
    const cleanUrl = url.split('?')[0].trim();
    
    // If already a UC id
    if (/^UC[\w-]{22}$/.test(cleanUrl)) return cleanUrl;

    // Handle direct URLs
    if (cleanUrl.startsWith('http')) {
      const u = new URL(cleanUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      
      // Standard channel URL
      if (parts[0] === 'channel' && parts[1]) return parts[1];
      
      // Handle @username format
      if (parts[0]?.startsWith('@')) {
        return parts[0].substring(1);
      }
    } 
    // Handle non-URL @username format
    else if (cleanUrl.startsWith('@')) {
      return cleanUrl.substring(1);
    }
    
    return null;
  } catch (e) {
    // If URL parsing fails, try to extract a handle
    try {
      const match = url.match(/@([\w-]+)/);
      if (match && match[1]) {
        return match[1];
      }
    } catch (_) {}
    return null;
  }
}

const clientCache = new Map();

export async function fetchChannelLogo(channelId) {
  if (!channelId) return null;
  if (clientCache.has(channelId)) return clientCache.get(channelId);

  try {
  const res = await fetch(`/api/channel/${encodeURIComponent(channelId)}`);
    if (!res.ok) return null;
    const body = await res.json();
    clientCache.set(channelId, body);
    return body;
  } catch (e) {
    console.error('fetchChannelLogo error', e);
    return null;
  }
}

export async function resolveHandleOrQuery(q) {
  if (!q) return null;
  try {
  const res = await fetch(`/api/resolve?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body;
  } catch (e) {
    console.error('resolveHandleOrQuery error', e);
    return null;
  }
}
