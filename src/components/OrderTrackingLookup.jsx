import React, { useState } from 'react';
import './UserAccount.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

function trackingStatusText(status) {
  switch (String(status || '').toLowerCase()) {
    case 'pending-collection': return 'Waiting for collection';
    case 'collected': return 'Collected by courier';
    case 'in-transit': return 'In transit';
    case 'out-for-delivery': return 'Out for delivery';
    case 'delivered': return 'Delivered';
    case 'exception':
    case 'failed':
    case 'failed-will-retry': return 'Needs attention';
    default: return status ? String(status).replace(/-/g, ' ') : 'Preparing shipment';
  }
}

function trackingStepIndex(status, orderStatus) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'delivered' || orderStatus === 'completed') return 4;
  if (normalized === 'out-for-delivery') return 3;
  if (normalized === 'in-transit' || normalized === 'collected') return 2;
  if (normalized === 'pending-collection' || orderStatus === 'paid') return 1;
  return 0;
}

function normalizeEvents(order) {
  const events = Array.isArray(order?.bob_tracking_events) ? order.bob_tracking_events : [];
  return events
    .filter(event => event && typeof event === 'object')
    .slice()
    .sort((a, b) => {
      const aTime = Date.parse(a.time || '');
      const bTime = Date.parse(b.time || '');
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
      return 0;
    });
}

function money(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

export default function OrderTrackingLookup({ onClose }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const response = await fetch(`${API_BASE}/api/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'We could not find that order yet.');
        return;
      }

      setOrder(data.order);
    } catch (err) {
      setError(err.message || 'Tracking lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const events = normalizeEvents(order);
  const trackingUrl = order?.bob_tracking_url || order?.cj_tracking_url;
  const trackingRef = order?.bob_tracking_reference || order?.cj_tracking_number;
  const trackingStatus = order?.bob_tracking_status || order?.cj_status;
  const hasTracking = Boolean(trackingRef || trackingStatus || trackingUrl || events.length);
  const activeStep = trackingStepIndex(trackingStatus, order?.status);
  const steps = ['Order placed', 'Verified', 'With courier', 'Out for delivery', 'Delivered'];

  return (
    <div className="user-account-modal">
      <div className="user-account-content tracking-lookup-modal">
        <button className="close-account" onClick={onClose}>x</button>
        <div className="account-header">
          <h2>Track your order</h2>
          <p>Use the email address from checkout.</p>
        </div>

        <div className="tab-content">
          <form className="tracking-lookup-form" onSubmit={submit}>
            <div className="form-group">
              <label>Order number</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="SNUG-..."
                required
              />
            </div>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button className="tracking-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Find my order'}
            </button>
          </form>

          {error && <p className="error-text">{error}</p>}

          {order && (
            <div className="order-card tracking-result-card">
              <div className="order-header">
                <div>
                  <strong>Order #{order.order_number}</strong>
                  <p className="order-date">
                    {new Date(order.created_at).toLocaleDateString('en-ZA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="order-status">
                  {order.status === 'paid' ? 'Payment confirmed' : order.status}
                </span>
              </div>

              <div className={`delivery-tracking ${hasTracking ? 'has-tracking' : 'pending-tracking'}`}>
                <div className="tracking-topline">
                  <div>
                    <strong>Delivery tracking</strong>
                    <p>{hasTracking ? trackingStatusText(trackingStatus) : 'Tracking will appear here once your shipment is booked.'}</p>
                  </div>
                  {trackingUrl && (
                    <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="tracking-link">
                      Track parcel
                    </a>
                  )}
                </div>

                <div className="tracking-progress">
                  {steps.map((step, index) => (
                    <div key={step} className={`tracking-step ${index <= activeStep ? 'active' : ''}`}>
                      <span className="tracking-dot" />
                      <small>{step}</small>
                    </div>
                  ))}
                </div>

                {hasTracking && (
                  <div className="tracking-meta">
                    {order.bob_courier_name && <span>{order.bob_courier_name}</span>}
                    {order.bob_service_level && <span>{order.bob_service_level}</span>}
                    {trackingRef && <span>Ref: {trackingRef}</span>}
                  </div>
                )}

                {events.length > 0 && (
                  <div className="tracking-events">
                    {events.slice(0, 4).map((event, idx) => (
                      <div key={idx} className="tracking-event">
                        <span>{event.time ? new Date(event.time).toLocaleString('en-ZA') : 'Update'}</span>
                        <strong>{trackingStatusText(event.status)}</strong>
                        <p>{event.description || event.location || 'Tracking updated'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{money(order.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>{money(order.shipping)}</span>
                </div>
                <div className="summary-row total">
                  <strong>Total:</strong>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
