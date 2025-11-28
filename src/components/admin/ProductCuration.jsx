import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

// Fallback pricing (will be replaced by /api/admin/pricing-config)
const FALLBACK_USD_TO_ZAR = 18.0;
const FALLBACK_MARKUP = 1.4; // Match pricing tab logic

export default function ProductCuration() {
  // Default to empty so it doesn't auto-fill after refresh
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [curatedProducts, setCuratedProducts] = useState([]);
  const [curatedSearchQuery, setCuratedSearchQuery] = useState(''); // Search within curated products
  const [filteredCuratedProducts, setFilteredCuratedProducts] = useState([]); // Filtered curated products
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'curated'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    product_name: '',
    original_cj_title: '',
    seo_title: '',
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
  const [addingProducts, setAddingProducts] = useState(new Set()); // Track which products are being added
  const [quickLinkPid, setQuickLinkPid] = useState(''); // For manual PID entry
  const [linking, setLinking] = useState(false); // Loading state for linking operation
  const [syncing, setSyncing] = useState(false); // Loading state for bulk sync
  
  // AI SEO Title Generator states
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [seoSuggestions, setSeoSuggestions] = useState([]);
  const [seoReasoning, setSeoReasoning] = useState('');
  const [generatingSEO, setGeneratingSEO] = useState(false);
  
  const { token } = useAuth();

  // Dynamic pricing config state
  const [pricing, setPricing] = useState({ usdToZar: FALLBACK_USD_TO_ZAR, markup: FALLBACK_MARKUP, loaded: false });

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchCuratedProducts();
  }, []);

  // Fetch pricing config so suggested price matches pricing tab
  useEffect(() => {
    const fetchPricingConfig = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/pricing-config`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
            setPricing({
              usdToZar: Number(data.usdToZar) || FALLBACK_USD_TO_ZAR,
              markup: Number(data.priceMarkup) || FALLBACK_MARKUP,
              loaded: true
            });
        } else {
          setPricing(p => ({ ...p, loaded: true }));
        }
      } catch {
        setPricing(p => ({ ...p, loaded: true }));
      }
    };
    fetchPricingConfig();
  }, [token, API_BASE]);

  // Helper to compute suggested retail from supplier USD
  const computeSuggestedRetail = (costUSD) => {
    const usd = parseFloat(String(costUSD).replace(/[^0-9.]/g, '')) || 0;
    if (usd <= 0) return 0;
    return Math.round(usd * pricing.usdToZar * pricing.markup * 100) / 100;
  };

  const fetchCuratedProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCuratedProducts(data.products || []);
      setFilteredCuratedProducts(data.products || []); // Initialize filtered list
    } catch (err) {
      console.error('Fetch curated products error:', err);
    }
  };

  const searchCuratedProducts = async () => {
    if (!curatedSearchQuery.trim()) {
      setFilteredCuratedProducts(curatedProducts);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/products/search?q=${encodeURIComponent(curatedSearchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setFilteredCuratedProducts(data.products || []);
    } catch (err) {
      console.error('Curated product search error:', err);
      setFilteredCuratedProducts([]);
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
      // Strictly keep only China-origin items
      const filtered = (data.items || []).filter(p => p.originCountry === 'CN');
      // Debug: sample
      console.log('CJ Search Results Sample:', filtered?.[0]); // Debug: see what fields we get
      setSearchResults(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open SEO panel when adding a product
  const addToCurated = (product) => {
    const costPrice = Number(product.price) || 0;
    
    if (costPrice <= 0) {
      setError('⚠️ Cannot add product: Invalid or missing price from supplier.');
      return;
    }
    
    setSelectedProduct(product);
    setShowSEOPanel(true);
    setSeoSuggestions([]);
    setSeoReasoning('');
  };
  
  // Generate AI SEO titles
  const generateSEOTitle = async () => {
    if (!selectedProduct) return;
    
    setGeneratingSEO(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/generate-seo-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalTitle: selectedProduct.name,
          category: selectedProduct.category || 'Baby/Kids',
          price: Number(selectedProduct.price) || 0,
          pid: selectedProduct.pid
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSeoSuggestions(data.suggestions || []);
        setSeoReasoning(data.reasoning || '');
      } else {
        setError('Failed to generate SEO titles');
      }
    } catch (err) {
      setError('Error generating SEO titles: ' + err.message);
    } finally {
      setGeneratingSEO(false);
    }
  };
  
  // Confirm and add product with chosen title
  const confirmAddToCurated = async (chosenTitle) => {
    if (!selectedProduct) return;
    
    try {
      const costPrice = Number(selectedProduct.price) || 0;
      
      // Mark product as being added
      setAddingProducts(prev => new Set(prev).add(selectedProduct.pid));

      // Fetch full product details to get rich CJ data
      let productDetails = {
        description: selectedProduct.description || selectedProduct.name,
        material: '',
        productFeatures: '',
        packageSize: '',
        packingList: '',
        weight: ''
      };
      
      try {
        const detailsRes = await fetch(
          `${API_BASE}/api/admin/cj-products/${selectedProduct.pid}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          productDetails = {
            description: details.description || details.productDescription || selectedProduct.name,
            material: details.material || '',
            productFeatures: details.productFeatures || '',
            packageSize: details.packageSize || '',
            packingList: details.packingList || '',
            weight: details.weight || ''
          };
          console.log('📦 Fetched full CJ product details:', productDetails);
        }
      } catch (err) {
        console.log('Could not fetch product details, using fallback');
      }

      const res = await fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cj_pid: selectedProduct.pid,
          product_name: chosenTitle,
          original_cj_title: selectedProduct.name,
          product_description: productDetails.description,
          product_material: productDetails.material,
          product_features: productDetails.productFeatures,
          package_size: productDetails.packageSize,
          packing_list: productDetails.packingList,
          product_weight: productDetails.weight,
          product_image: selectedProduct.image,
          cj_cost_price: costPrice,
          category: selectedProduct.category,
        }),
      });

      if (res.ok) {
        // Close SEO panel
        setShowSEOPanel(false);
        setSelectedProduct(null);
        setSeoSuggestions([]);
        
        // Refresh product list
        await fetchCuratedProducts();
        
        // Brief delay to show success state
        setTimeout(() => {
          setAddingProducts(prev => {
            const next = new Set(prev);
            next.delete(selectedProduct.pid);
            return next;
          });
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add product');
        setAddingProducts(prev => {
          const next = new Set(prev);
          next.delete(selectedProduct.pid);
          return next;
        });
      }
    } catch (err) {
      setError('Error adding product: ' + err.message);
      if (selectedProduct) {
        setAddingProducts(prev => {
          const next = new Set(prev);
          next.delete(selectedProduct.pid);
          return next;
        });
      }
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
    // Base cost in ZAR from supplier USD
    const costPrice = Number(editingProduct.cj_cost_price) * pricing.usdToZar;
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

  // Quick Link: Link product to CJ by Product ID
  const handleQuickLink = async () => {
    if (!quickLinkPid.trim() || !editingProduct) {
      alert('Please enter a CJ Product ID');
      return;
    }

    setLinking(true);
    try {
      // Fetch CJ product details to get the variant ID
      const response = await fetch(
        `${API_BASE}/api/admin/cj-products/search?q=${encodeURIComponent(quickLinkPid)}&pageSize=1`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch CJ product');
      }

      const data = await response.json();
      const items = data.items || [];
      
      if (items.length === 0 || items[0].pid !== quickLinkPid) {
        alert(`No CJ product found with ID: ${quickLinkPid}`);
        return;
      }

      const cjProduct = items[0];
      
      // Update the curated product with CJ linking data
      const updateResponse = await fetch(`${API_BASE}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cj_pid: cjProduct.pid,
          cj_vid: cjProduct.vid || cjProduct.pid, // Use vid if available, otherwise pid
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to link product to CJ');
      }

      alert('✅ Product successfully linked to CJ!');
      setQuickLinkPid('');
      await fetchCuratedProducts();
      closeEditModal();
    } catch (error) {
      alert('Error linking product: ' + error.message);
    } finally {
      setLinking(false);
    }
  };

  // Unlink product from CJ
  const handleUnlink = async () => {
    if (!editingProduct) return;
    
    if (!confirm('Are you sure you want to unlink this product from CJ? Shipping calculator will not work for this product.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cj_vid: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unlink product');
      }

      alert('Product unlinked from CJ');
      await fetchCuratedProducts();
      closeEditModal();
    } catch (error) {
      alert('Error unlinking product: ' + error.message);
    }
  };

  // Sync all retail prices to suggested prices
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
        alert(`✓ Successfully synced ${data.updated} product retail prices!`);
        await fetchCuratedProducts(); // Refresh the list
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
              placeholder="Search supplier products by name or paste CJ SKU/PID (e.g., CJYE206896609IR)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCJProducts()}
            />
            <button onClick={searchCJProducts} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          <p style={{ 
            fontSize: '13px', 
            color: '#7f8c8d', 
            marginTop: '8px',
            marginBottom: '16px' 
          }}>
            💡 <strong>Tip:</strong> Search by product name (e.g., "baby bottle") or paste a CJ product SKU/PID directly (e.g., CJYE206896609IR)
          </p>

          {error && <div className="admin-error">{error}</div>}

          <div className="product-grid">
            {searchResults
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((product) => {
                const isAlreadyCurated = curatedProducts.some(
                  (cp) => cp.cj_pid === product.pid
                );
                const isAdding = addingProducts.has(product.pid);

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
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#999', 
                        margin: '8px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4',
                        fontStyle: 'italic'
                      }}>
                        {product.name}
                      </p>
                      <p className="product-card-price">
                        {(() => { const usd = parseFloat(String(product.price).replace(/[^0-9.]/g,'')) || 0; return `Cost: $${usd.toFixed(2)}`; })()}
                      </p>
                      <p className="product-card-suggested">
                        Suggested: R {(product.suggestedRetailZAR ? Number(product.suggestedRetailZAR) : computeSuggestedRetail(product.price)).toFixed(2)}
                        {!pricing.loaded && <span style={{ marginLeft:6, fontSize:'11px', color:'#888' }}>…</span>}
                      </p>
                      {isAlreadyCurated ? (
                        <button className="btn-secondary" disabled>
                          ✓ Already Added
                        </button>
                      ) : (
                        <button
                          className={`btn-primary ${isAdding ? 'btn-success-flash' : ''}`}
                          onClick={() => addToCurated(product)}
                          disabled={isAdding}
                          style={{
                            background: isAdding ? '#27ae60' : '',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isAdding ? '✓ Added to Store!' : '+ Add to Store'}
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
          {/* Search bar for curated products */}
          <div className="search-bar" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search your products by name, database ID, or CJ PID..."
              value={curatedSearchQuery}
              onChange={(e) => setCuratedSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchCuratedProducts();
                }
              }}
            />
            <button onClick={searchCuratedProducts}>
              Search
            </button>
            {curatedSearchQuery && (
              <button 
                onClick={() => {
                  setCuratedSearchQuery('');
                  setFilteredCuratedProducts(curatedProducts);
                }}
                style={{ background: '#95a5a6' }}
              >
                Clear
              </button>
            )}
          </div>
          
          <p style={{ 
            fontSize: '13px', 
            color: '#7f8c8d', 
            marginBottom: '16px' 
          }}>
            💡 <strong>Tip:</strong> Search by product name, your database ID (e.g., "42"), or CJ PID (e.g., "CJYE206896609IR")
          </p>
          
          <div className="curated-list">
            {filteredCuratedProducts.length === 0 ? (
              <p>{curatedSearchQuery ? 'No products found matching your search.' : 'No curated products yet. Search and add products from the supplier catalog!'}</p>
            ) : (
              <table className="curated-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Name</th>
                    <th>CJ PID</th>
                    <th>Cost Price (USD)</th>
                    <th>Cost Price (ZAR)</th>
                    <th>Suggested Price (1.4x)</th>
                    <th>Retail Price</th>
                    <th>Stock</th>
                    <th>Link Status</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCuratedProducts.map((product) => {
                    const isLinked = !!product.cj_vid;
                    
                    return (
                    <tr key={product.id}>
                      <td style={{ fontWeight: 'bold', color: '#3498db' }}>
                        #{product.id}
                      </td>
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
                      <td style={{ fontSize: '11px', color: '#7f8c8d', fontFamily: 'monospace' }}>
                        {product.cj_pid}
                      </td>
                      <td>${Number(product.cj_cost_price).toFixed(2)}</td>
                      <td>R {(Number(product.cj_cost_price) * pricing.usdToZar).toFixed(2)}</td>
                      <td>
                        {(() => {
                          const costUSD = Number(product.cj_cost_price);
                          const costZAR = costUSD * pricing.usdToZar;
                          const storedSuggested = Number(product.suggested_price);
                          const calculatedSuggested = Math.round(costZAR * pricing.markup * 100) / 100;
                          const usingFallback = storedSuggested < costZAR;
                          const suggested = usingFallback ? calculatedSuggested : storedSuggested;
                          return (
                            <>
                              R {suggested.toFixed(2)}
                              {usingFallback && (
                                <span style={{ marginLeft: 6, fontSize: '11px', color: '#b36b00' }} title="Stored value was outdated (USD-based). Displaying recalculated ZAR-based suggested price.">(recalc)</span>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const costUSD = Number(product.cj_cost_price);
                          const costZAR = costUSD * pricing.usdToZar;
                          const storedSuggested = Number(product.suggested_price);
                          const calculatedSuggested = Math.round(costZAR * pricing.markup * 100) / 100;
                          const usingFallback = storedSuggested < costZAR;
                          const suggested = usingFallback ? calculatedSuggested : storedSuggested;
                          const retail = Number(product.custom_price || suggested);
                          return <>R {retail.toFixed(2)}</>;
                        })()}
                      </td>
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
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: isLinked ? '#d5f4e6' : '#fee2e2',
                          color: isLinked ? '#27ae60' : '#dc3545',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isLinked ? '✅ Linked' : '❌ Not Linked'}
                        </span>
                        {isLinked && (
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                            VID: {product.cj_vid.substring(0, 12)}...
                          </div>
                        )}
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
                        {!isLinked && (
                          <button
                            className="btn-small"
                            style={{ background: '#3498db', color: 'white' }}
                            onClick={() => openEditModal(product)}
                          >
                            🔗 Link to CJ
                          </button>
                        )}
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
                  )})}

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

              {/* CJ Product Linking Section */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: editingProduct.cj_vid ? '#d5f4e6' : '#fff3cd',
                borderRadius: '8px',
                border: `2px solid ${editingProduct.cj_vid ? '#27ae60' : '#ffc107'}`
              }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔗 CJ Dropshipping Link
                  {editingProduct.cj_vid ? (
                    <span style={{ fontSize: '12px', color: '#27ae60', fontWeight: 'normal' }}>✅ Linked</span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#f39c12', fontWeight: 'normal' }}>❌ Not Linked</span>
                  )}
                </h3>
                
                {editingProduct.cj_vid ? (
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ color: '#27ae60' }}>✅ This product is linked to CJ Dropshipping</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        <div><strong>CJ Product ID:</strong> {editingProduct.cj_pid}</div>
                        <div><strong>CJ Variant ID:</strong> {editingProduct.cj_vid}</div>
                      </div>
                    </div>
                    <div style={{ 
                      padding: '12px', 
                      background: 'white', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      ℹ️ This product now supports:
                      <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                        <li>Real-time shipping quotes with multiple carriers</li>
                        <li>Accurate delivery date estimation</li>
                        <li>Shipping insurance options</li>
                        <li>Automatic stock sync from CJ</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      🔓 Unlink from CJ
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '16px', fontSize: '13px', color: '#666' }}>
                      <strong>⚠️ This product needs to be linked to a CJ product to enable:</strong>
                      <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                        <li>Real-time shipping quotes</li>
                        <li>Delivery date estimates</li>
                        <li>Shipping insurance</li>
                        <li>Automatic fulfillment</li>
                      </ul>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Current product: <strong>{editingProduct.product_name}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                        Search for the matching CJ product below or use the existing CJ Product ID if you know it:
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          placeholder="Enter CJ Product ID (pid) to quick-link..."
                          value={quickLinkPid}
                          onChange={(e) => setQuickLinkPid(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && quickLinkPid.trim()) {
                              handleQuickLink();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleQuickLink}
                          disabled={linking || !quickLinkPid.trim()}
                          style={{
                            padding: '8px 16px',
                            background: linking ? '#95a5a6' : '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '13px',
                            cursor: linking || !quickLinkPid.trim() ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {linking ? 'Linking...' : 'Quick Link'}
                        </button>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        color: '#999', 
                        fontSize: '12px',
                        margin: '12px 0'
                      }}>
                        OR
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Switch to search tab and auto-search for this product
                          setActiveTab('search');
                          setSearchQuery(editingProduct.product_name.split(' ').slice(0, 3).join(' '));
                          setTimeout(() => searchCJProducts(), 100);
                          closeEditModal();
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        🔍 Search CJ Catalog for "{editingProduct.product_name.split(' ').slice(0, 3).join(' ')}"
                      </button>
                    </div>
                  </div>
                )}
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
                  <small>Cost: R{(Number(editingProduct.cj_cost_price) * pricing.usdToZar).toFixed(2)} (USD × rate)</small>
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
                          Margin: {(((suggestedPrice - (Number(editingProduct.cj_cost_price) * pricing.usdToZar)) / (Number(editingProduct.cj_cost_price) * pricing.usdToZar)) * 100).toFixed(1)}%
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

      {/* AI SEO Title Generator Modal */}
      {showSEOPanel && selectedProduct && (
        <div className="modal-overlay" onClick={() => {
          setShowSEOPanel(false);
          setSelectedProduct(null);
          setSeoSuggestions([]);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>🤖 AI SEO Title Optimizer</h2>
              <button className="modal-close" onClick={() => {
                setShowSEOPanel(false);
                setSelectedProduct(null);
                setSeoSuggestions([]);
              }}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                />
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
                  Original Supplier Title:
                </div>
                <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '500' }}>
                  {selectedProduct.name}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
                  Category: {selectedProduct.category} | Cost: R{Number(selectedProduct.price || 0).toFixed(2)}
                </div>
              </div>

              {!seoSuggestions.length ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <button
                    onClick={generateSEOTitle}
                    disabled={generatingSEO}
                    style={{
                      padding: '16px 32px',
                      background: generatingSEO ? '#95a5a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: generatingSEO ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => !generatingSEO && (e.target.style.transform = 'scale(1.05)')}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    {generatingSEO ? '🔄 Generating with AI...' : '✨ Generate SEO Titles with AI'}
                  </button>
                  <div style={{ marginTop: '16px', fontSize: '13px', color: '#7f8c8d' }}>
                    AI will create 3 optimized titles for better search ranking and sales
                  </div>
                  <button
                    onClick={() => confirmAddToCurated(selectedProduct.name)}
                    style={{
                      marginTop: '24px',
                      padding: '10px 20px',
                      background: 'transparent',
                      color: '#3498db',
                      border: '2px solid #3498db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Skip AI - Use Original Title
                  </button>
                </div>
              ) : (
                <div>
                  {seoReasoning && (
                    <div style={{ 
                      padding: '12px 16px', 
                      background: '#e3f2fd', 
                      borderLeft: '4px solid #2196f3',
                      borderRadius: '4px',
                      marginBottom: '20px',
                      fontSize: '13px',
                      color: '#1565c0'
                    }}>
                      💡 {seoReasoning}
                    </div>
                  )}

                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
                    Select an optimized title or edit below:
                  </div>

                  {seoSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: 'white',
                        border: '2px solid #e1e8ed',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => confirmAddToCurated(suggestion)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#3498db';
                        e.currentTarget.style.background = '#f8f9fa';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#e1e8ed';
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          minWidth: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#27ae60' : '#3498db',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '500', lineHeight: '1.5' }}>
                            {suggestion}
                          </div>
                          <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '4px' }}>
                            {suggestion.length} characters {idx === 0 && '(Recommended)'}
                          </div>
                        </div>
                        <div style={{
                          padding: '6px 12px',
                          background: '#3498db',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          Select
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '20px', padding: '16px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                    <div style={{ fontSize: '12px', color: '#856404', marginBottom: '8px' }}>
                      💾 <strong>Note:</strong> Original supplier title "{selectedProduct.name}" will be preserved for reference
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSeoSuggestions([]);
                      setSeoReasoning('');
                    }}
                    style={{
                      marginTop: '16px',
                      padding: '8px 16px',
                      background: 'transparent',
                      color: '#7f8c8d',
                      border: '1px solid #e1e8ed',
                      borderRadius: '4px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Regenerate Titles
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
