import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// USD to ZAR conversion rate
const USD_TO_ZAR = 18.0;

export default function PricingManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditPrice(product.custom_price || product.suggested_price);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPrice('');
  };

  const savePrice = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ custom_price: Number(editPrice) }),
      });

      if (res.ok) {
        fetchProducts();
        setEditingId(null);
        setEditPrice('');
      } else {
        alert('Failed to update price');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const calculateMargin = (cost, retail) => {
    const margin = ((retail - cost) / retail) * 100;
    return margin.toFixed(1);
  };

  const calculateMarkup = (cost, retail) => {
    const markup = ((retail - cost) / cost) * 100;
    return markup.toFixed(1);
  };

  const recalculateSuggestedPrices = async () => {
    if (!confirm('Recalculate suggested prices for ALL products using the current formula (USD × 18.0 × 1.4)? This will update the database.')) {
      return;
    }

    setRecalculating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/recalculate-suggested-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(`✓ Successfully recalculated ${data.updated} product prices!`);
        fetchProducts(); // Refresh the list
      } else {
        console.warn('Recalculate suggested prices failed', { status: res.status, data });
        alert('Failed to recalculate prices: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const syncRetailToSuggested = async () => {
    if (!confirm('Sync ALL retail prices to match corrected suggested prices? This will:\n\n1. Recalculate suggested prices (USD × 18 × 1.4)\n2. Update all retail prices to match\n\nThis cannot be undone. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/sync-retail-to-suggested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(`✓ Successfully synced ${data.updated} product retail prices to suggested prices!`);
        fetchProducts(); // Refresh the list
      } else {
        console.warn('Sync retail to suggested failed', { status: res.status, data });
        alert('Failed to sync prices: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading products...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="pricing-manager-container">
      <div className="pricing-header">
        <p>Manage retail prices for your products. Adjust prices based on your target margins.</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className="btn-primary" 
            onClick={recalculateSuggestedPrices}
            disabled={recalculating}
          >
            {recalculating ? 'Recalculating...' : '🔄 Recalculate All Suggested Prices'}
          </button>
          <button 
            className="btn-primary" 
            onClick={syncRetailToSuggested}
            disabled={syncing}
            style={{ background: syncing ? '#95a5a6' : '#27ae60' }}
          >
            {syncing ? 'Syncing...' : '🔗 Sync All Retail → Suggested'}
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <p>No products to manage. Add products from the Product Curation page first!</p>
      ) : (
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Cost Price (USD)</th>
              <th>Cost Price (ZAR)</th>
              <th>Suggested Price (1.4x)</th>
              <th>Current Retail Price</th>
              <th>Profit value</th>
              <th>Margin %</th>
              <th>Markup %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const costPriceUSD = Number(product.cj_cost_price);
              const costPriceZAR = costPriceUSD * USD_TO_ZAR;
              const storedSuggested = Number(product.suggested_price);
              // Correct formula should be costPriceZAR * 1.4. Detect old incorrect stored values (USD*1.5) and override.
              const calculatedSuggested = Math.round(costPriceZAR * 1.4 * 100) / 100;
              const usingFallback = storedSuggested < costPriceZAR; // Indicates it's still the old USD*1.5 value
              const suggestedPrice = usingFallback ? calculatedSuggested : storedSuggested;
              const retailPrice = Number(product.custom_price || suggestedPrice);
              const isEditing = editingId === product.id;

              return (
                <tr key={product.id} className={!product.is_active ? 'row-inactive' : ''}>
                  <td>
                    <div className="product-cell">
                      {product.product_image && (
                        <img
                          src={product.product_image}
                          alt={product.product_name}
                          style={{ width: 40, height: 40, objectFit: 'cover', marginRight: 10 }}
                        />
                      )}
                      <div>
                        <strong>{product.product_name}</strong>
                        {!product.is_active && (
                          <span className="status-badge status-inactive">Inactive</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>${costPriceUSD.toFixed(2)}</td>
                  <td>R {costPriceZAR.toFixed(2)}</td>
                  <td>
                    R {suggestedPrice.toFixed(2)}
                    {usingFallback && (
                      <span style={{ marginLeft: 6, fontSize: '11px', color: '#b36b00' }} title="Stored value was outdated (USD-based). Displaying recalculated ZAR-based suggested price.">
                        (recalc)
                      </span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="price-input"
                        autoFocus
                      />
                    ) : (
                      <strong>R {retailPrice.toFixed(2)}</strong>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const effectiveRetail = isEditing ? Number(editPrice) : retailPrice;
                      const profit = effectiveRetail - costPriceZAR;
                      const color = profit >= 0 ? '#27ae60' : '#c0392b';
                      return <span style={{ color }}>R {profit.toFixed(2)}</span>;
                    })()}
                  </td>
                  <td>
                    <span
                      className={`margin-badge ${
                        calculateMargin(costPriceZAR, isEditing ? Number(editPrice) : retailPrice) >= 50
                          ? 'margin-good'
                          : 'margin-low'
                      }`}
                    >
                      {calculateMargin(costPriceZAR, isEditing ? Number(editPrice) : retailPrice)}%
                    </span>
                  </td>
                  <td>{calculateMarkup(costPriceZAR, isEditing ? Number(editPrice) : retailPrice)}%</td>
                  <td>
                    {isEditing ? (
                      <div className="action-buttons">
                        <button className="btn-small btn-primary" onClick={() => savePrice(product.id)}>
                          Save
                        </button>
                        <button className="btn-small btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button className="btn-small btn-primary" onClick={() => startEdit(product)}>
                        Edit Price
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="pricing-help">
        <h3>💡 Pricing Tips</h3>
        <ul>
          <li>
            <strong>Margin %:</strong> Profit as a percentage of retail price. Higher is better.
          </li>
          <li>
            <strong>Markup %:</strong> How much you're adding to the cost. 100% = 2x cost.
          </li>
          <li>
            <strong>Good margin:</strong> 50% or higher (green badge).
          </li>
          <li>
            <strong>Suggested price:</strong> Automatically calculated as 1.4x the ZAR cost price (40% markup).
          </li>
          <li>
            <strong>Profit value:</strong> Retail − Cost (ZAR). Green = profit, red = loss.
          </li>
        </ul>
      </div>
    </div>
  );
}
