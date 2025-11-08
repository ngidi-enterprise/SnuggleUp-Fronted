import React, { useState, useEffect } from 'react';
import './App.css';
import CheckoutSuccess from './CheckoutSuccess';
import CheckoutCancel from './CheckoutCancel';
import Login from './components/Login';
import Register from './components/Register';
import UserAccount from './components/UserAccount';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProductDetail from './components/ProductDetail';
import CJCatalog from './components/CJCatalog';
import CJProductDetail from './components/CJProductDetail';
import AdminDashboard from './components/AdminDashboard';
import PromoPopup from './components/PromoPopup';
import { useAuth } from './context/AuthContext';
import { trackPageView, trackAddToCart, trackRemoveFromCart, trackBeginCheckout } from './lib/analytics';

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot-password', 'reset-password'
  const [showUserAccount, setShowUserAccount] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isStorePreviewActive, setIsStorePreviewActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCjPid, setSelectedCjPid] = useState(null);
  const [cjQuery, setCjQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  
  const { user, token, isAuthenticated } = useAuth();

  // Show promo popup until user makes their first purchase (but not for admins)
  useEffect(() => {
    // Check if user is admin
    const ADMIN_EMAILS = ['support@snuggleup.co.za'];
    const isUserAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
    
    const hasMadePurchase = localStorage.getItem('hasMadeFirstPurchase');
    
    // Don't show popup if user is admin or has made a purchase
    if (!hasMadePurchase && !isUserAdmin) {
      // Show popup after 1 second delay for better UX
      const timer = setTimeout(() => {
        setShowPromoPopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // SPA routing: update currentPage and authView on navigation
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash.replace(/^#/, '');
      // Normalize: if opened directly on a path without hash, switch to hash routing for SPA
      if (!hash && (path.startsWith('/forgot-password') || path.startsWith('/reset-password'))) {
        window.location.hash = path + (window.location.search || '');
        return; // wait for hashchange to re-run
      }
      const route = hash || path;
      if (route.includes('/checkout/success')) {
        setCurrentPage('success');
        trackPageView('/checkout/success', 'Checkout Success');
      } else if (route.includes('/checkout/cancel')) {
        setCurrentPage('cancel');
        trackPageView('/checkout/cancel', 'Checkout Cancelled');
      } else if (route.startsWith('/forgot-password')) {
        setCurrentPage('home');
        setAuthView('forgot-password');
        setShowAuthModal(true);
        trackPageView('/forgot-password', 'Forgot Password');
      } else if (route.startsWith('/reset-password')) {
        setCurrentPage('home');
        setAuthView('reset-password');
        setShowAuthModal(true);
        trackPageView('/reset-password', 'Reset Password');
      } else if (route.startsWith('/cj')) {
        // Treat /cj as home — CJ catalog is the home page now
        setCurrentPage('home');
        trackPageView('/', 'Home - Baby Products');
      } else {
        setCurrentPage('home');
        trackPageView('/', 'Home - Baby Products');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated) {
        setIsAdmin(false);
        setShowAdminDashboard(false); // Close admin dashboard when logged out
        return;
      }

      // Hardcoded admin emails (frontend check)
      const ADMIN_EMAILS = ['support@snuggleup.co.za'];
      if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        console.log('✅ Hardcoded admin detected:', user.email);
        setIsAdmin(true);
        setShowAdminDashboard(true); // Open admin view immediately for hardcoded admins
        return;
      }

      // Fallback: try backend check if token exists
      if (!token) {
        setIsAdmin(false);
        return;
      }

      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';
        const res = await fetch(`${API_BASE}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // If we can access admin endpoint, user is admin
        setIsAdmin(res.ok);
        setShowAdminDashboard(res.ok); // Open admin view immediately when backend confirms admin
      } catch {
        setIsAdmin(false);
        setShowAdminDashboard(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, token, user]);

  // NOTE: Do not return early before all hooks run. Route-based returns are moved below hooks.

  // We keep hero header but CJ catalog is now the main store.
  // Remove local product sections entirely.
  const allProductsFlat = [];

  // Inject JSON-LD for all products, Organization, and BreadcrumbList (SEO, invisible to customers)
  useEffect(() => {
    try {
      // Product nodes
      const productNodes = allProductsFlat.map((p) => {
        const descSource = p.fullDescription || p.description || '';
        const description = String(descSource).replace(/\s+/g, ' ').trim().slice(0, 300);
        const images = [p.image, ...(Array.isArray(p.altImages) ? p.altImages : [])].filter(Boolean);
        const node = {
          "@type": "Product",
          name: p.name,
          description,
          image: images,
          sku: `prod-${p.id}`,
          category: p.category,
          brand: { "@type": "Brand", name: "SnuggleUp" },
          offers: {
            "@type": "Offer",
            priceCurrency: "ZAR",
            price: String(p.price),
            availability: "https://schema.org/InStock"
          }
        };
        if (p.keywords) {
          node.keywords = Array.isArray(p.keywords) ? p.keywords.join(', ') : String(p.keywords);
        }
        return node;
      });

      // Organization node (placeholder values)
      const organizationNode = {
        "@type": "Organization",
        name: "SnuggleUp",
        url: "https://snuggleup.co.za/",
        logo: "https://via.placeholder.com/200x60?text=SnuggleUp+Logo",
        email: "support@snuggleup.co.za",
        contactPoint: [{
          "@type": "ContactPoint",        
          contactType: "customer support",
          email: "support@snuggleup.co.za"
        }],
        sameAs: [
          "https://www.facebook.com/placeholder",
          "https://www.instagram.com/placeholder"
        ]
      };

      // BreadcrumbList node (for all products, placeholder URLs)
      const breadcrumbNodes = allProductsFlat.map((p) => ({
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://snuggleup.co.za/"
          },
          {
            "@type": "ListItem",
            position: 2,
            name: p.category.charAt(0).toUpperCase() + p.category.slice(1),
            item: `https://snuggleup.co.za/category/${encodeURIComponent(p.category)}`
          },
          {
            "@type": "ListItem",
            position: 3,
            name: p.name,
            item: `https://snuggleup.co.za/product/${encodeURIComponent(p.name.replace(/\s+/g, '-').toLowerCase())}`
          }
        ]
      }));

      const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [organizationNode, ...productNodes, ...breadcrumbNodes]
      };

      const scriptId = 'jsonld-products';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = scriptId;
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(jsonLd);
    } catch (err) {
      console.error('JSON-LD injection failed:', err);
    }
    // We only need to inject once on mount; products are static at runtime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safe route-based early returns after hooks have been declared
  if (currentPage === 'success') {
    return <CheckoutSuccess />;
  }
  if (currentPage === 'cancel') {
    return <CheckoutCancel />;
  }
  // Home now shows CJ catalog (handled after helper functions are defined)

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
    
    setCartCount(cartCount + 1);
    
    // Track add to cart event
    trackAddToCart(product, 1);
  };

  const removeFromCart = (productId) => {
    const item = cartItems.find(item => item.id === productId);
    if (item && item.quantity > 1) {
      setCartItems(cartItems.map(item => 
        item.id === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
      setCartCount(cartCount - 1);
      trackRemoveFromCart(item, 1);
    } else {
      setCartItems(cartItems.filter(item => item.id !== productId));
      setCartCount(cartCount - (item ? item.quantity : 0));
      if (item) trackRemoveFromCart(item, item.quantity);
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getShippingCost = () => {
    if (cartItems.length === 0) return 0;
    // If we have a selected real-time shipping option use it
    if (selectedShipping && typeof selectedShipping.costZAR === 'number') {
      // Free shipping promotion still applies over R800 (optional)
      const subtotal = getSubtotal();
      if (subtotal >= 800) return 0;
      return selectedShipping.costZAR;
    }
    // Fallback flat policy
    const subtotal = getSubtotal();
    return subtotal >= 800 ? 0 : 99;
  };

  const getDiscount = () => {
    return appliedVoucher ? appliedVoucher.value : 0;
  };

  const getTotalPrice = () => {
    const total = getSubtotal() + getShippingCost() - getDiscount();
    return total > 0 ? total : 0;
  };

  const applyVoucher = () => {
    // Define available vouchers (in production, this would come from backend)
    const vouchers = {
      'SAVE10': { code: 'SAVE10', value: 10, description: 'R10 off' },
      'SAVE50': { code: 'SAVE50', value: 50, description: 'R50 off' },
      'SAVE100': { code: 'SAVE100', value: 100, description: 'R100 off' },
      'WELCOME20': { code: 'WELCOME20', value: 20, description: 'R20 off for new customers' }
    };

    const voucher = vouchers[voucherCode.toUpperCase()];
    
    if (voucher) {
      setAppliedVoucher(voucher);
      setVoucherError('');
      setVoucherCode('');
    } else {
      setVoucherError('Invalid voucher code');
      setAppliedVoucher(null);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchTerm(v);
    // Pipe header search into CJ catalog query
    setCjQuery(v);
  };

  const filteredProducts = (productArray) => {
    if (!searchTerm) return productArray;
    return productArray.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handlePromoSignup = (data) => {
    // Don't mark as permanently dismissed - let it show again until purchase
    
    // Open registration modal with pre-filled email
    setAuthView('register');
    setShowAuthModal(true);
    
    // Store email for pre-filling (you can access this in Register component via props if needed)
    sessionStorage.setItem('promoEmail', data.email);
    sessionStorage.setItem('promoName', `${data.firstName} ${data.lastName}`);
  };

  const handlePromoClose = () => {
    // Only close for this session, will show again on next visit until purchase is made
    setShowPromoPopup(false);
  };

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!isAuthenticated) {
      setShowCart(false);
      setAuthView('login');
      setShowAuthModal(true);
      alert('Please login or create an account to continue with checkout.');
      return;
    }

    // Validate stock availability for all cart items
    try {
      const stockCheckPromises = cartItems.map(async (item) => {
        // Extract product ID from cart item ID (format: "curated-123")
        const productId = item.id.toString().replace('curated-', '');
        
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com'}/api/products/${productId}`);
          if (!response.ok) return { item, available: false, reason: 'Product not found' };
          
          const { product } = await response.json();
          const stockQuantity = product.stock_quantity || 0;
          
          if (stockQuantity === 0) {
            return { item, available: false, reason: 'Sold Out' };
          }
          
          if (stockQuantity < item.quantity) {
            return { item, available: false, reason: `Only ${stockQuantity} available, you have ${item.quantity} in cart` };
          }
          
          return { item, available: true };
        } catch (err) {
          return { item, available: false, reason: 'Unable to verify stock' };
        }
      });

      const stockResults = await Promise.all(stockCheckPromises);
      const unavailableItems = stockResults.filter(r => !r.available);

      if (unavailableItems.length > 0) {
        const itemsList = unavailableItems.map(r => `• ${r.item.name}: ${r.reason}`).join('\n');
        alert(`⚠️ Some items in your cart are no longer available:\n\n${itemsList}\n\nPlease update your cart and try again.`);
        return;
      }
    } catch (error) {
      console.error('Stock validation error:', error);
      alert('Unable to verify product availability. Please try again.');
      return;
    }

    // Track begin checkout event
    trackBeginCheckout(cartItems, getTotalPrice());

    try {
      // Save cart to localStorage for recovery if payment fails
      localStorage.setItem('cart', JSON.stringify(cartItems));

      const response = await fetch('https://snuggleup-backend.onrender.com/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: getTotalPrice(),
          email: user.email,
          orderItems: cartItems,
          subtotal: getSubtotal(),
          shipping: getShippingCost(),
          discount: getDiscount(),
          shippingMethod: selectedShipping?.logisticName || 'STANDARD',
          shippingQuoted: selectedShipping?.costZAR || getShippingCost()
        })
      });

      if (!response.ok) {
        // Try to read JSON error if available
        let msg = 'Payment creation failed';
        try {
          const errorData = await response.json();
          msg = errorData.error || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!data.paymentUrl) throw new Error('Payment URL missing from server response');
        // Redirect to PayFast URL
        window.location.href = data.paymentUrl;
      } else {
        const html = await response.text();
        // Write the PayFast form to the current window and auto-submit
        document.open();
        document.write(html);
        document.close();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Connection error. Please check if the backend server is running.');
    }
  };

  // Fetch real-time shipping quotes from backend (called when cart opens or changes)
  useEffect(() => {
    const fetchQuotes = async () => {
      if (!showCart || cartItems.length === 0) return; // only fetch when cart visible
      setShippingLoading(true);
      setShippingError('');
      try {
        const body = {
          items: cartItems.map(ci => ({ id: ci.id, quantity: ci.quantity })),
          countryCode: 'ZA', // store only shipping ZA currently
        };
        const res = await fetch(`${import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com'}/api/cj/shipping/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Quote request failed');
        }
        const data = await res.json();
        const opts = data.options || [];
        setShippingOptions(opts);
        // Auto-select cheapest option if none chosen yet
        if (!selectedShipping && opts.length > 0) {
          const cheapest = [...opts].sort((a,b) => a.costZAR - b.costZAR)[0];
          setSelectedShipping(cheapest);
        }
      } catch (e) {
        setShippingError(e.message);
      } finally {
        setShippingLoading(false);
      }
    };
    fetchQuotes();
  }, [showCart, cartItems]);

  // If CJ route, render CJ catalog page (now that helpers are defined)
  if (currentPage === 'cj') {
    // Local helper to add items to cart while in CJ view
    const addToCartCj = (product) => {
      setCartItems((prev) => {
        const existing = prev.find((i) => i.id === product.id);
        if (existing) {
          return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
      setCartCount((c) => c + 1);
    };

    return (
      <div className="app">
        {/* Header (light) */}
        <header className="header">
          <div className="logo-section">
            <div className="logo">
              <img src="https://i.postimg.cc/WpCQvsq5/Snuggle-Up-Logo.png" alt="SnuggleUp Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 12 }} />
            </div>
            <div className="brand-info">
              <h1>SnuggleUp</h1>
              <p>Baby essentials for modern parents</p>
            </div>
          </div>
          <div className="header-right">
            <button className="login-btn" onClick={() => { window.location.hash = ''; }}>
              Home
            </button>
            <button className="checkout-btn" onClick={() => setShowCart(true)}>
              Checkout
              <div className="cart-count">{cartCount}</div>
            </button>
          </div>
        </header>

        {(() => {
          console.log('🔍 Rendering CJCatalog on CJ route with isAdmin:', isAdmin, 'user:', user?.email);
          return null;
        })()}
        <CJCatalog 
          onBack={() => { window.location.hash = ''; }}
          onOpenProduct={(pid) => setSelectedCjPid(pid)}
          isAdmin={isAdmin}
        />

        {selectedCjPid && (
          <CJProductDetail
            pid={selectedCjPid}
            onClose={() => setSelectedCjPid(null)}
            onAddToCart={addToCartCj}
          />
        )}

        {/* Shopping Cart Modal (reuse) */}
        {showCart && (
          <div className="cart-overlay" onClick={() => setShowCart(false)}>
            <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cart-header">
                <h3>Shopping Cart ({cartCount} items)</h3>
                <button className="close-cart" onClick={() => setShowCart(false)}>✕</button>
              </div>
              <div className="cart-items">
                {cartItems.length === 0 ? (
                  <p className="empty-cart">Your cart is empty</p>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                      <img src={item.image} alt={item.name} className="cart-item-image" />
                      <div className="cart-item-details">
                        <h4>{item.name}</h4>
                        <p>R{item.price} each</p>
                        <div className="quantity-controls">
                          <button onClick={() => removeFromCart(item.id)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addToCartCj(item)}>+</button>
                        </div>
                      </div>
                      <div className="cart-item-total">
                        R{item.price * item.quantity}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cartItems.length > 0 && (
                <div className="cart-footer">
                  <div className="cart-total">
                    {/* Real-time shipping options */}
                    <div style={{marginBottom: '8px'}}>
                      {shippingLoading ? (
                        <p>Getting shipping options…</p>
                      ) : shippingError ? (
                        <p style={{color:'#dc3545'}}>Shipping quote unavailable — using standard policy.</p>
                      ) : (
                        shippingOptions.length > 0 && (
                          <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                            <label style={{fontSize:'0.9em'}}>Shipping method:</label>
                            <select
                              value={selectedShipping?.logisticName || ''}
                              onChange={(e) => {
                                const opt = shippingOptions.find(o => o.logisticName === e.target.value);
                                setSelectedShipping(opt || null);
                              }}
                              style={{padding:'6px 8px'}}
                            >
                              {shippingOptions.map(o => (
                                <option key={o.logisticName} value={o.logisticName}>
                                  {o.logisticName} — R{o.costZAR.toFixed(2)}{o.deliveryDay ? ` (~${o.deliveryDay} days)` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      )}
                    </div>
                    <p style={{marginBottom: '8px'}}>Subtotal: R{getSubtotal()}</p>
                    <p style={{marginBottom: '8px'}}>Shipping: R{getShippingCost()}</p>
                    {appliedVoucher && (
                      <p style={{marginBottom: '8px', color: '#28a745'}}>
                        Discount ({appliedVoucher.code}): -R{appliedVoucher.value}
                        <button 
                          onClick={removeVoucher}
                          style={{marginLeft: '8px', background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9em'}}
                        >
                          ✕
                        </button>
                      </p>
                    )}
                    {getSubtotal() >= 700 && getSubtotal() < 800 && (
                      <p style={{color: '#ff6600', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9em'}}>
                        🎉 Add R{(800 - getSubtotal()).toFixed(2)} more and get FREE shipping!
                      </p>
                    )}
                    <strong>Total: R{getTotalPrice()}</strong>
                  </div>
                  {!appliedVoucher && (
                    <div style={{marginTop: '12px', marginBottom: '12px'}}>
                      <input type="text" placeholder="Enter voucher code" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} style={{padding: '8px', width: '60%', border: '1px solid #ccc', borderRadius: '4px'}} />
                      <button onClick={applyVoucher} style={{padding: '8px 16px', marginLeft: '8px', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Apply</button>
                      {voucherError && (<p style={{color: '#dc3545', fontSize: '0.85em', marginTop: '4px'}}>{voucherError}</p>)}
                    </div>
                  )}
                  <button className="proceed-checkout" onClick={handleCheckout}>Proceed to PayFast Checkout</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo">
            <img src="https://i.postimg.cc/WpCQvsq5/Snuggle-Up-Logo.png" alt="SnuggleUp Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 12 }} />
          </div>
          <div className="brand-info">
            <h1>SnuggleUp</h1>
            <p>Baby essentials for modern parents</p>
          </div>
        </div>
        <div className="header-right">
          {isAuthenticated ? (
            <button 
              className="account-btn" 
              onClick={() => setShowUserAccount(true)}
              title="My Account"
            >
              👤 {user?.name}
            </button>
          ) : (
            <button 
              className="login-btn" 
              onClick={() => { setAuthView('login'); setShowAuthModal(true); }}
            >
              Login
            </button>
          )}
          <button className="checkout-btn" onClick={toggleCart}>
            Checkout
            <div className="cart-count">{cartCount}</div>
          </button>
        </div>
      </header>

      {/* Admin Dashboard (overlays store when active) */}
      {(() => {
        console.log('📊 showAdminDashboard state:', showAdminDashboard, 'isAdmin:', isAdmin);
        return null;
      })()}
      {showAdminDashboard && (
        <AdminDashboard 
          onClose={() => setShowAdminDashboard(false)} 
          onStorePreview={(isActive) => setIsStorePreviewActive(isActive)}
        />
      )}

      {/* Show store content ONLY when admin dashboard is showing store preview OR admin is completely closed */}
      {(!showAdminDashboard || (showAdminDashboard && isStorePreviewActive)) && (
        <div style={{
          marginLeft: showAdminDashboard && isStorePreviewActive ? '260px' : '0',
          minHeight: 'calc(100vh - 88px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Hero Section removed as CJ Catalog is now the homepage */}

          {/* CJ Catalog as main store */}
          <div id="cj-anchor" style={{ flex: '1 0 auto' }}>
            {(() => {
              console.log('🔍 Rendering CJCatalog on main route with isAdmin:', isAdmin, 'user:', user?.email);
              return null;
            })()}
            <CJCatalog 
              query={cjQuery}
              onQueryChange={setCjQuery}
              onBack={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onOpenProduct={(pid) => setSelectedCjPid(pid)}
              isAdmin={isAdmin}
            />

            {selectedCjPid && (
              <CJProductDetail
                pid={selectedCjPid}
                onClose={() => setSelectedCjPid(null)}
                onAddToCart={addToCart}
              />
            )}
          </div>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showCart && (
        <div className="cart-overlay" onClick={toggleCart}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Shopping Cart ({cartCount} items)</h3>
              <button className="close-cart" onClick={toggleCart}>✕</button>
            </div>
            <div className="cart-items">
              {cartItems.length === 0 ? (
                <p className="empty-cart">Your cart is empty</p>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.image} alt={item.name} className="cart-item-image" />
                    <div className="cart-item-details">
                      <h4>{item.name}</h4>
                      <p>R{item.price} each</p>
                      <div className="quantity-controls">
                        <button onClick={() => removeFromCart(item.id)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => addToCart(item)}>+</button>
                      </div>
                    </div>
                    <div className="cart-item-total">
                      R{item.price * item.quantity}
                    </div>
                  </div>
                ))
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  {/* Real-time shipping options */}
                  <div style={{marginBottom: '8px'}}>
                    {shippingLoading ? (
                      <p>Getting shipping options…</p>
                    ) : shippingError ? (
                      <p style={{color:'#dc3545'}}>Shipping quote unavailable — using standard policy.</p>
                    ) : (
                      shippingOptions.length > 0 && (
                        <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                          <label style={{fontSize:'0.9em'}}>Shipping method:</label>
                          <select
                            value={selectedShipping?.logisticName || ''}
                            onChange={(e) => {
                              const opt = shippingOptions.find(o => o.logisticName === e.target.value);
                              setSelectedShipping(opt || null);
                            }}
                            style={{padding:'6px 8px'}}
                          >
                            {shippingOptions.map(o => (
                              <option key={o.logisticName} value={o.logisticName}>
                                {o.logisticName} — R{o.costZAR.toFixed(2)}{o.deliveryDay ? ` (~${o.deliveryDay} days)` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>
                  <p style={{marginBottom: '8px'}}>Subtotal: R{getSubtotal()}</p>
                  <p style={{marginBottom: '8px'}}>Shipping: R{getShippingCost()}</p>
                  {appliedVoucher && (
                    <p style={{marginBottom: '8px', color: '#28a745'}}>
                      Discount ({appliedVoucher.code}): -R{appliedVoucher.value}
                      <button 
                        onClick={removeVoucher}
                        style={{marginLeft: '8px', background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9em'}}
                      >
                        ✕
                      </button>
                    </p>
                  )}
                  {getSubtotal() >= 700 && getSubtotal() < 800 && (
                    <p style={{color: '#ff6600', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9em'}}>
                      🎉 Add R{(800 - getSubtotal()).toFixed(2)} more and get FREE shipping!
                    </p>
                  )}
                  <strong>Total: R{getTotalPrice()}</strong>
                </div>
                
                {!appliedVoucher && (
                  <div style={{marginTop: '12px', marginBottom: '12px'}}>
                    <input
                      type="text"
                      placeholder="Enter voucher code"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      style={{padding: '8px', width: '60%', border: '1px solid #ccc', borderRadius: '4px'}}
                    />
                    <button
                      onClick={applyVoucher}
                      style={{padding: '8px 16px', marginLeft: '8px', background: '#ff6600', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                    >
                      Apply
                    </button>
                    {voucherError && (
                      <p style={{color: '#dc3545', fontSize: '0.85em', marginTop: '4px'}}>{voucherError}</p>
                    )}
                  </div>
                )}
                
                <button className="proceed-checkout" onClick={handleCheckout}>
                  Proceed to PayFast Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="cart-overlay" onClick={() => { setShowAuthModal(false); window.location.hash = ''; }}>
          <div onClick={(e) => e.stopPropagation()}>
            {authView === 'login' ? (
              <Login 
                onClose={() => { setShowAuthModal(false); window.location.hash = ''; }}
                onSwitchToRegister={() => setAuthView('register')}
              />
            ) : authView === 'register' ? (
              <Register 
                onClose={() => { setShowAuthModal(false); window.location.hash = ''; }}
                onSwitchToLogin={() => setAuthView('login')}
              />
            ) : authView === 'forgot-password' ? (
              <ForgotPassword 
                onClose={() => { setShowAuthModal(false); window.location.hash = ''; }}
                onBackToLogin={() => setAuthView('login')}
              />
            ) : authView === 'reset-password' ? (
              <ResetPassword 
                onClose={() => { setShowAuthModal(false); window.location.hash = ''; }}
                onBackToLogin={() => setAuthView('login')}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* User Account Modal */}
      {showUserAccount && (
        <UserAccount onClose={() => setShowUserAccount(false)} />
      )}

      {/* Promo Popup */}
      {showPromoPopup && (
        <PromoPopup 
          onClose={handlePromoClose}
          onSignup={handlePromoSignup}
        />
      )}

      {/* Footer */}
      <footer className="footer" style={{ flexShrink: 0 }}>
        <p>© 2025 SnuggleUp</p>
        <p>Made with <span className="heart">❤️</span> for all parents. Free local delivery over R800.</p>
        <p>Contact: support@snuggleup.co.za </p>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #555' }}>
          <p style={{ fontSize: '0.85em', color: '#999', marginBottom: '0.75rem' }}>Secure payments powered by</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <img 
              src="https://www.payfast.co.za/images/logo.png" 
              alt="PayFast Secure Payments" 
              style={{ height: '32px', opacity: 0.8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 12px', background: 'white', borderRadius: '4px' }}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                alt="Visa" 
                style={{ height: '20px' }}
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
                alt="Mastercard" 
                style={{ height: '24px' }}
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" 
                alt="American Express" 
                style={{ height: '20px' }}
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;