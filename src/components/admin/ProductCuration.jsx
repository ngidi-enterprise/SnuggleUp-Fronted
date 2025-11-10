import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ProductCuration() {
  const [searchQuery, setSearchQuery] = useState('baby');
  const [searchResults, setSearchResults] = useState([]);
  const [curatedProducts, setCuratedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'curated'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    product_name: '',
    product_description: '',
    custom_price: '',
    category: '',
    stock_quantity: 0
  });
  const [competitorPrices, setCompetitorPrices] = useState({
    competitor1: '',
    competitor2: ''
  });
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [targetMargin, setTargetMargin] = useState(100); // Default 100% margin (2x markup)
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
    setCurrentPage(1); // Reset to page 1 on new search
    
    console.log('CJ Search Debug:', {
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      apiBase: API_BASE,
      hasToken: !!token,
      searchQuery
    });
    
    if (!token) {
      setError('No authentication token. Please refresh the page and log in again.');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/cj-products/search?q=${encodeURIComponent(searchQuery)}&pageSize=200`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('CJ Search response:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('CJ Search error response:', errorText);
        throw new Error(`Search failed: ${res.status}`);
      }

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
      // Validate price before adding
      const costPrice = Number(product.price) || 0;
      
      if (costPrice <= 0) {
        alert('⚠️ Cannot add product: Invalid or missing price from supplier. Please contact support.');
        return;
      }

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
          cj_cost_price: costPrice,
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

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      product_name: product.product_name,
      product_description: product.product_description || '',
      custom_price: product.custom_price || product.suggested_price || '',
      category: product.category || '',
      stock_quantity: product.stock_quantity || 0
    });
    setCompetitorPrices({
      competitor1: '',
      competitor2: ''
    });
    setSuggestedPrice(null);
    setTargetMargin(100);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditForm({
      product_name: '',
      product_description: '',
      custom_price: '',
      category: '',
      stock_quantity: 0
    });
    setCompetitorPrices({
      competitor1: '',
      competitor2: ''
    });
    setSuggestedPrice(null);
    setTargetMargin(100);
  };

  const saveProductChanges = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        alert('Product updated successfully!');
        fetchCuratedProducts();
        closeEditModal();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update product');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const calculateSmartPrice = () => {
    const costPrice = Number(editingProduct.cj_cost_price) * 2; // Double supplier price for cost
    const comp1 = Number(competitorPrices.competitor1) || 0;
    const comp2 = Number(competitorPrices.competitor2) || 0;
    const margin = targetMargin / 100; // Convert percentage to decimal

    let suggested = 0;

    if (comp1 > 0 || comp2 > 0) {
      // If competitor prices provided, use smart algorithm
      const validPrices = [comp1, comp2].filter(p => p > 0);
      const avgCompetitorPrice = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
      const lowestCompetitorPrice = Math.min(...validPrices);

      // Strategy: Undercut lowest competitor slightly while maintaining minimum margin
      const minPrice = costPrice * (1 + margin); // Minimum price based on target margin
      const competitivePrice = lowestCompetitorPrice * 0.95; // 5% below lowest competitor

      // Use the higher of: competitive price OR minimum margin price
      suggested = Math.max(competitivePrice, minPrice);

      // If suggested price is too close to average, use average
      if (Math.abs(suggested - avgCompetitorPrice) < 10) {
        suggested = avgCompetitorPrice * 0.97; // Slightly below average
      }
    } else {
      // No competitor prices: use simple margin-based pricing
      suggested = costPrice * (1 + margin);
    }

    setSuggestedPrice(Math.round(suggested * 100) / 100); // Round to 2 decimals
  };

  const applySuggestedPrice = () => {
    if (suggestedPrice) {
      setEditForm({...editForm, custom_price: suggestedPrice.toFixed(2)});
    }
  };

  return (
    <div className="product-curation-container">
      <div className="product-curation-tabs">
        <button
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Supplier Products
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
            {searchResults
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((product) => {
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

          {/* Pagination Controls */}
          {searchResults.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '32px',
              padding: '20px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <button
                className="btn-small"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ background: '#3498db', color: 'white' }}
              >
                First
              </button>
              <button
                className="btn-small"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ background: '#3498db', color: 'white' }}
              >
                Previous
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#555' }}>Page</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(searchResults.length / itemsPerPage)}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= Math.ceil(searchResults.length / itemsPerPage)) {
                      setCurrentPage(page);
                    }
                  }}
                  style={{
                    width: '60px',
                    padding: '6px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '14px'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#555' }}>
                  of {Math.ceil(searchResults.length / itemsPerPage)}
                </span>
              </div>

              <button
                className="btn-small"
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(searchResults.length / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(searchResults.length / itemsPerPage)}
                style={{ background: '#3498db', color: 'white' }}
              >
                Next
              </button>
              <button
                className="btn-small"
                onClick={() => setCurrentPage(Math.ceil(searchResults.length / itemsPerPage))}
                disabled={currentPage >= Math.ceil(searchResults.length / itemsPerPage)}
                style={{ background: '#3498db', color: 'white' }}
              >
                Last
              </button>

              <span style={{ 
                marginLeft: '12px', 
                fontSize: '13px', 
                color: '#7f8c8d',
                borderLeft: '2px solid #e1e8ed',
                paddingLeft: '12px'
              }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, searchResults.length)} of {searchResults.length} products
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'curated' && (
        <div className="curated-section">
          <div className="curated-list">
            {curatedProducts.length === 0 ? (
              <p>No curated products yet. Search and add products from the supplier catalog!</p>
            ) : (
              <table className="curated-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Cost Price</th>
                    <th>Retail Price</th>
                    <th>Stock</th>
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
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: product.stock_quantity === 0 ? '#fee' : product.stock_quantity < 10 ? '#ffeaa7' : '#d5f4e6',
                          color: product.stock_quantity === 0 ? '#c0392b' : product.stock_quantity < 10 ? '#d68910' : '#27ae60'
                        }}>
                          {product.stock_quantity === 0 ? '⚠️ Sold Out' : product.stock_quantity < 10 ? `⚡ ${product.stock_quantity} left` : `✅ ${product.stock_quantity}`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${product.is_active ? 'status-active' : 'status-inactive'}`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-small btn-edit"
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>
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

      {/* Product Edit Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content product-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Product - SEO & Details</h2>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="product-edit-preview">
                <img 
                  src={editingProduct.product_image} 
                  alt={editingProduct.product_name}
                  style={{ width: '100%', maxWidth: 300, height: 'auto', borderRadius: 8 }}
                />
              </div>

              <div className="form-group">
                <label>Product Title (SEO-friendly)</label>
                <input
                  type="text"
                  value={editForm.product_name}
                  onChange={(e) => setEditForm({...editForm, product_name: e.target.value})}
                  placeholder="E.g., Baby Cotton Romper - Soft & Breathable"
                />
                <small>Make it descriptive for search engines (Google, etc.)</small>
              </div>

              <div className="form-group">
                <label>Product Description (SEO-friendly)</label>
                <textarea
                  rows="6"
                  value={editForm.product_description}
                  onChange={(e) => setEditForm({...editForm, product_description: e.target.value})}
                  placeholder="Detailed description with keywords. E.g., 'Soft cotton baby romper perfect for newborns. Breathable fabric keeps baby comfortable all day...'"
                />
                <small>Include key features, benefits, and natural keywords for SEO</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    placeholder="E.g., clothing, toys, feeding"
                  />
                </div>

                <div className="form-group">
                  <label>Retail Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.custom_price}
                    onChange={(e) => setEditForm({...editForm, custom_price: e.target.value})}
                    placeholder="E.g., 299.99"
                  />
                  <small>Cost: R{(Number(editingProduct.cj_cost_price) * 2).toFixed(2)} (Supplier Price × 2)</small>
                </div>
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editForm.stock_quantity}
                  onChange={(e) => setEditForm({...editForm, stock_quantity: parseInt(e.target.value) || 0})}
                  placeholder="E.g., 50"
                />
                <small>
                  {editForm.stock_quantity === 0 ? (
                    <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                      ⚠️ Sold Out - Customers cannot buy this product
                    </span>
                  ) : editForm.stock_quantity < 10 ? (
                    <span style={{ color: '#f39c12' }}>
                      ⚡ Low stock - Consider restocking soon
                    </span>
                  ) : (
                    <span style={{ color: '#27ae60' }}>
                      ✅ In stock
                    </span>
                  )}
                </small>
              </div>

              {/* Smart Pricing Assistant */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '2px dashed #3498db'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#2c3e50' }}>
                  💡 Smart Pricing Assistant (Optional)
                </h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#555' }}>
                    Target Profit Margin
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ 
                      minWidth: '60px', 
                      padding: '6px 12px', 
                      background: 'white', 
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {targetMargin}%
                    </span>
                  </div>
                  <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
                    {targetMargin < 80 ? '⚠️ Low margin' : targetMargin > 150 ? '📈 Premium pricing' : '✅ Balanced'}
                  </small>
                </div>

                <div className="form-row" style={{ gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Competitor 1 Price (R)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={competitorPrices.competitor1}
                      onChange={(e) => setCompetitorPrices({...competitorPrices, competitor1: e.target.value})}
                      placeholder="E.g., 149.99"
                    />
                    <small>Optional: Check Takealot, Babies R Us, etc.</small>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Competitor 2 Price (R)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={competitorPrices.competitor2}
                      onChange={(e) => setCompetitorPrices({...competitorPrices, competitor2: e.target.value})}
                      placeholder="E.g., 139.99"
                    />
                    <small>Optional: Another competitor price</small>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={calculateSmartPrice}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#2980b9'}
                  onMouseOut={(e) => e.target.style.background = '#3498db'}
                >
                  🧠 Calculate Smart Price
                </button>

                {suggestedPrice !== null && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #27ae60'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                          Suggested Price
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                          R {suggestedPrice.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                          Margin: {(((suggestedPrice - (Number(editingProduct.cj_cost_price) * 2)) / (Number(editingProduct.cj_cost_price) * 2)) * 100).toFixed(1)}%
                          {competitorPrices.competitor1 && ` | vs Comp1: ${((suggestedPrice / Number(competitorPrices.competitor1) - 1) * 100).toFixed(1)}%`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={applySuggestedPrice}
                        style={{
                          padding: '10px 20px',
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Apply Price
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={saveProductChanges}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
