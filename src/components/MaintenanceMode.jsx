import React from 'react';
import './MaintenanceMode.css';

function MaintenanceMode({ onRetry }) {
  return (
    <div className="maintenance-overlay">
      <div className="maintenance-content">
        <div className="maintenance-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ff9800"/>
          </svg>
        </div>
        <h1>We'll be right back!</h1>
        <p>Our servers are taking a quick coffee break ☕</p>
        <p className="maintenance-details">
          We're experiencing temporary technical difficulties. This usually resolves within a few minutes.
        </p>
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
        <p className="maintenance-footer">
          If this persists, please contact us at <a href="mailto:support@snuggleup.co.za">support@snuggleup.co.za</a>
        </p>
      </div>
    </div>
  );
}

export default MaintenanceMode;
