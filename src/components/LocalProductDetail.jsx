import React, { useState, useMemo, useEffect } from 'react';
import './LocalProductDetail.css';

function LocalProductDetail({ product, onClose, onAddToCart, allProducts }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.images?.[0] || product.product_image);
  const [showAddedToCart, setShowAddedToCart] = useState(false);

  // Gallery images from local product
  const galleryImages = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    return [product.product_image || product.image].filter(Boolean);
  }, [product]);

  useEffect(() => {
    if (galleryImages.length > 0) {
      setSelectedImage(galleryImages[0]);
    }
  }, [galleryImages]);

  const handleAddToCart = () => {
    const cartItem = {
      ...product,
      isLocal: true, // Mark as local product
      id: product.id,
      name: product.name || product.product_name,
      image: selectedImage,
      price: parseFloat(product.price) || 0,
      stock_quantity: product.stock_quantity
    };

    for (let i = 0; i < quantity; i++) {
      onAddToCart(cartItem);
    }
    setShowAddedToCart(true);

    // Auto-reset after 2s
    setTimeout(() => setShowAddedToCart(false), 2000);
  };

  const handleGoToCart = () => {
    onClose();
  };

  const handleContinueShopping = () => {
    setShowAddedToCart(false);
    setQuantity(1);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

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
      return paras.map((p, i) => <p key={i} style={{ marginTop: i === 0 ? 0 : 8, lineHeight: 1.45 }}>{p}</p>);
    } catch (e) {
      return <p>{String(input)}</p>;
    }
  };

  const inStock = product.stock_quantity > 0;
  const price = parseFloat(product.price) || 0;
  const comparePrice = parseFloat(product.compare_at_price) || 0;
  const onSale = comparePrice && comparePrice > price;
  const discount = onSale ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="local-product-detail-page">
      <div className="product-detail-header">
        <button className="back-button" onClick={onClose}>
          ← Back to Products
        </button>
      </div>

      <div className="product-detail-container">
        {showAddedToCart ? (
          // Added to Cart Confirmation
          <div className="added-to-cart-confirmation">
            <div className="confirmation-content">
              <div className="checkmark-circle">✓</div>
              <h2>Added to Cart!</h2>
              <p>{product.name}</p>
              <p className="quantity-text">Quantity: {quantity}</p>
              <div className="confirmation-buttons">
                <button className="btn-continue" onClick={handleContinueShopping}>
                  Continue Shopping
                </button>
                <button className="btn-go-cart" onClick={handleGoToCart}>
                  Go to Cart
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Product Detail View
          <div className="product-detail-body">
            {/* Left: Image Gallery */}
            <div className="product-gallery">
              <div className="gallery-main">
                <div className="local-product-badge">
                  ⚡ FAST SHIPPING
                </div>
                {onSale && discount > 0 && (
                  <div className="discount-badge">-{discount}%</div>
                )}
                <img src={selectedImage} alt={product.name} />
                {!inStock && (
                  <div className="out-of-stock-overlay">
                    <span>OUT OF STOCK</span>
                  </div>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="gallery-thumbnails">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      className={`thumbnail ${selectedImage === img ? 'active' : ''}`}
                      onClick={() => setSelectedImage(img)}
                      title={`Image ${idx + 1}`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="product-info">
              <div className="product-header">
                <h1>{product.name}</h1>
                {product.sku && <p className="sku">SKU: {product.sku}</p>}
              </div>

              {/* Pricing */}
              <div className="pricing-section">
                {onSale ? (
                  <>
                    <span className="price-original">R{comparePrice.toFixed(2)}</span>
                    <span className="price-current">R{price.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="price-current">R{price.toFixed(2)}</span>
                )}
              </div>

              {/* Fast Shipping Info */}
              <div className="fast-shipping-info">
                <div className="shipping-badge">⚡ Delivery in 2-3 Working Days</div>
                <p className="shipping-text">Local warehouse delivery. No international shipping delays.</p>
              </div>

              {/* Stock Status */}
              <div className={`stock-status ${inStock ? 'in-stock' : 'out-of-stock'}`}>
                {inStock ? (
                  <>
                    <span className="stock-icon">✓</span>
                    <span>{product.stock_quantity} in stock</span>
                  </>
                ) : (
                  <>
                    <span className="stock-icon">✗</span>
                    <span>Out of stock</span>
                  </>
                )}
              </div>

              {/* Quantity Selector */}
              {inStock && (
                <div className="quantity-selector">
                  <label>Quantity</label>
                  <div className="qty-control">
                    <button onClick={decrementQuantity} disabled={quantity === 1}>−</button>
                    <input type="number" value={quantity} readOnly />
                    <button onClick={incrementQuantity} disabled={quantity >= product.stock_quantity}>+</button>
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                className={`btn-add-to-cart ${!inStock ? 'disabled' : ''}`}
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                {inStock ? '🛒 Add to Cart' : 'Out of Stock'}
              </button>

              {/* Product Details */}
              {product.description && (
                <div className="product-description">
                  <h3>Description</h3>
                  <div className="description-text">
                    {formatDescription(product.description)}
                  </div>
                </div>
              )}

              {/* Product Meta */}
              <div className="product-meta">
                <div className="meta-row">
                  <span className="meta-label">📂 Category:</span>
                  <span className="meta-value">
                    {product.category ? product.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'General'}
                  </span>
                </div>

                {product.weight_kg && (
                  <div className="meta-row">
                    <span className="meta-label">⚖️ Weight:</span>
                    <span className="meta-value">{product.weight_kg} kg</span>
                  </div>
                )}

                {product.dimensions && (
                  <div className="meta-row">
                    <span className="meta-label">📏 Dimensions:</span>
                    <span className="meta-value">{product.dimensions}</span>
                  </div>
                )}

                {Array.isArray(product.tags) && product.tags.length > 0 && (
                  <div className="meta-row">
                    <span className="meta-label">🏷️ Tags:</span>
                    <div className="tags-list">
                      {product.tags.map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Product Info Banner */}
              <div className="local-product-info">
                <h4>✅ About This Local Product</h4>
                <ul>
                  <li>Shipped from our local warehouse</li>
                  <li>Delivery in 2-3 working days</li>
                  <li>No international shipping delays</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LocalProductDetail;
