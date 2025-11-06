import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProductCuration() {
  const [searchQuery, setSearchQuery] = useState('baby');
  const [searchResults, setSearchResults] = useState([]);
  const [curatedProducts, setCuratedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'curated'
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchCuratedProducts();
  }, []);

  const fetchCuratedProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCuratedProducts(data.products || []);
    } catch (err) {
      console.error('Fetch curated products error:', err);
    }
  };

  const searchCJProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/cj-products/search?q=${encodeURIComponent(searchQuery)}&pageSize=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setSearchResults(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCurated = async (product) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cj_pid: product.pid,
          product_name: product.name,
          product_description: '',
          product_image: product.image,
          cj_cost_price: product.price,
          category: product.category,
        }),
      });

      if (res.ok) {
        alert('Product added to curated list!');
        fetchCuratedProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add product');
      }
    } catch (err) {
      alert('Error adding product: ' + err.message);
    }
  };

  const removeFromCurated = async (id) => {
    if (!confirm('Remove this product from your store?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchCuratedProducts();
      } else {
        alert('Failed to remove product');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (res.ok) {
        fetchCuratedProducts();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="product-curation-container">
      <div className="product-curation-tabs">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search CJ Products
        </button>
        <button
          className={`tab-btn ${activeTab === 'curated' ? 'active' : ''}`}
          onClick={() => setActiveTab('curated')}
        >
          ✅ Curated Products ({curatedProducts.length})
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for baby products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCJProducts()}
            />
            <button onClick={searchCJProducts} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <div className="product-grid">
            {searchResults.map((product) => {
              const isAlreadyCurated = curatedProducts.some(
                (cp) => cp.cj_pid === product.pid
              );

              return (
                <div key={product.pid} className="product-card">
                  <div className="product-card-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      <div className="product-card-placeholder">🍼</div>
                    )}
                  </div>
                  <div className="product-card-info">
                    <h4>{product.name}</h4>
                    <p className="product-card-price">
                      Cost: R {Number(product.price || 0).toFixed(2)}
                    </p>
                    <p className="product-card-suggested">
                      Suggested: R {(Number(product.price || 0) * 2).toFixed(2)}
                    </p>
                    {isAlreadyCurated ? (
                      <button className="btn-secondary" disabled>
                        ✓ Already Added
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => addToCurated(product)}
                      >
                        + Add to Store
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'curated' && (
        <div className="curated-section">
          <div className="curated-list">
            {curatedProducts.length === 0 ? (
              <p>No curated products yet. Search and add products from the CJ catalog!</p>
            ) : (
              <table className="curated-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Cost Price</th>
                    <th>Retail Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {curatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.product_image ? (
                          <img
                            src={product.product_image}
                            alt={product.product_name}
                            style={{ width: 50, height: 50, objectFit: 'cover' }}
                          />
                        ) : (
                          '🍼'
                        )}
                      </td>
                      <td>{product.product_name}</td>
                      <td>R {Number(product.cj_cost_price).toFixed(2)}</td>
                      <td>R {Number(product.custom_price || product.suggested_price).toFixed(2)}</td>
                      <td>
                        <span
                          className={`status-badge ${product.is_active ? 'status-active' : 'status-inactive'}`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-small btn-toggle"
                          onClick={() => toggleActive(product.id, product.is_active)}
                        >
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => removeFromCurated(product.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
