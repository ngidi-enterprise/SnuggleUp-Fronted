import React from 'react';
import './TrustBadges.css';

export default function TrustBadges() {
  return (
    <div className="trust-badges">
      <div className="trust-badge">
        <div className="badge-icon">🔒</div>
        <div className="badge-text">
          <strong>Secure Checkout</strong>
          <span>PayFast Protected</span>
        </div>
      </div>
      <div className="trust-badge">
        <div className="badge-icon">🚚</div>
        <div className="badge-text">
          <strong>Reliable Shipping</strong>
        </div>
      </div>
      <div className="trust-badge">
        <div className="badge-icon">↩️</div>
        <div className="badge-text">
          <strong>Easy Returns</strong>
          <span>30-day guarantee</span>
        </div>
      </div>
    </div>
  );
}
