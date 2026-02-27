import React, { useEffect, useMemo, useState } from 'react';
import './LocalProductsCatalog.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

function LocalProductsCatalog({ query, onOpenProduct, isAdmin, onShowUpload, initialProducts = [], onAddToCart }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(48);
  // category filtering state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const categories = [
    { id: 'all', name: 'All Products', icon: '🛍️' },
    { id: 'strollers', name: 'Strollers & Prams', icon: '👶' },
    { id: 'car-seats', name: 'Car Seats', icon: '🚗' },
    { id: 'feeding', name: 'Feeding & Nursing', icon: '🍼' },
    { id: 'toys', name: 'Toys & Games', icon: '🧸' },
    { id: 'clothing', name: 'Baby Clothing', icon: '👕' },
    { id: 'safety', name: 'Safety & Health', icon: '🛡️' },
    { id: 'furniture', name: 'Nursery Furniture', icon: '🛏️' },
    { id: 'gear', name: 'Baby Gear', icon: '🎒' },
    { id: 'bath', name: 'Bath & Potty', icon: '🛁' },
    { id: 'bathtime', name: 'Bathtime', icon: '🚿' },
    { id: 'outdoor', name: 'Outdoor & Travel', icon: '⛺' }
  ];

  // Fetch local products if we don't have initial products
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      fetchProducts();
    }
  }, [initialProducts]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/local-products?limit=200`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching local products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search query and category
  useEffect(() => {
    let list = products;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (selectedCategory && selectedCategory !== 'all') {
      const cat = selectedCategory;
      list = list.filter(p => {
        const category = (p.category || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        switch(cat) {
          case 'strollers': return category.includes('stroller') || category.includes('pram') || name.includes('stroller');
          case 'car-seats': return category.includes('car seat') || name.includes('car seat');
          case 'feeding': return category.includes('feeding') || category.includes('bottle') || name.includes('bottle') || name.includes('feeding');
          case 'toys': return category.includes('toy') || name.includes('toy');
          case 'clothing': return category.includes('clothing') || category.includes('apparel') || name.includes('clothing');
          case 'safety': return category.includes('safety') || category.includes('health') || name.includes('safety');
          case 'furniture': return category.includes('furniture') || name.includes('crib') || name.includes('furniture');
          case 'gear': return category.includes('gear') || name.includes('carrier') || name.includes('gear');
          case 'bath': return category.includes('bath') || name.includes('bath') || name.includes('potty');
          case 'outdoor': return category.includes('outdoor') || category.includes('travel') || name.includes('outdoor');
          default: return true;
        }
      });
    }
    setFilteredProducts(list);
    setPageNum(1);
  }, [query, products, selectedCategory]);

  // Normalize image URL
  const normalizeImageUrl = (url) => {
    if (!url) return '';
    // If already base64, return as is
    if (url.startsWith('data:')) return url;
    // If relative path, prepend API base
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    // If protocol-relative, use https
    if (url.startsWith('//')) return `https:${url}`;
    // If http, upgrade to https
    if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
    return url;
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (pageNum - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, pageNum, pageSize]);

  const handleProductClick = (product) => {
    onOpenProduct({
      ...product,
      id: product.id,
      name: product.name,
      product_name: product.name,
      image: normalizeImageUrl(product.images?.[0] || ''),
      price: parseFloat(product.price) || 0,
      isLocal: true
    });
  };

  const renderProductCard = (product) => {
    const inStock = product.stock_quantity > 0;
    const price = parseFloat(product.price) || 0;
    const comparePrice = parseFloat(product.compare_at_price) || 0;
    const onSale = comparePrice && comparePrice > price;
    const discount = onSale ? Math.round((1 - price / comparePrice) * 100) : 0;

    return (
      <div
        key={product.id}
        className="local-product-card"
        onClick={() => handleProductClick(product)}
      >
        <div className="card-image-container">
          <img
            src={normalizeImageUrl(product.images?.[0] || '')}
            alt={product.name}
            className="card-image"
          />

          {/* Fast Delivery Badge */}
          <div className="card-fast-shipping-badge">⚡ Fast Delivery</div>

          {/* Discount Badge */}
          {onSale && discount > 0 && (
            <div className="card-discount-badge">-{discount}%</div>
          )}

          {/* Out of Stock Overlay */}
          {!inStock && (
            <div className="card-out-of-stock">
              <span>OUT OF STOCK</span>
            </div>
          )}

          {/* Quick View Button */}
          <button className="card-quick-view">
            👁️ Quick View
          </button>
        </div>

        <div className="card-body">
          <h3 className="card-name">{product.name}</h3>

          <p className="card-category">
            {product.category ? product.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'General'}
          </p>

          <div className="card-pricing">
            {onSale ? (
              <>
                <span className="card-price-original">R{comparePrice.toFixed(2)}</span>
                <span className="card-price-current">R{price.toFixed(2)}</span>
              </>
            ) : (
              <span className="card-price-current">R{price.toFixed(2)}</span>
            )}
          </div>

          <div className="card-stock">
            {inStock ? (
              <span className="stock-available">In stock ({product.stock_quantity})</span>
            ) : (
              <span className="stock-unavailable">Out of stock</span>
            )}
          </div>

          <button
            className="card-add-to-cart"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price) || 0,
                image: normalizeImageUrl(product.images?.[0] || ''),
                stock_quantity: product.stock_quantity || 0,
                isLocal: true,
                raw: product
              });
            }}
            disabled={!inStock}
            title={inStock ? 'Add to cart' : 'Out of stock'}
          >
            🛒 Add to Cart
          </button>
        </div>
      </div>
    );
  };

  if (loading && products.length === 0) {
    return (
      <div className="local-catalog-loading">
        <p>Loading local products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="local-catalog-error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="local-catalog-empty">
        <p>No local products available</p>
        {isAdmin && (
          <button className="btn-add-first" onClick={onShowUpload}>
            📸 Upload Your First Product
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="local-products-catalog">

      {/* Delivery information */}
      <p style={{fontSize:'1rem', color:'#555', margin:'12px 0'}}>
        Products from our warehouse - delivered in 2 working days
      </p>

      {/* Category toggle */}
      <button className="category-toggle-mobile" onClick={() => setSidebarOpen(true)}>
        📂 Categories
      </button>

      {/* Search Results Info */}
      {query && (
        <div className="search-results-info">
          <p>Search results for "<strong>{query}</strong>" ({filteredProducts.length} products)</p>
        </div>
      )}

      {/* Filtering info */}
      {selectedCategory && selectedCategory !== 'all' && (
        <div className="search-results-info">
          <p>Filtering by <strong>{categories.find(c => c.id === selectedCategory)?.name}</strong></p>
        </div>
      )}


      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <>
          <div className="catalog-layout">
          {/* Category sidebar */}
          <div className={`category-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <button className="category-close-mobile" onClick={() => setSidebarOpen(false)}>✕</button>
            <ul className="category-list">
              {categories.map(cat => (
                <li
                  key={cat.id}
                  className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.id === 'all' ? null : cat.id);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="category-name">{cat.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="products-grid">
            {paginatedProducts.map(renderProductCard)}
          </div>
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPageNum(Math.max(1, pageNum - 1))}
                disabled={pageNum === 1}
                className="pagination-button"
              >
                ← Previous
              </button>

              <div className="pagination-info">
                Page {pageNum} of {totalPages}
              </div>

              <button
                onClick={() => setPageNum(Math.min(totalPages, pageNum + 1))}
                disabled={pageNum === totalPages}
                className="pagination-button"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-results">
          <p>No products found for "{query}"</p>
        </div>
      )}
    </div>
  );
}

export default LocalProductsCatalog;
