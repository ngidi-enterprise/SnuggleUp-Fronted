import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PricingManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [usdToZar, setUsdToZar] = useState(18.0);
  const [priceMarkup, setPriceMarkup] = useState(1.4);
  const [savingConfig, setSavingConfig] = useState(false);
  const [applyRecalc, setApplyRecalc] = useState(true);
  const [applySyncRetail, setApplySyncRetail] = useState(false);
  const [syncingCJPrices, setSyncingCJPrices] = useState(false);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchPricingConfig();
    fetchProducts();
  }, []);

  const fetchPricingConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/pricing-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsdToZar(Number(data.usdToZar));
        setPriceMarkup(Number(data.priceMarkup));
      }
    } catch (e) {
      console.warn('Failed to load pricing config', e);
    } finally {
      setConfigLoading(false);
    }
  };

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
    if (!confirm(`Recalculate suggested prices for ALL products using the current formula (USD × ${usdToZar} × ${priceMarkup})? This will update the database.`)) {
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
    if (!confirm(`Sync ALL retail prices to match corrected suggested prices? This will:\n\n1. Recalculate suggested prices (USD × ${usdToZar} × ${priceMarkup})\n2. Update all retail prices to match\n\nThis cannot be undone. Continue?`)) {
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

  const saveGlobalPricing = async (mode) => {
    // mode: 'save' | 'save_recalc' | 'save_sync'
    setSavingConfig(true);
    try {
      const body = {
        priceMarkup: priceMarkup,
        usdToZar: usdToZar,
        recalcSuggested: mode !== 'save' && applyRecalc,
        syncRetail: mode === 'save_sync' && (applySyncRetail || applyRecalc)
      };
      const res = await fetch(`${API_BASE}/api/admin/pricing-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Failed to update pricing config: ' + (data.error || `HTTP ${res.status}`));
        return;
      }
      alert(`✓ Updated pricing config. Markup=${data.priceMarkup}. ${data.recalcSuggested ? `Recalculated ${data.recalcCount} products. ` : ''}${data.syncRetail ? `Synced ${data.syncCount}.` : ''}`);
      await fetchPricingConfig();
      if (data.recalcSuggested || data.syncRetail) {
        await fetchProducts();
      }
    } catch (e) {
      alert('Error updating pricing config: ' + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const syncCJPrices = async () => {
    if (!confirm(`Sync product prices with current supplier (CJ) prices? This will:\n\n1. Fetch current USD cost from CJ for up to 50 products\n2. Update stored cost, suggested price, and retail price\n3. Reflect any supplier price changes in your store\n\nThis ensures your prices are current but may change customer-facing prices. Continue?`)) {
      return;
    }

    setSyncingCJPrices(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/sync-cj-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ limit: 50 })
      });

      const data = await res.json();
      
      if (res.ok) {
        const msg = data.priceChanges && data.priceChanges.length > 0
          ? `✓ Synced ${data.synced} products!\n\n${data.priceChanges.length} significant price changes:\n${data.priceChanges.map(c => `• ${c.name}: $${c.oldCostUSD} → $${c.newCostUSD} (${c.increased ? '↑' : '↓'}${c.percentChange}%)`).slice(0, 10).join('\n')}`
          : `✓ Synced ${data.synced} products. No significant price changes.`;
        alert(msg);
        fetchProducts(); // Refresh the list
      } else {
        alert('Failed to sync CJ prices: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSyncingCJPrices(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading products...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="pricing-manager-container">
      <div className="pricing-header">
        <p>Manage global profit markup and individual product retail prices.</p>
        <div className="global-pricing-config" style={{ marginTop: '12px', padding: '12px', border: '1px solid #ddd', borderRadius: 8, background: '#f9fafb' }}>
          <h3 style={{ marginTop: 0 }}>Global Pricing Settings</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
              Current USD→ZAR Rate
              <input type="number" step="0.01" value={usdToZar} onChange={(e) => setUsdToZar(Number(e.target.value))} style={{ width: 120 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
              Global Markup (×)
              <input type="number" step="0.05" min="0.3" max="10" value={priceMarkup} onChange={(e) => setPriceMarkup(Number(e.target.value))} style={{ width: 120 }} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={applyRecalc} onChange={(e) => setApplyRecalc(e.target.checked)} /> Recalculate suggested
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={applySyncRetail} onChange={(e) => setApplySyncRetail(e.target.checked)} /> Sync retail to suggested
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-small btn-primary" disabled={savingConfig || configLoading} onClick={() => saveGlobalPricing('save')}>
                {savingConfig ? 'Saving...' : '💾 Save Only'}
              </button>
              <button className="btn-small btn-primary" disabled={savingConfig || configLoading} onClick={() => saveGlobalPricing('save_recalc')}>
                {savingConfig ? 'Saving...' : '💾 Save + Recalc'}
              </button>
              <button className="btn-small btn-primary" style={{ background: '#27ae60' }} disabled={savingConfig || configLoading} onClick={() => saveGlobalPricing('save_sync')}>
                {savingConfig ? 'Saving...' : '💾 Save + Recalc + Sync'}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, marginTop: 8, color: '#555' }}>Changing the global markup adjusts all future suggested prices. Enable recalculation to immediately update stored suggested prices. Sync applies the new suggested price to current retail prices (custom_price).</p>
        </div>

        {/* Supplier Price Sync */}
        <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #e8f5e9', borderRadius: 8, background: '#f1f8e9' }}>
          <h3 style={{ marginTop: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔄 Supplier Price Sync
          </h3>
          <p style={{ fontSize: 13, margin: '8px 0', color: '#555' }}>
            Update product costs from supplier (CJ Dropshipping) to reflect current prices. This ensures your margins stay accurate when supplier prices change.
          </p>
          <button 
            className="btn-small btn-primary" 
            style={{ background: '#2196f3' }}
            disabled={syncingCJPrices} 
            onClick={syncCJPrices}
          >
            {syncingCJPrices ? '⏳ Syncing...' : '🔄 Sync CJ Prices (50 products)'}
          </button>
          <p style={{ fontSize: 11, marginTop: 6, color: '#666', fontStyle: 'italic' }}>
            Last sync: Manual only (scheduled daily at 2am) • Syncs up to 50 products per run
          </p>
        </div>

        {/* Legacy quick actions removed; use Global Pricing Settings save options above */}
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
              <th>Suggested Price ({priceMarkup.toFixed(2)}x)</th>
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
              const costPriceZAR = costPriceUSD * usdToZar;
              const storedSuggested = Number(product.suggested_price);
              // Correct formula should be costPriceZAR * priceMarkup.
              const calculatedSuggested = Math.round(costPriceZAR * priceMarkup * 100) / 100;
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
