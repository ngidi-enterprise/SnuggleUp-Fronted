import React, { useState } from 'react';
import './PromoPopup.css';

export default function PromoPopup({ onClose, onSignup }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Clear error and trigger signup
    setError('');
    
    // Pass data to parent component for account creation
    onSignup?.({ firstName, lastName, email });
    
    // Show success message and close
    alert('🎉 Awesome! Check your email for your 10% discount code: BLACKFRIDAY10');
    onClose?.();
  };

  return (
    <div className="promo-popup-overlay" onClick={onClose}>
      <div className="promo-popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="promo-popup-close" onClick={onClose}>
          ✕
        </button>

        <div className="promo-popup-body">
          <div className="promo-popup-header">
            <h2 className="promo-popup-title">10% OFF</h2>
            <h3 className="promo-popup-subtitle">your first order</h3>
          </div>

          <p className="promo-popup-description">
            This Black Friday! 🎉
          </p>

          <form className="promo-popup-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="promo-popup-input"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="text"
              className="promo-popup-input"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              type="email"
              className="promo-popup-input"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            
            {error && (
              <p style={{ color: '#fef3c7', fontSize: '14px', margin: '0' }}>
                ⚠️ {error}
              </p>
            )}

            <button type="submit" className="promo-popup-submit">
              Subscribe
            </button>
          </form>

          <p className="promo-popup-footer">
            Get exclusive deals and updates on baby essentials
          </p>

          <div className="promo-balloon">🎈</div>
        </div>
      </div>
    </div>
  );
}
