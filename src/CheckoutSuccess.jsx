import React, { useEffect, useState } from 'react';
import './CheckoutSuccess.css';

function CheckoutSuccess() {
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // Get order details from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('m_payment_id') || localStorage.getItem('lastOrderId');
    const paymentId = urlParams.get('pf_payment_id');
    
    if (orderId) {
      setOrderDetails({
        orderId,
        paymentId,
        timestamp: new Date().toLocaleString()
      });
      
      // Clear cart from localStorage
      localStorage.removeItem('cart');
      localStorage.removeItem('lastOrderId');
    }
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="checkout-success">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Payment Successful!</h1>
        <p className="success-message">
          Thank you for your order! Your payment has been processed successfully.
        </p>
        
        {orderDetails && (
          <div className="order-details">
            <h3>Order Details</h3>
            <div className="detail-row">
              <span>Order ID:</span>
              <strong>{orderDetails.orderId}</strong>
            </div>
            {orderDetails.paymentId && (
              <div className="detail-row">
                <span>Payment ID:</span>
                <strong>{orderDetails.paymentId}</strong>
              </div>
            )}
            <div className="detail-row">
              <span>Date:</span>
              <strong>{orderDetails.timestamp}</strong>
            </div>
          </div>
        )}
        
        <div className="next-steps">
          <h3>What happens next?</h3>
          <ul>
            <li>📧 You'll receive an email confirmation shortly</li>
            <li>📦 Your order will be processed within 24 hours</li>
            <li>🚚 Free delivery for orders over R800</li>
            <li>📞 We'll contact you if there are any issues</li>
          </ul>
        </div>
        
        <div className="action-buttons">
          <button className="btn-primary" onClick={goHome}>
            Continue Shopping
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            Print Receipt
          </button>
        </div>
        
        <div className="support-info">
          <p>Need help? Contact us at:</p>
          <p>📧 support@snuggleup.co.za | 📞 +27 (0)10 123 4567</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;