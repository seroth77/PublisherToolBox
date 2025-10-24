import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './ContentCard.css';
import { extractChannelIdFromUrl, fetchChannelLogo, resolveHandleOrQuery } from '../utils/channel';
import { flagForCountryName } from '../utils/flags';

// Format subscriber count to readable format (e.g., 1.2K, 3.4M)
function formatSubscriberCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

export default function ContentCard({ data, designerView = false }) {
  const [channelInfo, setChannelInfo] = useState(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  // Memoize key data values to prevent unnecessary effect triggers
  const channelData = useMemo(() => ({
    link: (data['What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)'] || '').trim(),
    name: data['What is the name of your channel?']
  }), [data]);

  // Platform canonicalization to keep labels consistent
  const PLATFORM_LABELS = useMemo(() => new Map([
    ['youtube', 'YouTube'],
    ['you tube', 'YouTube'],
    ['yt', 'YouTube'],
    ['instagram', 'Instagram'],
    ['ig', 'Instagram'],
    ['website', 'Website'],
    ['site', 'Website'],
    ['web site', 'Website'],
    ['web', 'Website'],
    ['www', 'Website'],
    ['blog', 'Blog'],
    ['blog/website', 'Website'],
    ['tiktok', 'TikTok'],
    ['tik tok', 'TikTok'],
    ['twitch', 'Twitch'],
    ['facebook', 'Facebook'],
    ['fb', 'Facebook'],
    ['twitter', 'X (Twitter)'],
    ['x', 'X (Twitter)'],
    ['x (twitter)', 'X (Twitter)'],
    ['twitter/x', 'X (Twitter)'],
    ['threads', 'Threads'],
    ['reddit', 'Reddit'],
    ['podcast', 'Podcast'],
    ['newsletter', 'Newsletter'],
    ['boardgamegeek', 'BoardGameGeek'],
    ['board game geek', 'BoardGameGeek'],
    ['bgg', 'BoardGameGeek'],
  ]), []);

  const titleCase = (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const canonicalizePlatform = useCallback((p) => {
    const key = String(p || '').trim().toLowerCase();
    return PLATFORM_LABELS.get(key) || titleCase(p);
  }, [PLATFORM_LABELS]);

  // Normalize platforms list from CSV (split by ;, &, comma) and canonicalize
  const platforms = useMemo(() => {
    const raw = data['What platform is your channel on?'] || '';
    return raw
      .split(/[;,&]/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(canonicalizePlatform);
  }, [data, canonicalizePlatform]);
  // Deduplicate for rendering and single-platform checks to avoid duplicate keys and SR repetition
  const uniquePlatforms = useMemo(() => Array.from(new Set(platforms)), [platforms]);

  const isInstagramOnly = useMemo(() => uniquePlatforms.length === 1 && uniquePlatforms[0].toLowerCase() === 'instagram', [uniquePlatforms]);
  const isWebsiteOnly = useMemo(() => uniquePlatforms.length === 1 && uniquePlatforms[0].toLowerCase() === 'website', [uniquePlatforms]);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    async function load() {
      const link = channelData.link;
      const hasYouTubePlatform = uniquePlatforms.includes('YouTube');
      const linkHasYouTube = link.toLowerCase().includes('youtube');
      // Only make YouTube API calls if the link is YouTube OR the platforms include YouTube
      if (!linkHasYouTube && !hasYouTubePlatform) return;

      let channelId = extractChannelIdFromUrl(link) || extractChannelIdFromUrl(channelData.name);

      try {
        setLoadingLogo(true);
        // Try resolving from handle in link
        if (!channelId && link.includes('@')) {
          const handle = link.split('@').pop().split(/[/?#]/)[0];
          const resolved = await resolveHandleOrQuery(handle);
          if (resolved && resolved.channelId) channelId = resolved.channelId;
        }
        // As a fallback, try resolving by channel name when platform suggests YouTube
        if (!channelId && hasYouTubePlatform) {
          const resolvedByName = await resolveHandleOrQuery(channelData.name);
          if (resolvedByName && resolvedByName.channelId) channelId = resolvedByName.channelId;
        }

        if (!channelId) return;

        const info = await fetchChannelLogo(channelId);
        if (mounted && info) {
          setChannelInfo(info);
        }
      } catch (err) {
        console.error('Error loading channel logo:', err);
      } finally {
        if (mounted) {
          setLoadingLogo(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [channelData, uniquePlatforms]);

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div className="header-channel">
          {loadingLogo && <span className="logo-placeholder loading">⏳</span>}
          {!loadingLogo && isInstagramOnly && (
            <img src="/icons/instagram.svg" alt="Instagram logo" className="channel-logo-img" />
          )}
          {!loadingLogo && isWebsiteOnly && (
            <img src="/icons/globe.svg" alt="Website logo" className="channel-logo-img" />
          )}
          {!loadingLogo && !isInstagramOnly && !isWebsiteOnly && channelInfo && channelInfo.logo && (
            <img src={channelInfo.logo} alt={`${data['What is the name of your channel?']} logo`} className="channel-logo-img" />
          )}
          {!loadingLogo && !isInstagramOnly && !isWebsiteOnly && (!channelInfo || !channelInfo.logo) && (
            <span className="logo-placeholder" aria-hidden="true">🎬</span>
          )}
          <h3 className="header-channel-title">{data['What is the name of your channel?']}</h3>
        </div>
        {(() => {
          const country = data['What country are located in?'];
          const flag = flagForCountryName(country);
          if (flag) {
            return (
              <span className="location-flag" title={country} aria-label={country} role="img">
                {flag}
              </span>
            );
          }
          return <span className="location">{country}</span>;
        })()}
      </div>

      <div className="content-card-channel">
        <div className="creator-name-row">
          <h4 className="channel-title">{data['What is your name?']}</h4>
          {channelInfo && channelInfo.subscriberCount && !channelInfo.hiddenSubscriberCount && (
            <span
              className="subscriber-count"
              title={`${channelInfo.subscriberCount.toLocaleString()} subscribers`}
              aria-label={`${channelInfo.subscriberCount.toLocaleString()} subscribers`}
            >
              {formatSubscriberCount(channelInfo.subscriberCount)} subs
            </span>
          )}
          {channelInfo && channelInfo.hiddenSubscriberCount && (
            <span
              className="subscriber-count hidden"
              title="Subscriber count hidden by channel owner"
              aria-label="Subscriber count hidden by channel owner"
            >
              Hidden
            </span>
          )}
        </div>
        <a href={data['What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)']?.split(',')[0]} target="_blank" rel="noopener noreferrer">
          Visit Channel
        </a>
        <ul className="platforms" aria-label="Platforms">
          {uniquePlatforms.map(platform => (
            <li key={platform} className="platform-tag">
              {platform}
            </li>
          ))}
        </ul>
      </div>

      <div className="content-card-details">
        <p><strong>Content Type:</strong> {data['What type of content do you prefer to cover?']}</p>
        {designerView && (
          <>
            <p><strong>Prototype Time:</strong> {data['How long do you need with a prototype to produce certain content?']}</p>
            <p><strong>Paid Content:</strong> {data['Do you charge for content?']}</p>
          </>
        )}
      </div>

      <div className="content-card-games">
        <h4>Favorite Games</h4>
        <p>{data['What are your top 10 favorite games?']}</p>
      </div>

      <div className="content-card-footer">
        <strong>Contact:</strong> {(() => {
          const contact = data['How can a dev contact you?'] || '';
          if (!contact) return null;
          // Split the string and interleave email anchors for any detected addresses
          const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
          const parts = String(contact).split(EMAIL_REGEX);
          return parts.map((part, idx) => {
            if (EMAIL_REGEX.test(part)) {
              // Reset regex lastIndex due to test() with global
              EMAIL_REGEX.lastIndex = 0;
              const email = part;
              return (
                <a key={`email-${idx}`} href={`mailto:${email}`} aria-label={`Email ${email}`}>
                  {email}
                </a>
              );
            }
            return <span key={`txt-${idx}`}>{part}</span>;
          });
        })()}
      </div>
    </div>
  );
}