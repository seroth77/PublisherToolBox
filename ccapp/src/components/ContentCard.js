import React from 'react';
import './ContentCard.css';

export default function ContentCard({ data }) {
  return (
    <div className="content-card">
      <div className="content-card-header">
        <h3>{data['What is your name?']}</h3>
        <span className="location">{data['What country are located in?']}</span>
      </div>
      
      <div className="content-card-channel">
        <h4>{data['What is the name of your channel?']}</h4>
        <a href={data['What is the link to your channel?']} target="_blank" rel="noopener noreferrer">
          Visit Channel
        </a>
        <div className="platforms">
          {data['What platform is your channel on?'].split(';').map(platform => (
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