import React, { useEffect, useState } from 'react';
import './CheckoutSuccess.css';
import { trackPurchase } from './lib/analytics';

function CheckoutSuccess() {
  const [orderDetails, setOrderDetails] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    // Get order details from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('m_payment_id') || localStorage.getItem('lastOrderId');
    const paymentId = urlParams.get('pf_payment_id');
    
    // Get checkout data (insurance, shipping, etc)
    const savedCheckoutData = localStorage.getItem('checkoutData');
    if (savedCheckoutData) {
      try {
        setCheckoutData(JSON.parse(savedCheckoutData));
      } catch (err) {
        console.error('Failed to parse checkout data:', err);
      }
    }
    
    if (orderId) {
      setOrderDetails({
        orderId,
        paymentId,
        timestamp: new Date().toLocaleString()
      });
      
      // Mark that user has made their first purchase (stop showing promo popup)
      localStorage.setItem('hasMadeFirstPurchase', 'true');
      
      // Get cart items from localStorage before clearing
      const savedCart = localStorage.getItem('cart');
      const savedCheckout = localStorage.getItem('checkoutData');
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          let shipping = 0;
          let insuranceCost = 0;
          if (savedCheckout) {
            try {
              const cd = JSON.parse(savedCheckout);
              shipping = cd.shipping ?? 0;
              insuranceCost = cd.insuranceSelected ? (cd.insuranceData?.costZAR || 0) : 0;
            } catch {}
          }
          const total = subtotal + shipping + insuranceCost;
          
          // Track purchase conversion
          trackPurchase(orderId, cartItems, total, shipping);
        } catch (err) {
          console.error('Failed to track purchase:', err);
        }
      }
      
      // Clear cart from localStorage
      localStorage.removeItem('cart');
      localStorage.removeItem('lastOrderId');
      localStorage.removeItem('checkoutData');
      
      // Clear cart from backend (for authenticated users)
      const clearBackendCart = async () => {
        const token = localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('supabase.auth.token');
        if (token) {
          try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.snuggleup.co.za';
            await fetch(`${API_BASE}/api/cart`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
          } catch (err) {
            console.error('Failed to clear backend cart:', err);
          }
        }
      };
      clearBackendCart();
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
            {checkoutData?.shippingCountry && checkoutData.shippingCountry !== 'ZA' && (
              <li>🌍 International delivery to {checkoutData.shippingCountry}</li>
            )}
            {checkoutData?.insuranceSelected && (
              <li>🛡️ Your order is insured up to R{checkoutData.insuranceData?.coverage?.toFixed(2) || '0.00'}</li>
            )}
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
