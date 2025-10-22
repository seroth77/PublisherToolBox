import React, { useEffect, useState, useMemo } from 'react';
import './ContentCard.css';
import { extractChannelIdFromUrl, fetchChannelLogo, resolveHandleOrQuery } from '../utils/channel';
import { flagForCountryName } from '../utils/flags';

export default function ContentCard({ data }) {
  const [channelInfo, setChannelInfo] = useState(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  // Memoize key data values to prevent unnecessary effect triggers
  const channelData = useMemo(() => ({
    link: (data['What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)'] || '').trim(),
    name: data['What is the name of your channel?']
  }), [data]);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    async function load() {
      const link = channelData.link;
      let channelId = extractChannelIdFromUrl(link) || extractChannelIdFromUrl(channelData.name);

      try {
        setLoadingLogo(true);
        
        // If we have a handle like /@handle or the link contains '@', try resolving
        if (!channelId && link.includes('@')) {
          const handle = link.split('@').pop().split(/[/?#]/)[0];
          const resolved = await resolveHandleOrQuery(handle);
          if (resolved && resolved.channelId) channelId = resolved.channelId;
          else if (resolved && resolved.logo && mounted) {
            setChannelInfo({ logo: resolved.logo, title: resolved.title });
            return;
          }
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
  }, [channelData]);

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div className="header-channel">
          {loadingLogo && <span className="logo-placeholder loading">⏳</span>}
          {!loadingLogo && channelInfo && channelInfo.logo && (
            <img src={channelInfo.logo} alt={`${data['What is the name of your channel?']} logo`} className="channel-logo-img" />
          )}
          {!loadingLogo && (!channelInfo || !channelInfo.logo) && (
            <span className="logo-placeholder">🎬</span>
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
        <h4 className="channel-title">{data['What is your name?']}</h4>
        <a href={data['What is the link to your channel(s)? (If you have multiple channels, add them all using commas to separate them.)']?.split(',')[0]} target="_blank" rel="noopener noreferrer">
          Visit Channel
        </a>
        <div className="platforms">
          {(data['What platform is your channel on?'] || '').split(';').map(platform => (
            <span key={platform} className="platform-tag">
              {platform.trim()}
            </span>
          ))}
        </div>
      </div>

      <div className="content-card-details">
        <p><strong>Content Type:</strong> {data['What type of content do you prefer to cover?']}</p>
        <p><strong>Prototype Time:</strong> {data['How long do you need with a prototype to produce certain content?']}</p>
        <p><strong>Paid Content:</strong> {data['Do you charge for content?']}</p>
      </div>

      <div className="content-card-games">
        <h4>Favorite Games</h4>
        <p>{data['What are your top 10 favorite games?']}</p>
      </div>

      <div className="content-card-footer">
        <strong>Contact:</strong> {data['How can a dev contact you?']}
      </div>
    </div>
  );
}