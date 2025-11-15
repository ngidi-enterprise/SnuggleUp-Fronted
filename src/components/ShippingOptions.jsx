import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

export default function ShippingOptions({ cart, onShippingSelect, selectedShipping }) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');
  const [shippingCountry, setShippingCountry] = useState('ZA');
  const [postalCode, setPostalCode] = useState('');

  const fetchQuotes = async () => {
    if (!cart || cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Map cart items to format expected by backend
      const items = cart.map(item => ({
        cj_vid: item.cj_vid,
        quantity: item.quantity
      }));

      const response = await fetch(`${API_BASE}/api/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shippingCountry,
          postalCode: postalCode || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get shipping quotes');
      }

      const data = await response.json();
      setQuotes(data.quotes || []);
      
      // Auto-select cheapest if none selected
      if (!selectedShipping && data.quotes.length > 0) {
        const cheapest = data.quotes.reduce((min, q) => 
          q.priceZAR < min.priceZAR ? q : min
        , data.quotes[0]);
        onShippingSelect?.(cheapest);
      }
    } catch (err) {
      setError(err.message || 'Failed to load shipping options');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [cart, shippingCountry]);

  if (!cart || cart.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>
        📦 Shipping Method
      </h3>

      {/* Country and postal code inputs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Shipping Country
          </label>
          <select
            value={shippingCountry}
            onChange={(e) => setShippingCountry(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option value="ZA">🇿🇦 South Africa</option>
            <option value="US">🇺🇸 United States</option>
            <option value="GB">🇬🇧 United Kingdom</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="CA">🇨🇦 Canada</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
            Postal Code (Optional)
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="e.g., 2196"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          color: '#666'
        }}>
          Loading shipping options...
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          background: '#fadbd8',
          border: '1px solid #e74c3c',
          borderRadius: '8px',
          color: '#e74c3c',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {!loading && quotes.length === 0 && !error && (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          color: '#666'
        }}>
          No shipping options available
        </div>
      )}

      {!loading && quotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {quotes.map((quote, idx) => (
            <div
              key={idx}
              onClick={() => onShippingSelect?.(quote)}
              style={{
                padding: '16px',
                border: selectedShipping?.logisticName === quote.logisticName 
                  ? '2px solid #3498db' 
                  : '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedShipping?.logisticName === quote.logisticName 
                  ? '#e3f2fd' 
                  : 'white',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                if (selectedShipping?.logisticName !== quote.logisticName) {
                  e.currentTarget.style.borderColor = '#3498db';
                  e.currentTarget.style.background = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedShipping?.logisticName !== quote.logisticName) {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {selectedShipping?.logisticName === quote.logisticName && '✓ '}
                  {quote.logisticName}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {quote.deliveryDay ? `Delivery: ${quote.deliveryDay} days` : 'Standard delivery'}
                  {quote.tracking && ' • With tracking'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                  R {quote.priceZAR.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  ${quote.priceUSD.toFixed(2)} USD
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && quotes.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#666'
        }}>
          ℹ️ All items ship from China. Prices include shipping to your door.
        </div>
      )}
    </div>
  );
}
