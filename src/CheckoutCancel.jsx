import React, { useEffect, useState } from 'react';
import './CheckoutCancel.css';

function CheckoutCancel() {
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // Get order details from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('m_payment_id') || localStorage.getItem('lastOrderId');
    
    if (orderId) {
      setOrderDetails({
        orderId,
        timestamp: new Date().toLocaleString()
      });
    }
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  const retryPayment = () => {
    // Redirect back to checkout
    window.location.href = '/?retry=true';
  };

  return (
    <div className="checkout-cancel">
      <div className="cancel-container">
        <div className="cancel-icon">❌</div>
        <h1>Payment Cancelled</h1>
        <p className="cancel-message">
          Your payment was cancelled or could not be processed.
        </p>
        
        {orderDetails && (
          <div className="order-details">
            <h3>Order Information</h3>
            <div className="detail-row">
              <span>Order ID:</span>
              <strong>{orderDetails.orderId}</strong>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <strong className="cancelled">Cancelled</strong>
            </div>
            <div className="detail-row">
              <span>Date:</span>
              <strong>{orderDetails.timestamp}</strong>
            </div>
          </div>
        )}
        
        <div className="cancel-reasons">
          <h3>Common reasons for payment cancellation:</h3>
          <ul>
            <li>❌ Payment was manually cancelled</li>
            <li>💳 Insufficient funds</li>
            <li>🔒 Security verification failed</li>
            <li>⏰ Payment session expired</li>
            <li>🌐 Network connection issues</li>
          </ul>
        </div>
        
        <div className="action-buttons">
          <button className="btn-primary" onClick={retryPayment}>
            Try Again
          </button>
          <button className="btn-secondary" onClick={goHome}>
            Continue Shopping
          </button>
        </div>
        
        <div className="support-info">
          <p>Having trouble with payment? We're here to help!</p>
          <p>📧 support@snuggleup.co.za | 📞 +27 (0)10 123 4567</p>
          <p>💬 Live chat available 9AM - 5PM weekdays</p>
        </div>
        
        <div className="reassurance">
          <p>✨ Your cart items are still saved and ready when you're ready to try again!</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutCancel;