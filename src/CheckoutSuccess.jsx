import React from 'react';

function CheckoutSuccess() {
  const goHome = () => {
    window.location.href = '/';
  };

  // Read params from both search (?x=) and hash (/#/route?x=)
  const getParam = (name) => {
    try {
      // 1) Standard query string
      const searchParams = new URLSearchParams(window.location.search || '');
      const fromSearch = searchParams.get(name);
      if (fromSearch) return decodeURIComponent(fromSearch.replace(/\+/g, ' '));

      // 2) Hash-based query (for hash routing)
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(qIndex + 1));
        const fromHash = hashParams.get(name);
        if (fromHash) return decodeURIComponent(fromHash.replace(/\+/g, ' '));
      }

      // 3) Fallback: loose match inside hash
      const match = hash.match(new RegExp(`[?#&]${name}=([^&]+)`));
      if (match && match[1]) return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (e) {
      // no-op
    }
    return null;
  };

  const orderId = getParam('m_payment_id') || 'N/A';
  const paymentId = getParam('pf_payment_id') || 'N/A';

  // Debug: Log URL and params for troubleshooting
  if (typeof window !== 'undefined') {
    console.log('🔍 CheckoutSuccess Debug:');
    console.log('  URL:', window.location.href);
    console.log('  Search:', window.location.search);
    console.log('  Hash:', window.location.hash);
    console.log('  Order ID:', orderId);
    console.log('  Payment ID:', paymentId);
  }

  try {
    localStorage.removeItem('cart');
    localStorage.removeItem('checkoutData');
    localStorage.setItem('hasMadeFirstPurchase', 'true');
  } catch (e) {
    console.error('Checkout storage cleanup error:', e);
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
            <li>📧 We'll email you if there are any issues</li>
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
          <p>📧 support@snuggleup.co.za</p>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
