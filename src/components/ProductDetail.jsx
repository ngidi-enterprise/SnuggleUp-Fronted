import React, { useState, useMemo } from 'react';
import './ProductDetail.css';

function ProductDetail({ product, onClose, onAddToCart, allProducts }) {
  const [quantity, setQuantity] = useState(1);
  // If product has grouped variants, set initial selectedVariant
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const [selectedVariant, setSelectedVariant] = useState(variants.length ? variants[0] : null);
  
  // Active product is either selected variant's raw data or base product
  const activeProduct = selectedVariant ? (selectedVariant.raw || product) : product;
  
  // Gallery images: variant-specific or all variant images
  const galleryImages = useMemo(() => {
    if (selectedVariant) return [selectedVariant.image].filter(Boolean);
    if (product.variantImages) return product.variantImages;
    const base = [product.image];
    if (product.altImages) base.push(...product.altImages);
    return base.filter(Boolean);
  }, [product, selectedVariant]);
  
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] || product.image);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  
  // Update selected image when variant changes
  React.useEffect(() => {
    if (selectedVariant && selectedVariant.image) {
      setSelectedImage(selectedVariant.image);
    }
  }, [selectedVariant]);

  const handleAddToCart = () => {
    // Build cart item with variant info if applicable
    const cartItem = selectedVariant ? {
      ...product,
      id: selectedVariant.id || product.id,
      name: selectedVariant.color ? `${product.name} - ${selectedVariant.color}` : product.name,
      image: selectedVariant.image || product.image,
      price: selectedVariant.price || product.price,
      stock_quantity: selectedVariant.raw?.stock_quantity ?? product.stock_quantity
    } : product;
    
    for (let i = 0; i < quantity; i++) {
      onAddToCart(cartItem);
    }
    setShowAddedToCart(true);
  };

  const handleGoToCart = () => {
    onClose();
    // This will trigger the cart to open in the parent component
  };

  const handleContinueShopping = () => {
    onClose();
  };

  // Get related products (different products from the same category or random products)
  const getRelatedProducts = () => {
    if (!allProducts) return [];
    return allProducts
      .filter(p => p.id !== product.id)
      .slice(0, 3);
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const relatedProducts = getRelatedProducts();

  const formatDescription = (input) => {
    if (!input) return null;
    try {
      const tmp = document.createElement('div');
      tmp.innerHTML = String(input || '');
      let text = tmp.textContent || tmp.innerText || '';
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      text = text.replace(/[ \t]+/g, ' ').trim();
      const paras = text.split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
      if (paras.length === 0) return null;
      return paras.map((p, i) => <p key={i} style={{marginTop: i === 0 ? 0 : 8, lineHeight: 1.45}}>{p}</p>);
    } catch (e) {
      return <p>{String(input)}</p>;
    }
  };

  return (
    <div className="product-detail-modal" onClick={onClose}>
      <div className="product-detail-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-detail" onClick={onClose}>✕</button>
        
        {showAddedToCart ? (
          // Added to Cart Confirmation
          <div className="added-to-cart-view">
            <div className="added-header">
              <h2>✓ Added to cart</h2>
              <button className="close-detail" onClick={onClose}>✕</button>
            </div>

            <div className="added-product-info">
              <img src={product.image} alt={product.name} className="added-product-image" />
              <div className="added-product-details">
                <h3>{product.name}</h3>
                <p className="added-quantity">Quantity: {quantity}</p>
                <p className="added-price">R {(product.price * quantity).toFixed(2)}</p>
              </div>
            </div>

            <div className="added-actions">
              <button className="go-to-cart-btn" onClick={handleGoToCart}>
                → Go to Cart
              </button>
              <button className="continue-shopping-btn" onClick={handleContinueShopping}>
                Continue Shopping
              </button>
            </div>

            {relatedProducts.length > 0 && (
              <div className="related-products-section">
                <h3>Related Products</h3>
                <div className="related-products-grid">
                  {relatedProducts.map((relatedProduct) => (
                    <div key={relatedProduct.id} className="related-product-card">
                      <img src={relatedProduct.image} alt={relatedProduct.name} />
                      <div className="related-product-info">
                        <h4>{relatedProduct.name}</h4>
                        <p className="related-product-price">R {relatedProduct.price}</p>
                        <button 
                          className="related-add-btn"
                          onClick={() => {
                            onAddToCart(relatedProduct);
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Original Product Detail View
          <div className="product-detail-grid">
          {/* Left side - Image Gallery */}
          <div className="product-gallery">
            <div className="main-image">
              <img src={selectedImage} alt={product.name} />
            </div>
            <div className="thumbnail-gallery">
              {galleryImages.map((img, idx) => (
                <img
                  key={img || idx}
                  src={img}
                  alt={selectedVariant ? `${product.name} - ${selectedVariant.color}` : product.name}
                  className={selectedImage === img ? 'active' : ''}
                  onClick={() => setSelectedImage(img)}
                  style={{marginLeft: idx > 0 ? '8px' : 0}}
                />
              ))}
            </div>
          </div>

          {/* Right side - Product Info */}
          <div className="product-info">
            <div className="breadcrumb">
              <span>Beauty</span> / <span>{product.category}</span>
            </div>

            <h1 className="product-title">
              {product.name}
              {selectedVariant && selectedVariant.color && (
                <span style={{ fontWeight: 400, fontSize: '0.85em', color: '#666', marginLeft: 8 }}>
                  – {selectedVariant.color}
                </span>
              )}
            </h1>

            <div className="product-rating">
              <span className="stars">
                ★★★★★
              </span>
              <span className="rating-text">4.5</span>
              <span className="review-count">12 Reviews</span>
            </div>

            <div className="product-price">
              <span className="current-price">R {selectedVariant ? (selectedVariant.price || product.price) : product.price}</span>
            </div>

            {variants.length > 1 && (
              <div style={{ margin: '20px 0 16px 0' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 10, color: '#2c3e50' }}>Select Colour:</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {variants.map(v => {
                    const isSelected = selectedVariant?.id === v.id;
                    const variantStock = v.raw?.stock_quantity ?? 0;
                    const isOutOfStock = variantStock === 0;
                    return (
                      <button
                        key={v.id}
                        onClick={() => { 
                          if (!isOutOfStock) {
                            setSelectedVariant(v); 
                            setSelectedImage(v.image); 
                          }
                        }}
                        disabled={isOutOfStock}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #3498db' : '1px solid #d0d7de',
                          background: isOutOfStock ? '#f5f5f5' : (isSelected ? '#eaf6ff' : '#fff'),
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          opacity: isOutOfStock ? 0.6 : 1,
                          boxShadow: isSelected ? '0 0 0 2px rgba(52,152,219,0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        aria-pressed={isSelected}
                        aria-disabled={isOutOfStock}
                        title={isOutOfStock ? `${v.color} - Sold out` : v.color}
                      >
                        <span style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: v.color.toLowerCase(),
                          border: '1px solid #ccc'
                        }} />
                        <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>{v.color}</span>
                        {isOutOfStock && (
                          <span style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            background: '#e74c3c',
                            color: 'white',
                            fontSize: 9,
                            padding: '2px 5px',
                            borderRadius: 3,
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }}>
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="stock-info">
              {(() => {
                const displayStock = selectedVariant ? (selectedVariant.raw?.stock_quantity ?? product.stock_quantity) : product.stock_quantity;
                if (displayStock === 0) {
                  return (
                    <span className="out-of-stock" style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                      ✕ Sold out
                    </span>
                  );
                }
                if (displayStock > 0 && displayStock < 10) {
                  return (
                    <span className="low-stock" style={{ color: '#f39c12', fontWeight: 'bold' }}>
                      ⚡ Only {displayStock} left - order soon!
                    </span>
                  );
                }
                return <span className="in-stock">✓ In stock</span>;
              })()}
            </div>

            <div className="product-description">
              {product.fullDescription ? (
                <div>{formatDescription(product.fullDescription)}</div>
              ) : (
                <>
                  {formatDescription(product.description) || <p>High-quality baby product designed for comfort and safety. Perfect for your little one's needs.</p>}
                </>
              )}
            </div>

            {/* Rich Product Details from CJ - Formatted like image 2 */}
            {(product.product_material || product.product_features || product.package_size || product.packing_list || product.product_weight) && (
              <div className="product-specifications" style={{
                marginTop: '24px',
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e1e8ed'
              }}>
                <h3 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '18px', 
                  fontWeight: '700', 
                  color: '#2c3e50',
                  borderBottom: '2px solid #3498db',
                  paddingBottom: '10px'
                }}>
                  Product Specifications
                </h3>
                
                {/* Table format like CJ website */}
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  marginBottom: '20px'
                }}>
                  <tbody>
                    {product.product_material && (
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ 
                          padding: '12px 16px', 
                          width: '30%',
                          background: '#f8f9fa',
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#2c3e50'
                        }}>
                          Material
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '14px', 
                          color: '#555',
                          lineHeight: '1.6'
                        }}>
                          {product.product_material}
                        </td>
                      </tr>
                    )}
                    
                    {product.product_weight && (
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ 
                          padding: '12px 16px',
                          background: '#f8f9fa',
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#2c3e50'
                        }}>
                          Product Weight
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '14px', 
                          color: '#555'
                        }}>
                          {product.product_weight}
                        </td>
                      </tr>
                    )}
                    
                    {product.package_size && (
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ 
                          padding: '12px 16px',
                          background: '#f8f9fa',
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#2c3e50'
                        }}>
                          Package Size
                        </td>
                        <td style={{ 
                          padding: '12px 16px', 
                          fontSize: '14px', 
                          color: '#555',
                          lineHeight: '1.6'
                        }}>
                          {product.package_size}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                
                {/* Product Features - Formatted list */}
                {product.product_features && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#2c3e50'
                    }}>
                      Product features:
                    </h4>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#555', 
                      lineHeight: '1.8',
                      paddingLeft: '0'
                    }}>
                      {product.product_features.split('\n').map((line, idx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        
                        // Check if line starts with number (1. 2. 3.)
                        const isNumbered = /^\d+\./.test(trimmed);
                        
                        return (
                          <div key={idx} style={{ 
                            marginBottom: '4px',
                            paddingLeft: isNumbered ? '0' : '0'
                          }}>
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Packing List - Formatted list */}
                {product.packing_list && (
                  <div>
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#2c3e50'
                    }}>
                      Packing list:
                    </h4>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#555', 
                      lineHeight: '1.8'
                    }}>
                      {product.packing_list.split('\n').map((item, idx) => {
                        const trimmed = item.trim();
                        if (!trimmed) return null;
                        return (
                          <div key={idx} style={{ marginBottom: '4px' }}>
                            {trimmed}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="product-features">
              <ul>
                <li>✓ 6-Month Limited Warranty</li>
                <li>✓ Safe and tested for babies</li>
              </ul>
            </div>

            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button onClick={decrementQuantity} className="qty-btn">-</button>
                <span className="quantity-display">{quantity}</span>
                <button onClick={incrementQuantity} className="qty-btn">+</button>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="add-to-cart-btn" 
                onClick={handleAddToCart}
                disabled={(() => {
                  const displayStock = selectedVariant ? (selectedVariant.raw?.stock_quantity ?? product.stock_quantity) : product.stock_quantity;
                  return displayStock === 0;
                })()}
                style={{
                  opacity: (() => {
                    const displayStock = selectedVariant ? (selectedVariant.raw?.stock_quantity ?? product.stock_quantity) : product.stock_quantity;
                    return displayStock === 0 ? 0.5 : 1;
                  })(),
                  cursor: (() => {
                    const displayStock = selectedVariant ? (selectedVariant.raw?.stock_quantity ?? product.stock_quantity) : product.stock_quantity;
                    return displayStock === 0 ? 'not-allowed' : 'pointer';
                  })()
                }}
              >
                {(() => {
                  const displayStock = selectedVariant ? (selectedVariant.raw?.stock_quantity ?? product.stock_quantity) : product.stock_quantity;
                  return displayStock === 0 ? '✕ Sold out' : '🛒 Add to Cart';
                })()}
              </button>
              <button className="add-to-wishlist-btn">
                ♡ Add to List
              </button>
              {/* Keywords for Jeep Electric Car */}
              {product?.id === 8 && (
                <div style={{margin: '18px 0 0 0', padding: '12px', background: '#f9f9f9', borderRadius: '8px'}}>
                  <strong>Keywords:</strong>
                  <div style={{marginTop: '8px', fontSize: '0.95em', color: '#555'}}>
                    kids electric ride-on jeep, battery-powered toy car, kids 12V jeep South Africa, rechargeable kids jeep, remote control kids car, electric jeep blue, outdoor toy vehicle, boys ride-on car, Takealot kids jeep.
                  </div>
                </div>
              )}
            </div>

            <div className="delivery-info">
              <div className="delivery-row">
                <span className="label">Estimated Delivery:</span>
                <span className="value">20 October - 22 October</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
