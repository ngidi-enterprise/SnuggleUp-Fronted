import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserAccount.css';

function UserAccount({ onClose, isAdmin }) {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/orders/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contentType = response.headers.get('content-type') || '';

      // If response is not OK, handle error gracefully
      if (!response.ok) {
        console.log('Orders fetch response:', response.status, contentType);
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
        } else if (response.status >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(`Failed to fetch orders (Error ${response.status}). Please try again.`);
        }
        setOrders([]);
        return;
      }

      // If response is OK but not JSON, treat as empty orders
      if (!contentType.includes('application/json')) {
        setOrders([]);
        return;
      }

      const data = await response.json().catch(e => {
        throw new Error('Failed to parse orders response.');
      });

      const rawOrders = Array.isArray(data.orders) ? data.orders : [];

      const safeParse = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return []; }
        }
        return [];
      };

      const normalized = rawOrders.map(o => ({
        ...o,
        items: safeParse(o.items)
      }));

      setOrders(normalized);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'paid': return '#126f71';
      case 'pending': return '#ff6600';
      case 'failed': return '#dc3545';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '✓ Completed';
      case 'pending': return '⏳ Pending';
      case 'failed': return '✗ Failed';
      default: return status;
    }
  };

  const getCustomerStatusText = (status) => {
    if (status === 'paid') return 'Payment confirmed';
    return getStatusText(status);
  };

  const trackingStatusText = (status) => {
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
  };

  const trackingStepIndex = (status, orderStatus) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'delivered' || orderStatus === 'completed') return 4;
    if (normalized === 'out-for-delivery') return 3;
    if (normalized === 'in-transit') return 2;
    if (normalized === 'collected') return 1;
    return 0;
  };

  const normalizedTrackingEvents = (order) => {
    const events = Array.isArray(order.bob_tracking_events) ? order.bob_tracking_events : [];
    return events
      .filter(event => event && typeof event === 'object')
      .slice()
      .sort((a, b) => {
        const aTime = Date.parse(a.time || '');
        const bTime = Date.parse(b.time || '');
        if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
        return 0;
      });
  };

  const visibleTrackingEvents = (order, events, trackingStatus) => {
    if (!trackingStatus) return events;

    const currentStep = trackingStepIndex(trackingStatus, order.status);
    const latestEventStep = events.length
      ? trackingStepIndex(events[0]?.status, order.status)
      : -1;

    if (latestEventStep >= currentStep) return events;

    return [
      {
        status: trackingStatus,
        time: order.bob_tracking_updated_at || order.updated_at,
        description: `Current status: ${trackingStatusText(trackingStatus)}`,
      },
      ...events,
    ];
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div
      className="user-account-modal"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label="Your account"
    >
      <div className="user-account-content" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-account" onClick={onClose} aria-label="Close account panel" title="Close">×</button>
        <button className="back-to-shop-btn" onClick={onClose}>← Back to Shopping</button>
        <div className="account-header">
          <div className="user-avatar">👤</div>
          <h2>{user?.name || user?.email || 'User'}</h2>
          <p>{user?.email}</p>
        </div>

        <div className="account-tabs">
          <button 
            className={activeTab === 'profile' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          {!isAdmin && (
            <button 
              className={activeTab === 'orders' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('orders')}
            >
              Order History
            </button>
          )}
        </div>

        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="profile-section">
              <h3>Account Information</h3>
              <div className="info-row">
                <span className="label">Name:</span>
                <span className="value">{user?.name}</span>
              </div>
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="label">Phone:</span>
                <span className="value">{user?.phone || 'Not provided'}</span>
              </div>
            </div>
            
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="tab-content">
            <h3>Your Orders</h3>
            
            {loading && <p className="loading-text">Loading orders...</p>}
            
            {error && <p className="error-text">{error}</p>}
            
            {!loading && !error && orders.length === 0 && (
              <p className="empty-text">You haven't placed any orders yet.</p>
            )}
            
            {!loading && !error && orders.length > 0 && (
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div>
                        <strong>Order #{order.order_number}</strong>
                        <p className="order-date">
                          {new Date(order.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <span 
                        className="order-status"
                        style={{ color: getStatusColor(order.status) }}
                      >
                        {getCustomerStatusText(order.status)}
                      </span>
                    </div>

                    {(() => {
                      const events = normalizedTrackingEvents(order);
                      const trackingRef = order.bob_tracking_reference || order.cj_tracking_number;
                      const trackingStatus = order.bob_tracking_status || order.cj_status;
                      const displayEvents = visibleTrackingEvents(order, events, trackingStatus);
                      const hasTracking = Boolean(trackingRef || trackingStatus || events.length);
                      const activeStep = trackingStepIndex(trackingStatus, order.status);
                      const steps = ['Created', 'Collected', 'In transit', 'Out for delivery', 'Delivered'];

                      return (
                        <div className={`delivery-tracking ${hasTracking ? 'has-tracking' : 'pending-tracking'}`}>
                          <div className="tracking-topline">
                            <div>
                              <strong>Delivery tracking</strong>
                              <p>{hasTracking ? trackingStatusText(trackingStatus) : 'Tracking will appear here once your shipment is booked.'}</p>
                            </div>
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
                      );
                    })()}
                    
                    <div className="order-items">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="order-item">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="order-item-image"
                            />
                          )}
                          <div className="order-item-details">
                            <div className="order-item-name">{item.name}</div>
                            {item.description && (
                              <div className="order-item-description">{item.description}</div>
                            )}
                            <div className="order-item-meta">
                              <span className="order-item-quantity">Qty: {item.quantity}</span>
                              <span className="order-item-unit-price">R{item.price.toFixed(2)} each</span>
                            </div>
                          </div>
                          <div className="order-item-total">
                            R{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="order-summary">
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>R{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping:</span>
                        <span>R{order.shipping.toFixed(2)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="summary-row discount">
                          <span>Discount:</span>
                          <span>-R{order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="summary-row total">
                        <strong>Total:</strong>
                        <strong>R{order.total.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserAccount;
