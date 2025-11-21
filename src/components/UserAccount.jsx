import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserAccount.css';

function UserAccount({ onClose }) {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://snuggleup-backend.onrender.com/api/orders/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
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

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="user-account-modal">
      <div className="user-account-content">
        <button className="close-account" onClick={onClose}>✕</button>
        <button className="back-to-shop-btn" onClick={onClose} style={{position:'absolute',left:16,top:16,background:'#ff6600',color:'#fff',border:'none',borderRadius:'25px',padding:'8px 20px',fontWeight:'600',fontSize:'14px',cursor:'pointer',zIndex:11}}>← Back to Shopping</button>
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
          <button 
            className={activeTab === 'orders' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('orders')}
          >
            Order History
          </button>
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
                {orders.map(order => {
                  // Parse items if they're a JSON string
                  const items = typeof order.items === 'string' 
                    ? JSON.parse(order.items) 
                    : Array.isArray(order.items) 
                      ? order.items 
                      : [];
                  
                  return (
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
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="order-items">
                      {items.map((item, idx) => (
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
                )})}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserAccount;
