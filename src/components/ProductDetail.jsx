import React, { useState } from 'react';
import './ProductDetail.css';

function ProductDetail({ product, onClose, onAddToCart, allProducts }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [showAddedToCart, setShowAddedToCart] = useState(false);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product);
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
              <img 
                src={product.image} 
                alt={product.name}
                className={selectedImage === product.image ? 'active' : ''}
                onClick={() => setSelectedImage(product.image)}
              />
              {/* Show alternate images if present */}
              {product.altImages && product.altImages.map((img, idx) => (
                <img
                  key={img}
                  src={img}
                  alt={product.name + ' alternate ' + (idx + 1)}
                  className={selectedImage === img ? 'active' : ''}
                  onClick={() => setSelectedImage(img)}
                  style={{marginLeft: '8px'}}
                />
              ))}
            </div>
          </div>

          {/* Right side - Product Info */}
          <div className="product-info">
            <div className="breadcrumb">
              <span>Beauty</span> / <span>{product.category}</span>
            </div>

            <h1 className="product-title">{product.name}</h1>

            <div className="product-rating">
              <span className="stars">
                ★★★★★
              </span>
              <span className="rating-text">4.5</span>
              <span className="review-count">12 Reviews</span>
            </div>

            <div className="product-price">
              <span className="current-price">R {product.price}</span>
            </div>

            <div className="stock-info">
              {product.stock_quantity === 0 && (
                <span className="out-of-stock" style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                  ✕ Out of Stock
                </span>
              )}
              {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                <span className="low-stock" style={{ color: '#f39c12', fontWeight: 'bold' }}>
                  ⚡ Only {product.stock_quantity} left - order soon!
                </span>
              )}
              {product.stock_quantity >= 10 && (
                <span className="in-stock">✓ In stock</span>
              )}
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
                disabled={product.stock_quantity === 0}
                style={{
                  opacity: product.stock_quantity === 0 ? 0.5 : 1,
                  cursor: product.stock_quantity === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {product.stock_quantity === 0 ? '✕ Out of Stock' : '🛒 Add to Cart'}
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
