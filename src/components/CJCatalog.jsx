import React, { useEffect, useMemo, useState } from 'react';
import './CJCatalog.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

// USD to ZAR conversion rate
const USD_TO_ZAR = 18.0;

// Maps curated product to UI-friendly shape
function useProductMapping(items) {
  const normalizeUrl = (u) => {
    if (!u) return '';
    let s = String(u).trim();
    if (s.startsWith('//')) s = 'https:' + s;
    if (s.startsWith('http://')) s = s.replace(/^http:/, 'https:');
    return s;
  };
  return useMemo(() => (items || []).map((p) => {
    // Map curated_products table fields
    const pid = p.id;
    const name = p.product_name || 'Product';
    const image = normalizeUrl(p.product_image);
    let priceZAR = 0;
    let isFallback = false;
    if (p.custom_price) {
      priceZAR = Number(p.custom_price);
    } else if (p.suggested_price) {
      priceZAR = Number(p.suggested_price);
    } else if (p.cj_cost_price) {
      priceZAR = Math.round(Number(p.cj_cost_price) * USD_TO_ZAR * 1.4 * 100) / 100;
      isFallback = true;
    }
    const minPrice = priceZAR;
    const maxPrice = minPrice;
    const category = p.category || 'general';
    const isValidPrice = !isNaN(minPrice) && minPrice > 0;
    // Expose warehouses and country info
    const warehouses = Array.isArray(p.warehouses) ? p.warehouses : [];
    // Find if any warehouse is in China
    const isFromChina = warehouses.some(w => w.country_code === 'CN');
    return { pid, name, image, minPrice, maxPrice, category, raw: p, isValidPrice, isFallback, warehouses, isFromChina };
  }), [items]);
}

