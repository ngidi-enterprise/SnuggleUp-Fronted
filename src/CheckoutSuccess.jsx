import React from 'react';

function CheckoutSuccess() {
  const goHome = () => {
    window.location.href = '/';
  };

  let orderId = 'N/A';
  let paymentId = 'N/A';
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    orderId = urlParams.get('m_payment_id') || 'N/A';
    paymentId = urlParams.get('pf_payment_id') || 'N/A';
    localStorage.removeItem('cart');
    localStorage.removeItem('checkoutData');
    localStorage.setItem('hasMadeFirstPurchase', 'true');
  } catch (e) {
    console.error('Checkout error:', e);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
        <h1 style={{ marginBottom: '10px' }}>Payment Successful!</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Thank you for your order! Your payment has been processed successfully.
        </p>
        
        <div style={{
          background: '#f9f9f9',
          padding: '20px',
          marginBottom: '30px',
          borderRadius: '6px',
          textAlign: 'left'
        }}>
          <h3 style={{ marginBottom: '15px' }}>Order Details</h3>
          <div style={{ marginBottom: '10px' }}>
            <strong>Order ID:</strong> {orderId}
          </div>
          {paymentId !== 'N/A' && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Payment ID:</strong> {paymentId}
            </div>
          )}
          <div>
            <strong>Date:</strong> {new Date().toLocaleString()}
          </div>
        </div>
        
        <div style={{
          background: '#f9f9f9',
          padding: '20px',
          marginBottom: '30px',
          borderRadius: '6px',
          textAlign: 'left'
        }}>
          <h3 style={{ marginBottom: '15px' }}>What happens next?</h3>
          <ul style={{ paddingLeft: '20px', color: '#666' }}>
            <li style={{ marginBottom: '8px' }}>📧 You'll receive an email confirmation shortly</li>
            <li style={{ marginBottom: '8px' }}>📦 Your order will be processed within 24 hours</li>
            <li>📞 We'll contact you if there are any issues</li>
          </ul>
        </div>
        
        <button
          onClick={goHome}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '14px 30px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#5568d3'}
          onMouseOut={(e) => e.target.style.background = '#667eea'}
        >
          Continue Shopping
        </button>
        
        <div style={{ marginTop: '30px', fontSize: '14px', color: '#999' }}>
          <p>Need help? Contact us at:</p>
          <p>📧 support@snuggleup.co.za | 📞 +27 (0)10 123 4567</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
