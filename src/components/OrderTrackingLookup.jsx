import React, { useEffect, useState } from 'react';
import './UserAccount.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';
const TRACKING_LOGO_SRC = '/images/SnuggleUp%20Logo%20-%20Smaller.png';

function trackingStatusText(status) {
  switch (String(status || '').toLowerCase()) {
    case 'created': return 'Created';
    case 'pending-collection': return 'Waiting for collection';
    case 'collected': return 'Collected';
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
  if (normalized === 'in-transit') return 2;
  if (normalized === 'collected') return 1;
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

function visibleTrackingEvents(order, events, trackingStatus) {
  if (!trackingStatus) return events;

  const currentStep = trackingStepIndex(trackingStatus, order?.status);
  const latestEventStep = events.length
    ? trackingStepIndex(events[0]?.status, order?.status)
    : -1;

  if (latestEventStep >= currentStep) return events;

  return [
    {
      status: trackingStatus,
      time: order?.bob_tracking_updated_at || order?.updated_at,
      description: `Current status: ${trackingStatusText(trackingStatus)}`,
    },
    ...events,
  ];
}

function money(value) {
  return `R${Number(value || 0).toFixed(2)}`;
}

export default function OrderTrackingLookup({
  onClose = () => {},
  mode = 'modal',
  initialOrderNumber = '',
  initialEmail = '',
  initialToken = '',
  autoLookup = false,
}) {
  const isPage = mode === 'page';
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [token] = useState(initialToken);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoLookupDone, setAutoLookupDone] = useState(false);

  const lookupOrder = async () => {
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const usingToken = Boolean(token);
      const response = await fetch(`${API_BASE}${usingToken ? '/api/orders/track-link' : '/api/orders/track'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usingToken ? { orderNumber, token } : { orderNumber, email }),
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

  useEffect(() => {
    if (isPage) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPage, onClose]);

  useEffect(() => {
    if (!autoLookup || autoLookupDone || !orderNumber || !token) return;
    setAutoLookupDone(true);
    lookupOrder();
  }, [autoLookup, autoLookupDone, orderNumber, token]);

  const submit = async (event) => {
    event.preventDefault();
    lookupOrder();
  };

  const events = normalizeEvents(order);
  const trackingRef = order?.bob_tracking_reference || order?.cj_tracking_number;
  const trackingStatus = order?.bob_tracking_status || order?.cj_status;
  const displayEvents = visibleTrackingEvents(order, events, trackingStatus);
  const hasTracking = Boolean(trackingRef || trackingStatus || events.length);
  const activeStep = trackingStepIndex(trackingStatus, order?.status);
  const steps = ['Created', 'Collected', 'In transit', 'Out for delivery', 'Delivered'];

  const form = (!order || !token) && (
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
      {!token && (
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
      )}
      <button className="tracking-submit-btn" type="submit" disabled={loading}>
        {loading ? 'Checking...' : 'Find my order'}
      </button>
    </form>
  );

  const result = order && (
    <div className={`order-card tracking-result-card ${isPage ? 'tracking-page-result-card' : ''}`}>
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
          {isPage && (
            <button className="tracking-refresh-button" type="button" onClick={lookupOrder} disabled={loading}>
              Refresh
            </button>
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
            {order.bob_tracking_updated_at && (
              <span>Updated {new Date(order.bob_tracking_updated_at).toLocaleDateString('en-ZA')}</span>
            )}
          </div>
        )}

        {displayEvents.length > 0 && (
          <div className="tracking-events">
            {displayEvents.slice(0, 4).map((event, idx) => (
              <div key={idx} className="tracking-event">
                <span>{event.time ? new Date(event.time).toLocaleString('en-ZA') : 'Update'}</span>
                <strong>{trackingStatusText(event.status)}</strong>
                <p>{event.description || event.location || 'Tracking updated'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPage && (
        <div className="tracking-shipping-details">
          <h3>Shipping details</h3>
          <div>
            <span>Shipment</span>
            <strong>{trackingRef || 'Preparing'}</strong>
          </div>
          <div>
            <span>Service level</span>
            <strong>{order.bob_service_level || order.shipping_method || 'Standard delivery'}</strong>
          </div>
          <div>
            <span>Courier</span>
            <strong>{order.bob_courier_name || 'To be confirmed'}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{trackingStatusText(trackingStatus)}</strong>
          </div>
        </div>
      )}

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
  );

  if (isPage) {
    return (
      <main className="tracking-page">
        <section className="tracking-page-shell">
          <img src={TRACKING_LOGO_SRC} alt="SnuggleUp Baby Store" className="tracking-page-logo" />
          <h1>Track my parcel</h1>
          {!order && (
            <p className="tracking-page-intro">
              Follow your SnuggleUp delivery journey here.
            </p>
          )}
          {form}
          {loading && !order && <p className="loading-text">Loading tracking...</p>}
          {error && <p className="error-text">{error}</p>}
          {result}
        </section>
      </main>
    );
  }

  return (
    <div className="user-account-modal" onClick={onClose}>
      <div className="user-account-content tracking-lookup-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-account tracking-close-button" onClick={onClose} aria-label="Close tracking">
          x
        </button>
        <div className="account-header">
          <h2>Track your order</h2>
          <p>Use the email address from checkout.</p>
        </div>

        <div className="tab-content">
          {form}
          {error && <p className="error-text">{error}</p>}
          {result}
        </div>
      </div>
    </div>
  );
}