export default function CJCatalog({ query, onQueryChange, onBack, onOpenProduct, isAdmin }) {
  // Default to no filter unless an explicit query is provided by parent
  const [q, setQ] = useState(typeof query === 'string' ? query : '');
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(48);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('relevance'); // relevance | price_asc | price_desc
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({ list: [], total: 0 });
  const [opening, setOpening] = useState(false);

  const products = useProductMapping(data?.list);
  // Group variants by shared CJ PID (same product different colors)
  const groupedProducts = useMemo(() => {
    const byKey = new Map();
    const colorWords = ['Pink','Blue','Red','Black','White','Green','Yellow','Purple','Gray','Grey','Orange'];
    const extractSkuCode = (name) => {
      if (!name) return '';
      const m = String(name).toUpperCase().match(/S\d{5,}/); // e.g., S20101
      return m ? m[0] : '';
    };
    const canonical = (name) => {
      if (!name) return '';
      let base = name.toLowerCase();
      // remove color words
      for (const c of colorWords) {
        base = base.replace(new RegExp(c.toLowerCase(), 'g'), '');
      }
      // remove size/speed tokens heuristically
      base = base.replace(/\b(\d+\s?inch|7-speed|speed|inch|cm|ages?\s?\d+-?\d*)\b/gi, '');
      // remove punctuation & multiple spaces
      base = base.replace(/[^a-z0-9]+/g, ' ').trim();
      return base;
    };
    // First pass: group by cj_pid or sku code
    for (const p of products) {
      const cjPid = p.raw?.cj_pid || '';
      const skuCode = extractSkuCode(p.name);
      const keyPrimary = cjPid || skuCode;
      const key = keyPrimary || canonical(p.name) || p.pid;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
    }
    const combined = [];
    for (const [key, variants] of byKey.entries()) {
      if (variants.length === 1) {
        combined.push(variants[0]);
        continue;
      }
      // Representative variant
      const rep = variants[0];
      const minPrice = Math.min(...variants.map(v => v.minPrice || 0));
      const maxPrice = Math.max(...variants.map(v => v.maxPrice || 0));
      const galleryImages = [];
      for (const v of variants) if (v.image && !galleryImages.includes(v.image)) galleryImages.push(v.image);
      const variantOptions = variants.map(v => {
        const name = v.name || 'Variant';
        const foundColor = colorWords.find(c => name.toLowerCase().includes(c.toLowerCase())) || 'Option';
        return {
          id: v.raw?.id,
          cj_pid: v.raw?.cj_pid,
          cj_vid: v.raw?.cj_vid,
          name: v.name,
          color: foundColor,
          price: v.minPrice,
          image: v.image,
          raw: v.raw
        };
      });
      combined.push({
        ...rep,
        minPrice,
        maxPrice,
        variantCount: variants.length,
        variantImages: galleryImages,
        variants: variantOptions,
        isGrouped: true
      });
      // Debug grouping summary
      console.log('[Catalog Grouping] Group key:', key, 'count:', variants.length, 'names:', variants.map(v => v.name));
    }
    return combined;
  }, [products]);

  // No country filter in storefront
  const filteredProducts = groupedProducts;
  const sortedProducts = useMemo(() => {
    if (sortBy === 'price_asc') {
      return [...filteredProducts].sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }
    if (sortBy === 'price_desc') {
      return [...filteredProducts].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    }
    return filteredProducts;
  }, [filteredProducts, sortBy]);
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const runSearch = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      // Build query params
      const params = new URLSearchParams();
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      
      // Map sortBy to backend parameters
      if (sortBy === 'price_asc') {
        params.append('sortBy', 'custom_price');
        params.append('sortOrder', 'ASC');
      } else if (sortBy === 'price_desc') {
        params.append('sortBy', 'custom_price');
        params.append('sortOrder', 'DESC');
      }

      const url = `${API_BASE}/api/products?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const res = await response.json();
      
      // Filter by search query on client side (simple name matching)
      let productsList = res.products || [];
      // Show all products (no country filter)
      if (q && q.trim()) {
        const searchLower = q.toLowerCase();
        productsList = productsList.filter(p => 
          (p.product_name || '').toLowerCase().includes(searchLower) ||
          (p.category || '').toLowerCase().includes(searchLower)
        );
      }

      setData({ list: productsList, total: productsList.length });
      setPageNum(page);
    } catch (e) {
      setError(e.message || 'Failed to load products');
      setData({ list: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runSearch(1); /* initial load */ }, []);
  // React to external header search changes
  useEffect(() => {
    if (typeof query === 'string' && query !== q) {
      setQ(query);
      runSearch(1);
    }
  }, [query]);

  return (
    <div className="cj-page">

      <div className="cj-toolbar">
        <input
          className="cj-input"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch(1)}
        />
        <input
          className="cj-input cj-input-small"
          placeholder="Min R"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value.replace(/[^0-9.]/g, ''))}
        />
        <input
          className="cj-input cj-input-small"
          placeholder="Max R"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9.]/g, ''))}
        />
        <button className="cj-btn" onClick={() => runSearch(1)} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        {/* Removed China-only toggle per branding/policy */}
        <select className="cj-input cj-input-small" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="relevance">Sort: Relevance</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {error && <div className="cj-error">{error}</div>}

      {(() => {
        console.log('CJCatalog Debug:', { isAdmin, loading, productsLength: sortedProducts.length });
        return null;
      })()}

      {!loading && sortedProducts.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
          <h3 style={{ color: '#333', marginBottom: '12px' }}>No Products Available Yet</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Products will appear here soon. Check back later!
          </p>
        </div>
      )}

      <div className="cj-grid" aria-busy={opening ? 'true' : 'false'}>
        {sortedProducts.map((p) => {
          const stock = p.raw.stock_quantity || 0;
          const isOutOfStock = stock === 0;
          const isLowStock = stock > 0 && stock < 10;

          return (
            <div 
              key={p.pid} 
              className="cj-card" 
              style={{
                pointerEvents: opening ? 'none' : 'auto', 
                opacity: opening ? 0.6 : 1,
                position: 'relative'
              }} 
              onClick={() => {
                if (opening) return;
                setOpening(true);
                try { onOpenProduct?.(p.pid); } finally { setTimeout(() => setOpening(false), 1200); }
              }}
            >
              {/* Stock badge - only show warnings */}
              {isOutOfStock && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#e74c3c',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  OUT OF STOCK
                </div>
              )}
              {isLowStock && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#f39c12',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  ⚡ {stock} LEFT
                </div>
              )}
              <div className="cj-thumb">
                {p.image ? (
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none'; 
                      e.currentTarget.parentElement.classList.add('cj-thumb-fallback'); 
                    }} 
                  />
                ) : (
                  <div className="cj-thumb-fallback">🍼</div>
                )}
              </div>
              <div className="cj-card-body">
                <div className="cj-name" title={p.name}>{p.name}</div>
                <div className="cj-price">
                  {p.isValidPrice ? (
                    <>
                      From R{Number(p.minPrice).toFixed(2)}
                      {p.variantCount && p.variantCount > 1 && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: '11px',
                          color: '#0b7285',
                          background: '#e3fafc',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontWeight: 600
                        }} title={`${p.variantCount} colour options`}>
                          {p.variantCount} colours
                        </span>
                      )}
                      {p.isFallback && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: '11px',
                          color: '#b36b00',
                          background: '#fff3cd',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontWeight: 500
                        }} title="Calculated from supplier USD × 18 × 1.4">
                          (auto)
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                      Price pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {opening && (
        <div style={{textAlign:'center', marginTop: 12, color:'#666'}}>Loading details…</div>
      )}

      {totalPages > 1 && (
        <div className="cj-pager">
          <button className="cj-btn" disabled={pageNum <= 1 || loading} onClick={() => runSearch(pageNum - 1)}>Prev</button>
          <span className="cj-page-info">Page {pageNum} / {totalPages}</span>
          <button className="cj-btn" disabled={pageNum >= totalPages || loading} onClick={() => runSearch(pageNum + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
