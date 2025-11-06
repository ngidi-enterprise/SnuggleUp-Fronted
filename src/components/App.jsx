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
import { useAuth } from './context/AuthContext';

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot-password', 'reset-password'
  const [showUserAccount, setShowUserAccount] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCjPid, setSelectedCjPid] = useState(null);
  const [cjQuery, setCjQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { user, token, isAuthenticated } = useAuth();

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
      } else if (route.includes('/checkout/cancel')) {
        setCurrentPage('cancel');
      } else if (route.startsWith('/forgot-password')) {
        setCurrentPage('home');
        setAuthView('forgot-password');
        setShowAuthModal(true);
      } else if (route.startsWith('/reset-password')) {
        setCurrentPage('home');
        setAuthView('reset-password');
        setShowAuthModal(true);
      } else if (route.startsWith('/cj')) {
        // Treat /cj as home — CJ catalog is the home page now
        setCurrentPage('home');
      } else {
        setCurrentPage('home');
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
      if (!isAuthenticated || !token) {
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
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, token]);

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
    } else {
      setCartItems(cartItems.filter(item => item.id !== productId));
      setCartCount(cartCount - (item ? item.quantity : 0));
    }
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getShippingCost = () => {
    if (cartItems.length === 0) return 0;
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

  const handleCheckout = async () => {
    // Check if user is logged in
    if (!isAuthenticated) {
      setShowCart(false);
      setAuthView('login');
      setShowAuthModal(true);
      alert('Please login or create an account to continue with checkout.');
      return;
    }

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
          discount: getDiscount()
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

        <CJCatalog 
          onBack={() => { window.location.hash = ''; }}
          onOpenProduct={(pid) => setSelectedCjPid(pid)}
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

        {/* Footer */}
        <footer className="footer">
          <p>© 2025 SnuggleUp</p>
          <p>Made with <span className="heart">❤️</span> for all parents. Free local delivery over R800.</p>
          <p>Contact: support@snuggleup.co.za </p>
        </footer>
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
            <>
              {isAdmin && (
                <button 
                  className="admin-btn" 
                  onClick={() => setShowAdminDashboard(true)}
                  title="Admin Dashboard"
                  style={{ background: '#e74c3c', marginRight: 10 }}
                >
                  🛡️ Admin
                </button>
              )}
              <button 
                className="account-btn" 
                onClick={() => setShowUserAccount(true)}
                title="My Account"
              >
                👤 {user?.name}
              </button>
            </>
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

      {/* Hero Section removed as CJ Catalog is now the homepage */}

      {/* CJ Catalog as main store */}
      <div id="cj-anchor"></div>
      <CJCatalog 
        query={cjQuery}
        onQueryChange={setCjQuery}
        onBack={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenProduct={(pid) => setSelectedCjPid(pid)}
      />

      {selectedCjPid && (
        <CJProductDetail
          pid={selectedCjPid}
          onClose={() => setSelectedCjPid(null)}
          onAddToCart={addToCart}
        />
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

      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      )}



      {/* Footer */}
      <footer className="footer">
        <p>© 2025 SnuggleUp</p>
        <p>Made with <span className="heart">❤️</span> for all parents. Free local delivery over R800.</p>
        <p>Contact: support@snuggleup.co.za </p>
      </footer>
    </div>
  );
}

export default App;