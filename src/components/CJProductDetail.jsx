import React, { useEffect, useMemo, useState } from 'react';
import './ProductDetail.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

// A detail modal for curated products from our backend
export default function CJProductDetail({ pid, onClose, onAddToCart }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/products/${pid}`);
        
        if (!response.ok) {
          throw new Error(`Product not found: ${response.statusText}`);
        }
        
        const res = await response.json();
        const data = res.product;
        setProduct(data);
        
        // Normalize image URL
        const normalizeUrl = (u) => {
          if (!u) return '';
          let s = String(u).trim();
          if (s.startsWith('//')) s = 'https:' + s;
          if (s.startsWith('http://')) s = s.replace(/^http:/, 'https:');
          return s;
        };
        const main = normalizeUrl(data?.product_image || '');
        setSelectedImage(main);
      } catch (e) {
        setError(e.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [pid]);

  const images = useMemo(() => {
    const normalizeUrl = (u) => {
      if (!u) return '';
      let s = String(u).trim();
      if (s.startsWith('//')) s = 'https:' + s;
      if (s.startsWith('http://')) s = s.replace(/^http:/, 'https:');
      return s;
    };
    const main = normalizeUrl(product?.product_image);
    return main ? [main] : [];
  }, [product]);

  // Curated products have a single fixed price (no variants in simplified model)
  const price = product?.custom_price || product?.suggested_price || 0;

  const handleAdd = () => {
    if (!product) return;
    const name = product.product_name || 'Product';
    const item = {
      id: `curated-${product.id}`,
      name: name,
      price: Number(price) || 0,
      image: selectedImage || images[0] || '',
      category: product.category || 'Store',
    };
    for (let i = 0; i < qty; i++) onAddToCart?.(item);
    onClose?.();
  };

  if (loading) {
    return (
      <div className="product-detail-modal" onClick={onClose}>
        <div className="product-detail-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: 24 }}>Loading product…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-modal" onClick={onClose}>
        <div className="product-detail-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: 24, color: '#a30000' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-modal" onClick={onClose}>
      <div className="product-detail-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-detail" onClick={onClose}>✕</button>
        <div className="product-detail-grid">
          <div className="product-gallery">
            <div className="main-image">
              {selectedImage ? <img src={selectedImage} alt={product?.product_name || 'Product'} /> : <div style={{height: 320, display:'flex', alignItems:'center', justifyContent:'center'}}>🍼</div>}
            </div>
            {images.length > 1 && (
              <div className="thumbnail-gallery">
                {images.map((img) => (
                  <img key={img} src={img} className={selectedImage === img ? 'active' : ''} onClick={() => setSelectedImage(img)} />
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <div className="breadcrumb">Store / {product?.category || 'Products'}</div>
            <h1 className="product-title">{product?.product_name || 'Product'}</h1>
            <div className="product-price">
              <span className="current-price">R {Number(price).toFixed(2)}</span>
              {product?.cj_cost_price && product?.cj_cost_price !== price && (
                <span style={{ marginLeft: 12, color: '#999', textDecoration: 'line-through', fontSize: '14px' }}>
                  Cost: R {Number(product.cj_cost_price).toFixed(2)}
                </span>
              )}
            </div>

            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                <span className="quantity-display">{qty}</span>
                <button className="qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
              </div>
            </div>

            <div className="action-buttons">
              <button className="add-to-cart-btn" onClick={handleAdd}>🛒 Add to Cart</button>
              <button className="add-to-wishlist-btn" onClick={onClose}>Close</button>
            </div>

            {product?.product_description && (
              <div className="product-description" style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>Description</h3>
                <div 
                  style={{ 
                    whiteSpace: 'pre-wrap', 
                    lineHeight: '1.8',
                    fontSize: '14px',
                    color: '#555'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: String(product.product_description)
                      .replace(/\\n/g, '\n')
                      .replace(/\n/g, '<br/>')
                      .replace(/<br\/><br\/>/g, '</p><p>')
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
