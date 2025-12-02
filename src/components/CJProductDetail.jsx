import React, { useEffect, useMemo, useState } from 'react';
import './ProductDetail.css';
import { trackProductView } from '../lib/analytics';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

// A detail modal for curated products from our backend
export default function CJProductDetail({ pid, onClose, onAddToCart }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
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
        const fetchedVariants = res.variants || [];
        
        // DEBUG: Log full product data from database INCLUDING stock
        console.log('📦 Product loaded from database:', {
          id: data.id,
          name: data.product_name,
          stock_quantity: data.stock_quantity,
          is_active: data.is_active,
          cj_pid: data.cj_pid,
          cj_vid: data.cj_vid,
          has_cj_vid: !!data.cj_vid,
          variantCount: fetchedVariants.length,
          fullData: data
        });
        
        // Log stock status clearly
        const stock = Number(data.stock_quantity) || 0;
        if (stock === 0) {
          console.warn(`⚠️ PRODUCT OUT OF STOCK: ${data.product_name} (stock_quantity = ${stock})`);
        } else if (stock < 10) {
          console.warn(`⚡ LOW STOCK: ${data.product_name} (stock_quantity = ${stock})`);
        }
        
        setProduct(data);
        setVariants(fetchedVariants);
        
        // Track product view
        trackProductView({
          id: data.id || data.cj_pid,
          pid: data.cj_pid,
          name: data.product_name,
          category: data.category || 'uncategorized',
          price: data.custom_price || data.suggested_price || 0
        });
        
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
    
    const imageSet = new Set();
    
    // Add main product image
    const main = normalizeUrl(product?.product_image);
    if (main) imageSet.add(main);
    
    // Extract images from product description HTML
    if (product?.product_description) {
      const desc = String(product.product_description);
      // Match all img src attributes
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      let match;
      while ((match = imgRegex.exec(desc)) !== null) {
        const imgUrl = normalizeUrl(match[1]);
        if (imgUrl) imageSet.add(imgUrl);
      }
    }
    
    return Array.from(imageSet);
  }, [product]);

  // Sanitize description: remove images and media so we don't duplicate the gallery
  const sanitizedDescription = useMemo(() => {
    const raw = product?.product_description;
    if (!raw) return '';
    try {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = String(raw);
      // Remove media elements that create the vertical stack
      wrapper.querySelectorAll('img, picture, figure, svg, video, source').forEach((el) => el.remove());
      // Drop empty anchors that previously wrapped images
      wrapper.querySelectorAll('a').forEach((a) => {
        const hasText = (a.textContent || '').trim().length > 0;
        const hasChildren = a.children && a.children.length > 0;
        if (!hasText && !hasChildren) a.remove();
      });
      // Remove inline styles to keep typography consistent
      wrapper.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
      let html = wrapper.innerHTML;
      // Normalize line breaks and paragraphs similar to previous behavior
      html = html
        .replace(/\n/g, '\n')
        .replace(/\r/g, '')
        .replace(/\n/g, '<br/>')
        .replace(/(<br\/>\s*){2,}/gi, '</p><p>');
      return html;
    } catch (e) {
      // Fallback: regex-strip <img> tags if DOM operations fail
      return String(raw).replace(/<img[\s\S]*?>/gi, '');
    }
  }, [product?.product_description]);

  // Derive variants with color extraction
  const processedVariants = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    const colorKeywords = ['Pink','Blue','Red','Black','White','Green','Yellow','Purple','Gray','Grey','Orange'];
    return variants.map(v => {
      const name = v.product_name || '';
      const foundColor = colorKeywords.find(c => name.includes(c));
      return {
        id: v.id,
        color: foundColor || 'Default',
        price: v.custom_price || v.suggested_price || 0,
        image: v.main_image,
        stock_quantity: v.stock_quantity || 0,
        raw: v
      };
    });
  }, [variants]);

  // Auto-select first variant on load
  useEffect(() => {
    if (processedVariants.length > 0 && !selectedVariant) {
      setSelectedVariant(processedVariants[0]);
    }
  }, [processedVariants]);

  // If URL has ?color=..., auto-select matching variant
  useEffect(() => {
    if (!processedVariants || processedVariants.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const colorParam = (params.get('color') || '').toLowerCase();
    if (!colorParam) return;
    const match = processedVariants.find(v => v.color.toLowerCase() === colorParam);
    if (match) setSelectedVariant(match);
  }, [processedVariants]);

  // Sync selected image when variant changes
  useEffect(() => {
    if (selectedVariant?.image) {
      setSelectedImage(selectedVariant.image);
    }
  }, [selectedVariant]);

  // Gallery images: variant-specific or all variant images
  const galleryImages = useMemo(() => {
    if (selectedVariant) {
      // If variant selected, show only its image
      return selectedVariant.image ? [selectedVariant.image] : [];
    }
    // Otherwise, show all variant images
    if (processedVariants.length > 1) {
      return processedVariants.map(v => v.image).filter(Boolean);
    }
    // Fallback to original images logic
    return images;
  }, [selectedVariant, processedVariants, images]);

  // Active product is selectedVariant if exists, else main product
  const activeProduct = selectedVariant?.raw || product;
  const price = activeProduct?.custom_price || activeProduct?.suggested_price || 0;
  const stockQuantity = selectedVariant?.stock_quantity ?? (product?.stock_quantity || 0);
  const isOutOfStock = stockQuantity === 0;
  const isLowStock = stockQuantity > 0 && stockQuantity < 10;

  const handleAdd = () => {
    if (!activeProduct || isOutOfStock) return;
    
    // Limit quantity to available stock
    const quantityToAdd = Math.min(qty, stockQuantity);
    
    const baseName = product?.product_name || 'Product';
    const name = selectedVariant ? `${baseName} - ${selectedVariant.color}` : baseName;
    const item = {
      id: selectedVariant ? `curated-${selectedVariant.id}` : `curated-${product.id}`,
      name: name,
      price: Number(price) || 0,
      image: selectedImage || images[0] || '',
      category: activeProduct.category || 'Store',
      // Carry-through fields needed for shipping + stock in cart
      cj_vid: activeProduct.cj_vid,
      cj_pid: activeProduct.cj_pid,
      stock_quantity: stockQuantity,
    };
    
    // DEBUG: Log what we're adding to cart
    console.log('➕ Adding to cart:', {
      productId: product.id,
      name: name.substring(0, 30),
      has_cj_vid: !!product.cj_vid,
      cj_vid: product.cj_vid,
      cj_pid: product.cj_pid,
      fullProduct: product
    });
    
    for (let i = 0; i < quantityToAdd; i++) onAddToCart?.(item);
    onClose?.();
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <button className="back-button" onClick={onClose}>← Back to Products</button>
        <div style={{ padding: 24, textAlign: 'center' }}>Loading product…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <button className="back-button" onClick={onClose}>← Back to Products</button>
        <div style={{ padding: 24, color: '#a30000', textAlign: 'center' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <button className="back-button" onClick={onClose}>← Back to Products</button>
      <div className="product-detail-grid">
        <div className="product-gallery">
          <div className="main-image">
            {selectedImage ? (
              <img src={selectedImage} alt={activeProduct?.product_name || 'Product'} loading="lazy" />
            ) : (
              <div style={{height: '100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: '48px'}}>🍼</div>
            )}
          </div>
          {/* Show thumbnail gallery when we have multiple images */}
          {galleryImages.length > 1 && (
            <div className="thumbnail-gallery">
              {galleryImages.map((img, idx) => (
                <img 
                  key={img} 
                  src={img} 
                  alt={`${activeProduct?.product_name || 'Product'} - Thumbnail ${idx + 1}`}
                  loading="lazy"
                  className={selectedImage === img ? 'active' : ''}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
            <div className="breadcrumb">Store / {product?.category || 'Products'}</div>
            
            <h1 className="product-title">
              {product?.product_name || 'Product'}
              {selectedVariant && <span style={{color: '#666'}}> – {selectedVariant.color}</span>}
            </h1>

            {/* Color Variant Selector */}
            {processedVariants.length > 1 && (
              <div style={{marginBottom: '20px'}}>
                <div style={{fontSize: '14px', fontWeight: '600', marginBottom: '8px'}}>
                  Colour:
                </div>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                  {processedVariants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const isUnavailable = variant.stock_quantity === 0;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => {
                          if (!isUnavailable) {
                            setSelectedVariant(variant);
                            setSelectedImage(variant.image);
                            // Persist selected variant in URL
                            const params = new URLSearchParams(window.location.search);
                            params.set('color', variant.color.toLowerCase());
                            const newUrl = `${window.location.pathname}?${params.toString()}`;
                            window.history.pushState({}, '', newUrl);
                          }
                        }}
                        disabled={isUnavailable}
                        aria-pressed={isSelected}
                        aria-disabled={isUnavailable}
                        title={`${variant.color}${isUnavailable ? ' (Out of stock)' : ''}`}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: isSelected ? '2px solid #3498db' : '2px solid #ddd',
                          borderRadius: '8px',
                          background: isSelected ? '#e3f2fd' : 'white',
                          cursor: isUnavailable ? 'not-allowed' : 'pointer',
                          opacity: isUnavailable ? 0.6 : 1,
                          boxShadow: isSelected ? '0 2px 8px rgba(52,152,219,0.3)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: variant.color.toLowerCase(),
                          border: '1px solid rgba(0,0,0,0.2)'
                        }} />
                        <span style={{fontSize: '14px', fontWeight: isSelected ? '600' : '400'}}>
                          {variant.color}
                        </span>
                        {isUnavailable && (
                          <div style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#e74c3c',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            border: '2px solid white'
                          }}>✕</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {isOutOfStock && (
              <div style={{
                padding: '12px 16px',
                background: '#fee',
                border: '2px solid #e74c3c',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#c0392b',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                ⚠️ SOLD OUT - This product is currently unavailable
              </div>
            )}
            
            {isLowStock && !isOutOfStock && (
              <div style={{
                padding: '12px 16px',
                background: '#fef5e7',
                border: '2px solid #f39c12',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#d68910',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                ⚡ Only {stockQuantity} left in stock - Order soon!
              </div>
            )}
            
            <div className="product-price">
              <span className="current-price">R {Number(price).toFixed(2)}</span>
            </div>

            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>-</button>
                <span className="quantity-display">{qty}</span>
                <button 
                  className="qty-btn" 
                  onClick={() => setQty((q) => Math.min(stockQuantity, q + 1))}
                  disabled={isOutOfStock || qty >= stockQuantity}
                >+</button>
              </div>
              {!isOutOfStock && isLowStock && (
                <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                  Max: {stockQuantity} available
                </small>
              )}
            </div>

            <div className="action-buttons">
              <button 
                className="add-to-cart-btn" 
                onClick={handleAdd}
                disabled={isOutOfStock}
                style={{
                  opacity: isOutOfStock ? 0.8 : 1,
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  background: isOutOfStock ? '#95a5a6' : undefined,
                  animation: isOutOfStock ? 'none' : undefined
                }}
              >
                {isOutOfStock ? '😔 Sold Out - Check Again Soon' : '🛒 Add to Cart'}
              </button>
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
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
