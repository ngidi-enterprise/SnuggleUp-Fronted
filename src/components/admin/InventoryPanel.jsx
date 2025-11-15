import React, { useState, useEffect } from 'react';
import { getCuratedInventory, syncInventory } from '../../lib/cjApi';
import { useAuth } from '../../context/AuthContext';

export default function InventoryPanel() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const { token } = useAuth();

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
  const data = await getCuratedInventory();
      console.log('🔎 Inventory snapshot response:', data);
      setInventory(Array.isArray(data.products) ? data.products : []);
  setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      const result = await syncInventory(token);
      setSyncResult(result);
      // Reload inventory after sync
      await loadInventory();
    } catch (err) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefresh = async () => {
    await loadInventory();
  };

  const toggleExpand = (productId) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { label: 'Out of Stock', color: '#e74c3c' };
    if (quantity < 10) return { label: 'Low Stock', color: '#f39c12' };
    return { label: 'In Stock', color: '#27ae60' };
  };

  const totalProducts = inventory.length;
  const outOfStock = inventory.filter(p => p.stock_quantity === 0).length;
  const lowStock = inventory.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length;
  const inStock = inventory.filter(p => p.stock_quantity >= 10).length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>📦 Inventory Management</h2>
          <p style={{ color: '#666', margin: 0 }}>
            Real-time CJ Dropshipping inventory sync
          </p>
          {lastUpdated && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#6c757d' }}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            disabled={loading || syncing}
            style={{
              padding: '12px 16px',
              background: loading ? '#95a5a6' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading || syncing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {loading ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '12px 24px',
              background: syncing ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {syncing ? '🔄 Syncing…' : '🔄 Sync Now'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{totalProducts}</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Total Products</div>
        </div>
        <div style={{ padding: '16px', background: '#d5f4e6', borderRadius: '8px', border: '1px solid #27ae60' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{inStock}</div>
          <div style={{ fontSize: '13px', color: '#27ae60', marginTop: '4px' }}>In Stock</div>
        </div>
        <div style={{ padding: '16px', background: '#fef5e7', borderRadius: '8px', border: '1px solid #f39c12' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>{lowStock}</div>
          <div style={{ fontSize: '13px', color: '#f39c12', marginTop: '4px' }}>Low Stock</div>
        </div>
        <div style={{ padding: '16px', background: '#fadbd8', borderRadius: '8px', border: '1px solid #e74c3c' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>{outOfStock}</div>
          <div style={{ fontSize: '13px', color: '#e74c3c', marginTop: '4px' }}>Out of Stock</div>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div style={{
          padding: '16px',
          background: syncResult.failures > 0 ? '#fef5e7' : '#d5f4e6',
          border: `1px solid ${syncResult.failures > 0 ? '#f39c12' : '#27ae60'}`,
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ✓ Sync completed: {syncResult.updated}/{syncResult.processed} products updated
          </div>
          {syncResult.failures > 0 && (
            <div style={{ fontSize: '13px', color: '#f39c12' }}>
              ⚠️ {syncResult.failures} products failed (check console for details)
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          background: '#fadbd8',
          border: '1px solid #e74c3c',
          borderRadius: '8px',
          color: '#e74c3c',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading inventory...
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>Product</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', fontSize: '13px' }}>CJ PID</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Stock</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Warehouses</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((product) => {
                const status = getStockStatus(product.stock_quantity);
                const isExpanded = expandedProducts.has(product.curatedProductId);
                return (
                  <React.Fragment key={product.curatedProductId}>
                    <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{product.productName}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {product.cj_pid}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                        {product.stock_quantity}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: status.color + '20',
                          color: status.color
                        }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleExpand(product.curatedProductId)}
                          style={{
                            padding: '6px 12px',
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {isExpanded ? '▼ Hide' : `▶ Show (${product.warehouses.length})`}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && product.warehouses.length > 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '0', background: '#f8f9fa' }}>
                          <div style={{ padding: '16px' }}>
                            <table style={{ width: '100%', fontSize: '13px' }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Warehouse</th>
                                  <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Location</th>
                                  <th style={{ textAlign: 'center', padding: '8px', color: '#666' }}>Total</th>
                                  <th style={{ textAlign: 'center', padding: '8px', color: '#666' }}>CJ Stock</th>
                                  <th style={{ textAlign: 'center', padding: '8px', color: '#666' }}>Factory Stock</th>
                                  <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Last Updated</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.warehouses.map((wh, idx) => (
                                  <tr key={idx} style={{ borderBottom: idx < product.warehouses.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                                    <td style={{ padding: '8px' }}>{wh.warehouseName}</td>
                                    <td style={{ padding: '8px' }}>{wh.countryCode}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{wh.totalInventory}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{wh.cjInventory}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>{wh.factoryInventory}</td>
                                    <td style={{ padding: '8px', fontSize: '12px', color: '#999' }}>
                                      {new Date(wh.updated_at).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {inventory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No inventory data available. Click "Sync Now" to fetch latest stock levels.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
