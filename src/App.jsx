import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
// Brand logo asset path (place the provided PNG here): public/images/snuggleup-logo-brand.png
const BRAND_LOGO_SRC = '/images/snuggleup-logo-brand.png';
const formatMoney = (value) => Number(value || 0).toFixed(2);

const reconcileBundleSelections = (items, selections, bundles) => (
  (Array.isArray(selections) ? selections : []).map(selection => {
    const bundle = bundles.find(item => item.id === selection.id);
    if (!bundle) return null;
    const availableSets = Math.min(
      ...bundle.productIds.map(productId => {
        const cartItem = items.find(item => String(item.id) === String(productId));
        return Math.max(0, Number(cartItem?.quantity || 0));
      })
    );
    const quantity = Math.min(
      Math.max(0, Number(selection.quantity || 0)),
      availableSets
    );
    return quantity > 0 ? { id: selection.id, quantity } : null;
  }).filter(Boolean)
);
import CheckoutSuccess from './CheckoutSuccess';
import CheckoutCancel from './CheckoutCancel';
import Login from './components/Login';
import Register from './components/Register';
import UserAccount from './components/UserAccount';
import OrderTrackingLookup from './components/OrderTrackingLookup';
import SupplierPickupPage from './components/SupplierPickupPage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProductDetail from './components/ProductDetail';
import CJCatalog from './components/CJCatalog';
import CJProductDetail from './components/CJProductDetail';
import LocalProductsCatalog from './components/LocalProductsCatalog';
import LocalProductDetail from './components/LocalProductDetail';
import LocalBundleShowcase from './components/LocalBundleShowcase';
import FavouriteBrands from './components/FavouriteBrands';
import LocalProductUpload from './components/LocalProductUpload';
import AdminDashboard from './components/AdminDashboard';
 
import TrustBadges from './components/TrustBadges';
import PaymentMethodsStrip from './components/PaymentMethodsStrip';
import ShippingForm from './components/ShippingForm';
import MaintenanceMode from './components/MaintenanceMode';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataDeletion from './pages/DataDeletion';
import ShippingPolicy from './pages/ShippingPolicy';
import ReturnsPolicy from './pages/ReturnsPolicy';
import LearningCentre from './pages/LearningCentre';
import { useAuth } from './context/AuthContext';
import { trackPageView, trackProductClick, trackProductView, trackAddToCart, trackRemoveFromCart, trackBeginCheckout, trackPaymentStarted, setStorefrontAnalyticsPaused, setStorefrontAnalyticsAuthToken, getStorefrontAnalyticsIdentity } from './lib/analytics';
import { PAGE_SEO, setPageSeo } from './lib/seo';

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [learningSlug, setLearningSlug] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [shippingCountry, setShippingCountry] = useState('ZA');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [localDeliveryMode, setLocalDeliveryMode] = useState('economy');
  const [localShippingQuotes, setLocalShippingQuotes] = useState([]);
  const [selectedLocalShipping, setSelectedLocalShipping] = useState(null);
  const [localShippingLoading, setLocalShippingLoading] = useState(false);
  const [localShippingError, setLocalShippingError] = useState('');
  const [insuranceSelected, setInsuranceSelected] = useState(false);
  const [insuranceData, setInsuranceData] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot-password', 'reset-password'
  const [showUserAccount, setShowUserAccount] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [trackingRouteParams, setTrackingRouteParams] = useState({ orderNumber: '', token: '' });
  const [supplierPickupToken, setSupplierPickupToken] = useState('');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isStorePreviewActive, setIsStorePreviewActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCjPid, setSelectedCjPid] = useState(null);
  const [cjQuery, setCjQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAccess, setAdminAccess] = useState({
    role: 'customer',
    isSuperuser: false,
    isProductAssistant: false,
    canManageProducts: false,
    canApproveProducts: false
  });

  useEffect(() => {
    setStorefrontAnalyticsPaused(isAdmin || showAdminDashboard);
  }, [isAdmin, showAdminDashboard]);
  
  const [cartLoaded, setCartLoaded] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingFormData, setShippingFormData] = useState(null);
  const [backendDown, setBackendDown] = useState(false);
  const [localProductsCache, setLocalProductsCache] = useState([]);
  const [localBundles, setLocalBundles] = useState([]);
  const [bundleSelections, setBundleSelections] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cartBundles') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [backendCheckFailed, setBackendCheckFailed] = useState(0);
  const [lastFailureTime, setLastFailureTime] = useState(0);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [firstOrderEligible, setFirstOrderEligible] = useState(false);
  const [firstOrderEligibilityReady, setFirstOrderEligibilityReady] = useState(false);
  
  // Local Products State
  const [selectedLocalProductId, setSelectedLocalProductId] = useState(null);
  const [showLocalProductUpload, setShowLocalProductUpload] = useState(false);
  const [localProductsRefresh, setLocalProductsRefresh] = useState(0);
  const [catalogView, setCatalogView] = useState('local'); // 'cj' or 'local'
  const headerRef = useRef(null);
  
  // Wishlist state
  const [wishlistItems, setWishlistItems] = useState(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  
  const { user, token, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setStorefrontAnalyticsAuthToken(token);
  }, [token]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight;
      if (headerHeight) {
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [showAccountPrompt, isAuthenticated, showAdminDashboard, user?.email, cartCount, wishlistItems.length]);

  useEffect(() => {
    if (selectedCjPid || selectedLocalProductId) return;
    setPageSeo(PAGE_SEO[currentPage] || PAGE_SEO.home);
  }, [currentPage, selectedCjPid, selectedLocalProductId]);

  const normalizeCartItem = (product, quantity = 1) => {
    const safeId = product?.id ?? product?.sku ?? product?.pid ?? product?.name;
    const isLocal = Boolean(
      product?.isLocal ||
      product?.is_local ||
      product?.source === 'local' ||
      product?.type === 'local' ||
      product?.warehouseType === 'local'
    );
    return {
      ...product,
      id: safeId,
      name: product?.name || product?.product_name || 'Product',
      price: Number(product?.price || 0),
      image: product?.image || product?.images?.[0] || product?.product_image || '',
      stock_quantity: Number(product?.stock_quantity || product?.stock || 0),
      quantity: Math.max(1, Number(quantity || product?.quantity || 1)),
      isLocal
    };
  };

  const defaultDropBoxOptions = [
    {
      id: 'dropbox-rosebank',
      name: 'Rosebank Pickup Point',
      location: 'Rosebank, Johannesburg',
      priceZAR: 55,
      note: 'Open Mon–Sat · 8:00–18:00'
    },
    {
      id: 'dropbox-midrand',
      name: 'Midrand Pickup Point',
      location: 'Midrand, Gauteng',
      priceZAR: 65,
      note: 'Open Mon–Sat · 8:00–17:00'
    },
    {
      id: 'dropbox-cape-town',
      name: 'Cape Town Collection Hub',
      location: 'Goodwood, Cape Town',
      priceZAR: 75,
      note: 'Open Mon–Sat · 9:00–18:00'
    }
  ];

  const localDeliveryOptions = [
    {
      key: 'economy',
      label: 'Standard',
      subtitle: 'Flat rate',
      priceZAR: 99,
      meta: 'Best value · 3–5 business days'
    },
    {
      key: 'express',
      label: 'Express',
      subtitle: 'Live courier quote',
      priceZAR: null,
      meta: 'Next business day · courier handoff'
    },
    {
      key: 'pickup',
      label: 'Pick-up point',
      subtitle: 'Live courier quote',
      priceZAR: null,
      meta: 'Pick up at a partner location'
    }
  ];

  // Prefill shipping name from user profile when available (editable by user)
  const defaultCustomerName = (
    user?.name ||
    user?._sb?.user_metadata?.full_name ||
    user?._sb?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : '')
  ) || '';

  // API base URLs with automatic fallback (custom domain -> Render)
  const PRIMARY_API_BASE = (import.meta.env.VITE_API_BASE || '').trim();
  const FALLBACK_API_BASE = 'https://snuggleup-backend.onrender.com';
  const API_BASES = [...new Set([PRIMARY_API_BASE, FALLBACK_API_BASE].filter(Boolean))];
  const [apiBaseInUse, setApiBaseInUse] = useState(API_BASES[0] || FALLBACK_API_BASE);

  // Helper: fetch with fallback across API bases
  const fetchApi = async (path, options) => {
    let lastErr;
    for (const base of API_BASES) {
      try {
        const res = await fetch(`${base}${path}`, options);
        if (res.ok) {
          if (apiBaseInUse !== base) setApiBaseInUse(base);
          // Backend is responding - reset failure counter
          if (backendCheckFailed > 0) {
            setBackendCheckFailed(0);
            setBackendDown(false);
          }
          return res;
        }
        // gather error and try next base
        try {
          const errJson = await res.json();
          lastErr = new Error(errJson.error || `HTTP ${res.status}`);
        } catch {
          lastErr = new Error(`HTTP ${res.status}`);
        }
      } catch (e) {
        lastErr = e;
      }
    }
    // All bases failed - increment failure counter
    setBackendCheckFailed(prev => {
      const newCount = prev + 1;
      const now = Date.now();
      
      // Only show maintenance mode after 5+ consecutive failures
      // AND at least 10 seconds have passed since first failure
      if (newCount >= 5 && (now - lastFailureTime) >= 10000) {
        setBackendDown(true);
      }
      
      // Track first failure time
      if (newCount === 1) {
        setLastFailureTime(now);
      }
      
      return newCount;
    });
    throw lastErr || new Error('All API bases failed');
  };

  useEffect(() => {
    let cancelled = false;

    const checkEligibility = async () => {
      try {
        if (!isAuthenticated && localStorage.getItem('hasMadeFirstPurchase') === 'true') {
          if (!cancelled) {
            setFirstOrderEligible(false);
            setFirstOrderEligibilityReady(true);
          }
          return;
        }
      } catch {}

      try {
        const response = await fetchApi('/api/payments/first-order-eligibility', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await response.json();
        if (!cancelled) {
          setFirstOrderEligible(Boolean(data.eligible));
        }
      } catch (error) {
        console.warn('Could not verify first-order discount eligibility:', error);
        if (!cancelled) {
          setFirstOrderEligible(!isAuthenticated);
        }
      } finally {
        if (!cancelled) setFirstOrderEligibilityReady(true);
      }
    };

    checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    setShowAccountPrompt(
      firstOrderEligibilityReady
      && firstOrderEligible
      && !isAdmin
      && !showAdminDashboard
    );
  }, [
    firstOrderEligibilityReady,
    firstOrderEligible,
    isAdmin,
    showAdminDashboard,
  ]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    const identity = getStorefrontAnalyticsIdentity();
    fetch(`${API_BASES[0] || FALLBACK_API_BASE}/api/analytics/session-role`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(identity),
    }).catch(() => {});
  }, [token, isAdmin, adminAccess.role]);

  const pushProductPath = (path, replace = false) => {
    if (typeof window === 'undefined' || !path) return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === path) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  };

  const loadLocalProductById = async (id) => {
    setCatalogView('local');
    setSelectedCjPid(null);
    const response = await fetchApi(`/api/local-products/${id}`);
    if (!response.ok) throw new Error('Product not found');
    const data = await response.json();
    setSelectedLocalProductId(data);
    trackProductView({
      id: data.id || id,
      name: data.name || data.product_name,
      category: data.category || 'General',
    });
    return data;
  };

  const openCuratedProduct = (pid, options = {}) => {
    if (!pid) return;
    setCurrentPage('home');
    setCatalogView('cj');
    setSelectedLocalProductId(null);
    setSelectedCjPid(pid);
    pushProductPath(`/products/${pid}`, Boolean(options.replace));
    trackPageView(`/products/${pid}`, options.product?.name || options.product?.product_name || 'Product');
    if (options.product) trackProductClick(options.product);
    if (!options.skipScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLocalProduct = (product, options = {}) => {
    if (!product) return;
    const id = product.id || product.sku;
    setCurrentPage('home');
    setCatalogView('local');
    setSelectedCjPid(null);
    setSelectedLocalProductId(product);
    if (id) pushProductPath(`/local-products/${id}`, Boolean(options.replace));
    trackPageView(`/local-products/${id}`, product.name || product.product_name || 'Local Product');
    trackProductClick(product);
    trackProductView({
      id,
      name: product.name || product.product_name,
      category: product.category || 'General',
    });
    if (!options.skipScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeProductDetail = () => {
    setSelectedCjPid(null);
    setSelectedLocalProductId(null);
    if (typeof window !== 'undefined' && /^\/(local-)?products?\//.test(window.location.pathname)) {
      window.history.pushState({}, '', '/');
    }
  };

  // Save cart to backend (authenticated users only)
  const saveCartToBackend = async (items) => {
    if (!isAuthenticated || !token) return;
    
    try {
      const response = await fetchApi(`/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      
      if (!response.ok) {
        console.warn('⚠️ Failed to save cart to backend (status:', response.status, ')');
        if (response.status === 403) {
          console.warn('Token invalid while saving cart - logging out');
          try { logout(); } catch {};
        }
      } else {
        console.log('✅ Cart saved to backend successfully');
      }
    } catch (error) {
      console.error('❌ Failed to save cart to backend:', error);
    }
  };

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(item => normalizeCartItem(item, item.quantity || 1));
          setCartItems(normalized);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to restore cart from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.warn('⚠️ Failed to save cart to localStorage:', error);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('cartBundles', JSON.stringify(bundleSelections));
    } catch (error) {
      console.warn('Failed to save selected kits to localStorage:', error);
    }
  }, [bundleSelections]);

  useEffect(() => {
    if (localBundles.length === 0) return;
    setBundleSelections(currentSelections => {
      const reconciled = reconcileBundleSelections(
        cartItems,
        currentSelections,
        localBundles
      );
      return JSON.stringify(reconciled) === JSON.stringify(currentSelections)
        ? currentSelections
        : reconciled;
    });
  }, [cartItems, localBundles]);

  useEffect(() => {
    setCartCount(
      cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    );
  }, [cartItems]);

  // Load cart from backend (authenticated users only)
  const loadCartFromBackend = async () => {
    if (!isAuthenticated || !token) return null;
    
    try {
      const response = await fetchApi(`/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Cart loaded from backend:', data.items?.length || 0, 'items');
        return data.items || [];
      } else {
        console.warn('⚠️ Failed to load cart from backend (status:', response.status, ')');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to load cart from backend:', error);
      return [];
    }
  };

  // Load cart from backend when user logs in
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated && token && !cartLoaded) {
        console.log('🔄 Loading cart on login. Current local cart items:', cartItems.length);
        
        try {
          const backendCart = await loadCartFromBackend();
          console.log('📦 Backend cart loaded:', backendCart?.length || 0, 'items');
          
          // Capture current local cart at time of login
          const localCart = [...cartItems];
          console.log('🛒 Local cart at login:', localCart.length, 'items');
          
          // Always merge - even if backend is empty or fails, preserve local cart
          const mergedCart = [];
          const seenIds = new Set();
          
          // Add all backend items first (if any)
          if (backendCart && Array.isArray(backendCart) && backendCart.length > 0) {
            backendCart.forEach(item => {
              const normalizedItem = normalizeCartItem(item, item.quantity || 1);
              mergedCart.push(normalizedItem);
              seenIds.add(String(normalizedItem.id));
            });
          }
          
          // Add local items that aren't already in the merged cart
          localCart.forEach(localItem => {
            const normalizedLocalItem = normalizeCartItem(localItem, localItem.quantity || 1);
            const localId = String(normalizedLocalItem.id);
            if (!seenIds.has(localId)) {
              mergedCart.push(normalizedLocalItem);
              seenIds.add(localId);
            } else {
              // If item exists in both, prefer higher quantity
              const existingIndex = mergedCart.findIndex(item => String(item.id) === localId);
              if (existingIndex !== -1 && normalizedLocalItem.quantity > mergedCart[existingIndex].quantity) {
                mergedCart[existingIndex].quantity = normalizedLocalItem.quantity;
              }
            }
          });
          
          console.log('✅ Merged cart:', mergedCart.length, 'items');
          
          // ONLY update cart if we have items to show (never clear cart on login)
          if (mergedCart.length > 0) {
            setCartItems(mergedCart);
            setCartCount(mergedCart.reduce((sum, item) => sum + item.quantity, 0));
            
            // Try to save merged cart to backend (best effort, don't fail if it errors)
            await saveCartToBackend(mergedCart);
          } else if (localCart.length > 0) {
            // Edge case: if merge resulted in empty but local had items, keep local
            console.warn('⚠️ Merge produced empty cart but local had items. Keeping local cart.');
            setCartItems(localCart);
            setCartCount(localCart.reduce((sum, item) => sum + item.quantity, 0));
          }
        } catch (error) {
          console.error('❌ Error during cart load/merge:', error);
          // On error, keep the local cart as-is (don't clear it)
        }
        
        setCartLoaded(true);
      } else if (!isAuthenticated && cartLoaded) {
        // User logged out - clear the cart
        console.log('🚪 User logged out - clearing cart');
        setCartItems([]);
        setCartCount(0);
        setCartLoaded(false);
      }
    };
    
    loadCart();
  }, [isAuthenticated, token, cartLoaded]);

  // Save cart to backend whenever cart changes (for authenticated users)
  useEffect(() => {
    if (cartLoaded && isAuthenticated && token) {
      saveCartToBackend(cartItems);
    }
  }, [cartItems, cartLoaded, isAuthenticated, token]);

  

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
      const route = hash || `${path}${window.location.search || ''}`;
      const routePath = (route.split('?')[0] || '/').replace(/\/+$/, '') || '/';
      const learningMatch = routePath.match(/^\/learning-centre(?:\/([^/]+))?$/);
      const localProductMatch = routePath.match(/^\/local-products?\/(\d+)/);
      const curatedProductMatch = routePath.match(/^\/products?\/(\d+)/);

      if (learningMatch) {
        setCurrentPage('learning-centre');
        setLearningSlug(learningMatch[1] || '');
        setSelectedCjPid(null);
        setSelectedLocalProductId(null);
        setShowCart(false);
        trackPageView(routePath, learningMatch[1] ? 'Learning Centre Article' : 'Learning Centre');
      } else if (localProductMatch) {
        const productId = localProductMatch[1];
        setCurrentPage('home');
        setCatalogView('local');
        setSelectedCjPid(null);
        loadLocalProductById(productId).catch((err) => {
          console.error('Failed to load local product route:', err);
          setSelectedLocalProductId(null);
        });
        trackPageView(`/local-products/${productId}`, 'Local Product');
      } else if (curatedProductMatch) {
        const productId = Number(curatedProductMatch[1]);
        setCurrentPage('home');
        setCatalogView('cj');
        setSelectedLocalProductId(null);
        setSelectedCjPid(productId);
        trackPageView(`/products/${productId}`, 'Product');
      } else if (route.startsWith('/supplier-pickup') || route.startsWith('/supplier')) {
        const query = route.includes('?') ? route.slice(route.indexOf('?') + 1) : '';
        const params = new URLSearchParams(query);
        setSupplierPickupToken(params.get('token') || params.get('t') || '');
        setCurrentPage('supplier-pickup');
        setSelectedCjPid(null);
        setSelectedLocalProductId(null);
        setShowCart(false);
        trackPageView('/supplier-pickup', 'Supplier Pickup');
      } else if (route.startsWith('/track-order') || route.startsWith('/t')) {
        const query = route.includes('?') ? route.slice(route.indexOf('?') + 1) : '';
        const params = new URLSearchParams(query);
        setTrackingRouteParams({
          orderNumber: params.get('order') || params.get('o') || '',
          token: params.get('token') || params.get('t') || '',
        });
        setCurrentPage('track-order');
        setShowOrderTracking(false);
        trackPageView('/track-order', 'Track Order');
      } else if (route.includes('/checkout/success')) {
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
      } else if (route.startsWith('/privacy')) {
        setCurrentPage('privacy');
        trackPageView('/privacy', 'Privacy Policy');
      } else if (route.startsWith('/shipping')) {
        setCurrentPage('shipping');
        trackPageView('/shipping', 'Shipping Policy');
      } else if (route.startsWith('/returns')) {
        setCurrentPage('returns');
        trackPageView('/returns', 'Returns Policy');
      } else if (route.startsWith('/terms')) {
        setCurrentPage('terms');
        trackPageView('/terms', 'Terms of Service');
      } else if (route.startsWith('/data-deletion')) {
        setCurrentPage('data-deletion');
        trackPageView('/data-deletion', 'Data Deletion');
      } else if (route.startsWith('/wishlist')) {
        setCurrentPage('wishlist');
        setShowCart(false);
        trackPageView('/wishlist', 'Wishlist');
      } else if (route.startsWith('/cj')) {
        // Treat /cj as home - CJ catalog is the home page now
        setCurrentPage('home');
        setSelectedCjPid(null);
        setSelectedLocalProductId(null);
        trackPageView('/', 'Home - Baby Products');
      } else {
        setCurrentPage('home');
        setSelectedCjPid(null);
        setSelectedLocalProductId(null);
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

  // Prefetch local products in background so switching to Local Warehouse is instant
  useEffect(() => {
    let mounted = true;
    const prefetchLocal = async () => {
      try {
        const [productsResponse, bundlesResponse] = await Promise.all([
          fetchApi('/api/local-products?limit=200'),
          fetchApi('/api/local-products/bundles/available'),
        ]);
        if (!productsResponse || !productsResponse.ok) return;
        const data = await productsResponse.json();
        if (mounted && Array.isArray(data.products)) {
          setLocalProductsCache(data.products);
        }
        if (bundlesResponse?.ok) {
          const bundleData = await bundlesResponse.json();
          if (mounted && Array.isArray(bundleData.bundles)) {
            setLocalBundles(bundleData.bundles);
          }
        }
      } catch (e) {
        // Ignore prefetch errors silently
      }
    };

    prefetchLocal();
    return () => { mounted = false; };
  }, [apiBaseInUse]);

  // Handle ?product=<pid> query parameter for WhatsApp sharing and direct product links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    const productType = params.get('type'); // 'local' or empty (CJ)
    const searchQuery = params.get('search');
    
    if (productId) {
      console.log('📱 Product ID found in URL:', productId, 'Type:', productType || 'cj');
      
      const numericId = parseInt(productId, 10);
      
      if (!isNaN(numericId)) {
        if (productType === 'local') {
          // Local product from local_products table
          console.log('🏠 Loading local product:', numericId);
          setCatalogView('local');
          setSelectedCjPid(null);
          
          // Fetch the local product details
          fetchApi(`/api/local-products/${numericId}`)
            .then(res => {
              if (!res.ok) throw new Error('Product not found');
              return res.json();
            })
            .then(data => {
              console.log('✅ Local product loaded:', data);
              setSelectedLocalProductId(data);
            })
            .catch(err => {
              console.error('❌ Failed to load local product:', err);
              alert('Product not found or no longer available');
            });
          pushProductPath(`/local-products/${numericId}`, true);
        } else {
          // CJ product from curated_products table (default)
          console.log('🌍 Loading CJ product:', numericId);
          openCuratedProduct(numericId, { replace: true, skipScroll: true });
        }
      }
    } else if (searchQuery) {
      setCurrentPage('home');
      setCjQuery(searchQuery);
      setSearchTerm(searchQuery);
    }
  }, []);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      const customerAccess = {
        role: 'customer',
        isSuperuser: false,
        isProductAssistant: false,
        canManageProducts: false,
        canApproveProducts: false
      };

      if (!isAuthenticated) {
        setIsAdmin(false);
        setAdminAccess(customerAccess);
        setShowAdminDashboard(false); // Close admin dashboard when logged out
        return;
      }

      // Hardcoded admin emails (frontend check)
      const ADMIN_EMAILS = ['support@snuggleup.co.za'];
      if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        console.log('✅ Hardcoded admin detected:', user.email);
        setIsAdmin(true);
        setAdminAccess({
          role: 'superuser',
          isSuperuser: true,
          isProductAssistant: false,
          canManageProducts: true,
          canApproveProducts: true
        });
        setShowAdminDashboard(true); // Open admin view immediately for hardcoded admins
        return;
      }

      // Fallback: try backend check if token exists
      if (!token) {
        setIsAdmin(false);
        setAdminAccess(customerAccess);
        return;
      }

      try {
        const res = await fetchApi(`/api/auth/access`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const access = res.ok ? await res.json() : customerAccess;
        const canManageProducts = Boolean(access.canManageProducts || access.isSuperuser);
        setIsAdmin(canManageProducts);
        setAdminAccess({
          role: access.role || 'customer',
          isSuperuser: Boolean(access.isSuperuser),
          isProductAssistant: Boolean(access.isProductAssistant),
          canManageProducts,
          canApproveProducts: Boolean(access.canApproveProducts)
        });
        setShowAdminDashboard(canManageProducts); // Open dashboard for superuser or product assistant
      } catch {
        setIsAdmin(false);
        setAdminAccess(customerAccess);
        setShowAdminDashboard(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated, token, user]);

  // NOTE: Do not return early before all hooks run. Route-based returns are moved below hooks.

  // Determine if cart contains only local products (used to disable shipping UI)
  const cartOnlyLocal = useMemo(() => {
    return cartItems.length > 0 && cartItems.every(item => item.isLocal);
  }, [cartItems]);

  // Split cart into local vs import items for dual‑cart UI
  const localItems = useMemo(() => cartItems.filter(i => i.isLocal), [cartItems]);
  const importItems = useMemo(() => cartItems.filter(i => !i.isLocal), [cartItems]);
  const hasLocal = localItems.length > 0;
  const hasImport = importItems.length > 0;
  const mixedCarts = hasLocal && hasImport;

  const subtotalFor = (items) => items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const localSubtotal = subtotalFor(localItems);
  const importSubtotal = subtotalFor(importItems);

  const bundleNamesForItem = (item) => localBundles
    .filter(bundle => (
      bundleSelections.some(selection => selection.id === bundle.id && selection.quantity > 0) &&
      bundle.productIds.some(productId => String(productId) === String(item.id))
    ))
    .map(bundle => bundle.name);

  // helper for rendering a single cart-item row (used in both groups)
  const renderItemRow = (item) => {
    const stockQty = item.stock_quantity || 0;
    const isOutOfStock = stockQty === 0;
    const isLowStock = stockQty > 0 && stockQty < item.quantity;

    return (
      <div key={item.id} className="cart-item">
        <img src={item.image} alt={item.name} className="cart-item-image" />
        <div className="cart-item-details">
          <h4>{item.name}</h4>
          <p>R{formatMoney(item.price)} each</p>
          {bundleNamesForItem(item).map(bundleName => (
            <span className="cart-kit-label" key={bundleName}>Included in {bundleName}</span>
          ))}
          {isOutOfStock && (
            <p style={{ color: '#e74c3c', fontSize: '0.85em', fontWeight: 'bold', margin: '4px 0' }}>
              ⚠️ Sold out
            </p>
          )}
          {isLowStock && (
            <p style={{ color: '#f39c12', fontSize: '0.85em', fontWeight: 'bold', margin: '4px 0' }}>
              ⚠️ Only {stockQty} available
            </p>
          )}
          <div className="quantity-controls">
            <button onClick={() => removeFromCart(item.id)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => addToCart(item)}>+</button>
          </div>
        </div>
        <div className="cart-item-total">
          R{formatMoney(Number(item.price) * Number(item.quantity))}
        </div>
      </div>
    );
  };

  // Fetch real-time shipping quotes from backend (called when cart opens or changes)
  useEffect(() => {
    const fetchQuotes = async () => {
      if (!showCart || !hasImport) {
        setShippingOptions([]);
        setSelectedShipping(null);
        setShippingError('');
        setShippingLoading(false);
        setInsuranceData(null);
        return;
      }

      setShippingLoading(true);
      setShippingError('');
      setInsuranceData(null);
      setSelectedShipping(null);

      try {
        // Import-only cart flow stays unchanged and continues to use the CJ shipping endpoint.
        console.log('🛒 Cart items for shipping (FULL DATA):', JSON.stringify(cartItems, null, 2));
        console.log('🛒 Cart items summary:', cartItems.map(ci => ({
          id: ci.id,
          name: ci.name?.substring(0, 30),
          cj_vid: ci.cj_vid,
          cj_pid: ci.cj_pid,
          has_cj_vid: !!ci.cj_vid,
          price: ci.price,
          quantity: ci.quantity
        })));

        const itemsWithVid = importItems
          .filter(ci => !ci.isLocal && !!ci.cj_vid)
          .map(ci => ({ cj_vid: ci.cj_vid, quantity: ci.quantity }));

        if (itemsWithVid.length === 0) {
          console.error('❌ NO ITEMS WITH cj_vid!');
          console.log('Cart has', cartItems.length, 'items, but none have cj_vid field.');
          console.log('Full cart data:', cartItems);
          console.log('This means products were added to cart before being linked to supplier.');
          console.log('📝 SOLUTION: Clear cart and re-add products from the store.');
          setShippingOptions([]);
          setInsuranceData(null);
          setSelectedShipping(null);
          setShippingError(`⚠️ Cart items missing supplier data. Please clear cart and re-add products from the store.`);
          return;
        }

        const body = {
          items: itemsWithVid,
          shippingCountry,
          postalCode: shippingPostalCode || undefined,
          orderValue: getSubtotal()
        };

        const res = await fetchApi(`/api/shipping/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error('❌ Shipping API error:', err);
          throw new Error(err.error || 'Quote request failed');
        }

        const data = await res.json();
        const opts = data.quotes || [];
        const quotesWithDates = opts.map(q => ({
          ...q,
          deliveryDates: getDeliveryDateRange(q.deliveryDay)
        }));

        setShippingOptions(quotesWithDates);
        setInsuranceData(data.insurance || null);

        if (!selectedShipping && quotesWithDates.length > 0) {
          const cheapest = [...quotesWithDates].sort((a, b) => a.priceZAR - b.priceZAR)[0];
          setSelectedShipping(cheapest);
        }
      } catch (e) {
        setShippingError(e.message);
      } finally {
        setShippingLoading(false);
      }
    };
    fetchQuotes();
  }, [showCart, hasImport, importItems, shippingCountry, shippingPostalCode]);

  const fetchLocalShippingQuotes = async (shippingDetails) => {
    if (!hasLocal || localDeliveryMode === 'economy') return;

    setLocalShippingLoading(true);
    setLocalShippingError('');
    setSelectedLocalShipping(null);

    try {
      const response = await fetchApi('/api/bob/checkout-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: localItems,
          destination: {
            address: shippingDetails.address,
            suburb: shippingDetails.suburb,
            city: shippingDetails.city,
            province: shippingDetails.province,
            postalCode: shippingDetails.postalCode,
          },
          orderValue: localSubtotal,
        }),
      });

      const data = await response.json();
      const rates = Array.isArray(data.rates) ? data.rates : [];
      const matchingRates = rates.filter(rate => rate.type === localDeliveryMode);

      setLocalShippingQuotes(rates);

      if (matchingRates.length === 0) {
        const label = localDeliveryMode === 'pickup' ? 'pick-up point' : 'express';
        const outsideGauteng = String(shippingDetails.province || '').trim().toLowerCase() !== 'gauteng';
        const expressCoverageMessage = localDeliveryMode === 'express' && outsideGauteng
          ? 'Express delivery is currently available for Gauteng addresses only. We are growing our delivery network and look forward to bringing this option to more areas soon. Normal delivery times remain available at checkout.'
          : '';
        setLocalShippingError(
          expressCoverageMessage || data.message || `No ${label} live courier rates are available for this address. Choose Standard delivery or try a different delivery address.`
        );
      }
    } catch (error) {
      setLocalShippingQuotes([]);
      setLocalShippingError(error.message || 'Unable to load live courier rates');
    } finally {
      setLocalShippingLoading(false);
    }
  };

  // Home now shows CJ catalog (handled after helper functions are defined)

  const addToCart = (product) => {
    const normalizedProduct = normalizeCartItem(product, 1);
    const stockQty = Number(normalizedProduct.stock_quantity || 0);

    if (stockQty === 0) {
      alert('Sorry, this item is currently sold out and cannot be added to your cart.');
      return;
    }

    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => String(item.id) === String(normalizedProduct.id));

      if (existingIndex >= 0) {
        const existingItem = prevItems[existingIndex];
        if (existingItem.quantity >= stockQty) {
          alert(`Only ${stockQty} available in stock.`);
          return prevItems;
        }

        const updatedItems = [...prevItems];
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1
        };
        return updatedItems;
      }

      return [...prevItems, normalizedProduct];
    });

    trackAddToCart(normalizedProduct, 1);
  };

  const addLocalBundle = (bundle) => {
    if (!bundle?.isAvailable || !Array.isArray(bundle.products)) {
      return { message: 'This kit is not available right now.' };
    }

    const unavailableProduct = bundle.products.find(product => {
      const existingItem = cartItems.find(item => String(item.id) === String(product.id));
      const nextQuantity = Number(existingItem?.quantity || 0) + 1;
      return nextQuantity > Number(product.stock_quantity || 0);
    });

    if (unavailableProduct) {
      return { message: `${unavailableProduct.name} does not have enough stock for another kit.` };
    }

    setCartItems(previousItems => {
      const nextItems = [...previousItems];
      bundle.products.forEach(product => {
        const normalizedProduct = normalizeCartItem({
          ...product,
          isLocal: true,
          source: 'local',
        }, 1);
        const existingIndex = nextItems.findIndex(
          item => String(item.id) === String(normalizedProduct.id)
        );

        if (existingIndex >= 0) {
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            quantity: Number(nextItems[existingIndex].quantity || 0) + 1,
          };
        } else {
          nextItems.push(normalizedProduct);
        }
        trackAddToCart(normalizedProduct, 1);
      });
      return nextItems;
    });

    setBundleSelections(previousSelections => {
      const existing = previousSelections.find(selection => selection.id === bundle.id);
      if (existing) {
        return previousSelections.map(selection => (
          selection.id === bundle.id
            ? { ...selection, quantity: Number(selection.quantity || 0) + 1 }
            : selection
        ));
      }
      return [...previousSelections, { id: bundle.id, quantity: 1 }];
    });

    return { message: `${bundle.name} added to your cart. You saved R${Number(bundle.saving).toFixed(0)}.` };
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => {
      const item = prevItems.find(item => String(item.id) === String(productId));
      if (!item) return prevItems;

      if (item.quantity > 1) {
        const updated = prevItems.map(item =>
          String(item.id) === String(productId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
        trackRemoveFromCart(item, 1);
        setBundleSelections(selections => (
          reconcileBundleSelections(updated, selections, localBundles)
        ));
        return updated;
      }

      trackRemoveFromCart(item, item.quantity || 0);
      const updated = prevItems.filter(item => String(item.id) !== String(productId));
      setBundleSelections(selections => (
        reconcileBundleSelections(updated, selections, localBundles)
      ));
      return updated;
    });
  };

  // Wishlist functions
  const addToWishlist = (product) => {
    const alreadyExists = wishlistItems.some(item => item.id === product.id);
    if (alreadyExists) {
      alert('This item is already in your wishlist!');
      return;
    }
    
    const newWishlist = [...wishlistItems, product];
    setWishlistItems(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    alert('Added to wishlist! ❤️');
  };

  const removeFromWishlist = (productId) => {
    const newWishlist = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  // Calculate delivery date range from delivery days string (e.g., "15-25" or "5-7")
  const getDeliveryDateRange = (deliveryDay) => {
    if (!deliveryDay) return null;
    const match = deliveryDay.match(/(\d+)-(\d+)/);
    if (!match) return null;
    
    const minDays = parseInt(match[1]);
    const maxDays = parseInt(match[2]);
    const today = new Date();
    
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDays);
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxDays);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
    };
    
    return {
      min: formatDate(minDate),
      max: formatDate(maxDate),
      text: `${formatDate(minDate)} - ${formatDate(maxDate)}`
    };
  };

  // Derived flag: any cart item out of stock or quantity exceeds available
  const hasStockIssues = useMemo(() => {
    return cartItems.some((item) => {
      const stockQty = typeof item.stock_quantity === 'number' ? item.stock_quantity : Number(item.stock_quantity || 0);
      return stockQty === 0 || stockQty < (item.quantity || 0);
    });
  }, [cartItems]);

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const hasFreeLocalDelivery = () => (
    hasLocal &&
    getSubtotal() > 600 &&
    ['economy', 'pickup'].includes(localDeliveryMode)
  );

  const getImportShippingCost = () => {
    if (!hasImport) return 0;
    return Number(selectedShipping?.priceZAR || 0);
  };

  // Backward-compatible alias for legacy import-cart display code.
  const getShippingCost = () => getImportShippingCost();

  const getLocalShippingCost = () => {
    if (!hasLocal) return 0;
    if (hasFreeLocalDelivery()) return 0;
    if (localDeliveryMode === 'economy') return 99;
    return Number(selectedLocalShipping?.priceZAR || 0);
  };

  const getLocalShippingMethod = () => {
    if (!hasLocal) return null;
    if (localDeliveryMode === 'economy') {
      return hasFreeLocalDelivery()
        ? 'Standard delivery - Free over R600'
        : 'Standard delivery - R99';
    }
    if (!selectedLocalShipping) return null;
    return hasFreeLocalDelivery()
      ? `${selectedLocalShipping.label} - Free over R600`
      : selectedLocalShipping.label;
  };

  const getImportShippingMethod = () => {
    if (!hasImport) return null;
    return selectedShipping?.logisticName || null;
  };

  const getVoucherDiscount = () => Number(appliedVoucher?.value || 0);

  const getBundleDiscount = () => bundleSelections.reduce((total, selection) => {
    const bundle = localBundles.find(item => item.id === selection.id);
    return total + (Number(bundle?.saving || 0) * Number(selection.quantity || 0));
  }, 0);

  const getFirstOrderDiscount = () => {
    if (!firstOrderEligibilityReady || !firstOrderEligible) return 0;
    const eligibleSubtotal = Math.max(getSubtotal() - getBundleDiscount(), 0);
    return Math.round(eligibleSubtotal * 10) / 100;
  };

  const getDiscount = () => {
    return getVoucherDiscount() + getBundleDiscount() + getFirstOrderDiscount();
  };

  const getInsuranceCost = () => {
    if (insuranceSelected && insuranceData) {
      return insuranceData.costZAR || 0;
    }
    return 0;
  };

  const getTotalPrice = () => {
    const total = getSubtotal()
      + getImportShippingCost()
      + getLocalShippingCost()
      + getInsuranceCost()
      - getDiscount();
    // Round to 2 decimal places to avoid floating-point precision issues
    const rounded = Math.round(total * 100) / 100;
    return rounded > 0 ? rounded : 0;
  };

  const applyVoucher = async () => {
    const normalizedCode = voucherCode.trim().toUpperCase();

    if (!normalizedCode) {
      setVoucherError('Please enter a discount code');
      return;
    }

    const shippingAmount = Math.round((getImportShippingCost() + getLocalShippingCost()) * 100) / 100;
    if (normalizedCode === 'FREEDELIVERY') {
      if (shippingAmount <= 0) {
        setVoucherError('This code only applies when there is a delivery fee');
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher({
        code: 'FREEDELIVERY',
        value: shippingAmount,
        description: 'Free delivery'
      });
      setVoucherCode('');
      setVoucherError('');
      return;
    }

    try {
      setVoucherError('');
      const subtotal = getSubtotal();
      const orderAmount = subtotal + shippingAmount + getInsuranceCost();

      const response = await fetch(`${apiBaseInUse}/api/discounts/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: normalizedCode,
          orderAmount,
          shippingAmount
        })
      });

      const data = await response.json();

      if (!response.ok || !data.applied) {
        setVoucherError(data.error || 'Invalid discount code');
        setAppliedVoucher(null);
        return;
      }

      // Successfully applied discount
      setAppliedVoucher({
        code: data.code,
        value: data.discountValue,
        description: data.type === 'free_delivery'
          ? 'Free delivery'
          : data.discountPercentage 
          ? `${data.discountPercentage}% off`
          : `R${data.discountAmount} off`
      });
      setVoucherCode('');
      setVoucherError('');
    } catch (error) {
      console.error('Error applying discount:', error);
      setVoucherError('Failed to apply discount code. Please try again.');
      setAppliedVoucher(null);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  const toggleCart = () => {
    if (currentPage !== 'home') {
      setCurrentPage('home');
      setLearningSlug('');
      setShowCart(true);
      window.location.hash = '';
      return;
    }
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
    // guests are allowed; email will be collected in the shipping form
    if (!isAuthenticated) {
      // optional: show friendly notice
      alert('You can checkout as a guest. Please enter your email on the next step to receive order confirmation.');
    }

    // Check cart has items and no obvious stock issues (already validated when adding)
    const hasOutOfStockItems = cartItems.some(item => {
      const stockQty = typeof item.stock_quantity === 'number' ? item.stock_quantity : Number(item.stock_quantity || 0);
      return stockQty === 0;
    });

    if (hasOutOfStockItems) {
      alert('Your cart contains items that are no longer in stock. Please remove them before continuing.');
      return;
    }

    console.log('✅ Checkout validation passed, proceeding to shipping form');

    if (hasImport && !selectedShipping) {
      alert('Please wait for, then select, an import shipping option before checkout.');
      return;
    }

    // Track begin checkout event
    trackBeginCheckout(cartItems, getTotalPrice());

    // Show shipping form before payment
    setShowCart(false);
    setShowShippingForm(true);
  };

  const handleShippingFormSubmit = async (shippingDetails) => {
    // combine name parts for backend convenience
    const detailsWithName = {
      ...shippingDetails,
      customerName: `${shippingDetails.firstName || ''} ${shippingDetails.lastName || ''}`.trim()
    };
    setShippingFormData(detailsWithName);

    if (hasLocal && localDeliveryMode !== 'economy' && !selectedLocalShipping) {
      await fetchLocalShippingQuotes(detailsWithName);
      return;
    }

    setShowShippingForm(false);

    // if guest entered email, capture for marketing/abandoned-cart flows
    if (!isAuthenticated && detailsWithName?.email) {
      console.log('📧 Guest checkout email captured for marketing:', detailsWithName.email);
    }

    try {
      // Save cart to localStorage for recovery if payment fails
      localStorage.setItem('cart', JSON.stringify(cartItems));
      
      // Save insurance and shipping data for order creation
      const importShipping = getImportShippingCost();
      const localShipping = getLocalShippingCost();
      const importShippingMethod = getImportShippingMethod();
      const localShippingMethod = getLocalShippingMethod();

      localStorage.setItem('checkoutData', JSON.stringify({
        shippingCountry,
        shippingMethod: importShippingMethod,
        localShippingMethod,
      localDeliveryMode,
        selectedLocalShipping,
        insuranceSelected,
        insuranceData: insuranceSelected ? insuranceData : null,
        subtotal: getSubtotal(),
        importShipping,
        localShipping,
        discount: getDiscount(),
        bundleSelections,
      }));

      // build headers; only include auth when the framework says user is authenticated
      const baseHeaders = { 'Content-Type': 'application/json' };
      const authHeaders = (isAuthenticated && token)
        ? { Authorization: `Bearer ${token}` }
        : {};
      let headers = { ...baseHeaders, ...authHeaders };

      // helper to actually post the payment data
      const postPayment = async (hdrs) => {
        return fetch(`${apiBaseInUse}/api/payments/create`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            amount: Math.round(getTotalPrice() * 100) / 100,
            email: user?.email || shippingDetails.email,
            orderItems: cartItems,
            subtotal: Math.round(getSubtotal() * 100) / 100,
            shipping: Math.round(importShipping * 100) / 100,
            localShipping: Math.round(localShipping * 100) / 100,
            discount: Math.round(getVoucherDiscount() * 100) / 100,
            bundleSelections,
            shippingMethod: importShippingMethod,
            localShippingMethod,
            localDeliveryMode,
            shippingQuoted: importShipping,
            shippingCountry: shippingCountry,
            shippingDetails: detailsWithName,
            insurance: insuranceSelected ? {
              selected: true,
              cost: getInsuranceCost(),
              coverage: insuranceData?.coverage || getSubtotal(),
              percentage: insuranceData?.percentage || 3
            } : {
              selected: false,
              cost: 0
            }
          })
        });
      };

      // post once with current headers
      let response = await postPayment(headers);
      // if we attempted with auth but got forbidden, drop login and retry
      if (response.status === 403 && isAuthenticated) {
        console.warn('Auth token rejected during checkout, clearing session and retrying as guest');
        try { logout(); } catch {};
        headers = { ...baseHeaders };
        response = await postPayment(headers);
      }

      if (!response.ok) {
        // Try to read JSON error if available
        let msg = 'Payment creation failed';
        try {
          const errorData = await response.json();
          msg = errorData.error || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      // The payment request was accepted and the customer is about to leave for PayFast.
      trackPaymentStarted();

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

  const renderLocalDeliverySelector = () => {
    const matchingRates = localShippingQuotes.filter(rate => rate.type === localDeliveryMode);
    const hasLiveSelection = localDeliveryMode === 'economy' || Boolean(selectedLocalShipping);

    return (
      <div className="shipping-selector-card">
        <div className="shipping-selector-header">
          <h4>Local delivery</h4>
          <span>{hasLiveSelection ? 'Selected' : 'Address required for live quote'}</span>
        </div>
        <div className="shipping-option-tabs">
          {localDeliveryOptions.map(option => (
            <button
              key={option.key}
              className={`shipping-tab ${localDeliveryMode === option.key ? 'active' : ''}`}
              onClick={() => {
                setLocalDeliveryMode(option.key);
                setSelectedLocalShipping(null);
                setLocalShippingError('');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="shipping-option-body">
              {localDeliveryMode === 'economy' ? (
            <div className="shipping-summary-card">
              <div>
                <strong>Standard delivery</strong>
                <p>{hasFreeLocalDelivery() ? 'Free delivery on orders over R600' : 'R99'}</p>
              </div>
              <span>{hasFreeLocalDelivery() ? 'Free' : 'R99.00'}</span>
            </div>
          ) : (
            <>
              {!shippingFormData?.postalCode && (
                <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                  Enter your delivery address at checkout to see live courier rates.
                </p>
              )}
              {shippingFormData?.postalCode && !selectedLocalShipping && (
                <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                  Continue to the delivery form, then request a live courier rate.
                </p>
              )}
              {selectedLocalShipping && (
                <div className="shipping-summary-card">
                  <div>
                    <strong>{selectedLocalShipping.label}</strong>
                    <p>{selectedLocalShipping.deliveryEstimate || 'Live courier rate'}</p>
                  </div>
                  <span>{hasFreeLocalDelivery() ? 'Free' : `R${Number(selectedLocalShipping.priceZAR).toFixed(2)}`}</span>
                </div>
              )}
              {matchingRates.length > 0 && !selectedLocalShipping && (
                <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>
                  A live rate is ready to select in the delivery form.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderImportShippingSelector = () => (
    <div className="shipping-selector-card">
      <div className="shipping-selector-header">
        <h4>Import delivery</h4>
        <span>{selectedShipping ? 'Selected' : 'Choose a rate'}</span>
      </div>
      {shippingLoading ? (
        <p style={{ margin: 0 }}>Getting supplier shipping options...</p>
      ) : shippingError ? (
        <p style={{ margin: 0, color: '#dc3545' }}>{shippingError}</p>
      ) : shippingOptions.length === 0 ? (
        <p style={{ margin: 0, color: '#dc3545' }}>No import shipping options are available for this cart.</p>
      ) : (
        <select
          value={selectedShipping?.logisticName || ''}
          onChange={(event) => {
            const option = shippingOptions.find(rate => rate.logisticName === event.target.value);
            setSelectedShipping(option || null);
          }}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          {shippingOptions.map(option => (
            <option key={option.logisticName} value={option.logisticName}>
              {option.logisticName} - R{Number(option.priceZAR).toFixed(2)}
            </option>
          ))}
        </select>
      )}
    </div>
  );


  // Note: '/cj' routes are normalized to 'home' in the router.

  return (
    <div className={`app ${showAccountPrompt ? 'has-account-prompt' : ''}`}>
      {/* Header */}
      <header className="header" ref={headerRef}>
        {showAccountPrompt && (
          <div className="account-prompt-banner">
            <span><strong>New here?</strong> Enjoy 10% off your first SnuggleUp order. Applied automatically.</span>
          </div>
        )}
        <div className="logo-section">
          <div 
            className="logo" 
            onClick={() => { 
              try {
                setShowCart(false);
                setSelectedCjPid(null);
                setCjQuery('');
              } catch {}
              window.location.hash = '';
              try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
            }}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                try {
                  setShowCart(false);
                  setSelectedCjPid(null);
                  setCjQuery('');
                } catch {}
                window.location.hash = '';
                try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
              }
            }}
            aria-label="Go to SnuggleUp home page"
          >
            <img src={BRAND_LOGO_SRC} alt="SnuggleUp Baby Store" style={{ height: 'auto', display: 'block' }} loading="eager" />
          </div>
          <div className="brand-info">
            <h1>SnuggleUp</h1>
            <p>Baby essentials for modern parents</p>
          </div>
        </div>
        <div className="header-right">
          <button
            className="track-order-btn"
            onClick={() => { setShowAuthModal(false); setShowUserAccount(false); setShowOrderTracking(true); }}
            title="Track an order"
          >
            Track Order
          </button>
          {/* Login/Account Button */}
          {!isAuthenticated ? (
            <button
              className="login-btn"
              onClick={() => { setShowOrderTracking(false); setShowUserAccount(false); setAuthView('login'); setShowAuthModal(true); }}
              title="Login or create an account"
            >
              Login
            </button>
          ) : (
            <button
              className="account-btn"
              onClick={async () => {
                if (showAdminDashboard && isAdmin) {
                  await logout();
                  setShowAdminDashboard(false);
                  setIsStorePreviewActive(false);
                  setCurrentPage('home');
                  window.location.hash = '';
                  return;
                }

                setShowAuthModal(false);
                setShowOrderTracking(false);
                setShowUserAccount(true);
              }}
              title={showAdminDashboard && isAdmin ? 'Log out' : 'Your account'}
            >
              {showAdminDashboard && isAdmin ? 'Log out' : (user?.email ? user.email.split('@')[0] : 'Account')}
            </button>
          )}
          {!isAdmin && (
            <>
              <button
                className="wishlist-btn"
                onClick={() => {
                  setShowCart(false);
                  setCurrentPage('wishlist');
                  window.location.hash = '/wishlist';
                }}
                aria-label={`View wishlist (${wishlistItems.length} items)`}
                title="View wishlist"
              >
                <svg
                  className="wishlist-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
                {wishlistItems.length > 0 && (
                  <span className="wishlist-count">{wishlistItems.length}</span>
                )}
              </button>
              <button
                className="checkout-btn"
                onClick={toggleCart}
                aria-label={`View cart (${cartCount} items)`}
                title="View cart"
              >
                <svg
                  className="cart-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="currentColor"
                    d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14h9.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.99 5H6.21L5.27 3H2v2h2l3.6 7.59-1.35 2.44C5.52 15.37 6.2 16 7 16h12v-2H7.42l.74-1.33z"
                  />
                </svg>
                <span className="cart-count">{cartCount}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {showAdminDashboard && !isStorePreviewActive ? (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          onStorePreview={(isActive) => setIsStorePreviewActive(isActive)}
          access={adminAccess}
        />
      ) : currentPage === 'success' ? (
        <CheckoutSuccess />
      ) : currentPage === 'cancel' ? (
        <CheckoutCancel />
      ) : currentPage === 'supplier-pickup' ? (
        <SupplierPickupPage token={supplierPickupToken} />
      ) : currentPage === 'track-order' ? (
        <OrderTrackingLookup
          key={`${trackingRouteParams.orderNumber}:${trackingRouteParams.token}`}
          mode="page"
          initialOrderNumber={trackingRouteParams.orderNumber}
          initialToken={trackingRouteParams.token}
          autoLookup={Boolean(trackingRouteParams.orderNumber && trackingRouteParams.token)}
        />
      ) : currentPage === 'learning-centre' ? (
        <>
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '15px 20px',
            background: '#f9f9f9',
            borderBottom: '1px solid #eee',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => {
                setCatalogView('cj');
                setCurrentPage('home');
                setLearningSlug('');
                window.location.hash = '';
              }}
              style={{ padding: '10px 20px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
            >
              Import Store
            </button>
            <button
              onClick={() => {
                setCatalogView('local');
                setCurrentPage('home');
                setLearningSlug('');
                window.location.hash = '';
              }}
              style={{ padding: '10px 20px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
            >
              Local Warehouse (Fast Delivery)
            </button>
            <button
              type="button"
              aria-current="page"
              style={{ padding: '10px 20px', background: '#ff6b9d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'default' }}
            >
              Learning Centre
            </button>
          </div>
          <LearningCentre slug={learningSlug} onBack={() => { window.location.hash = ''; setCurrentPage('home'); setLearningSlug(''); }} />
        </>
      ) : currentPage === 'wishlist' ? (
        <div className="wishlist-page">
          <div className="wishlist-content">
            <div className="wishlist-header">
              <h2>My Wishlist ❤️</h2>
              <button className="back-to-shop" onClick={() => setCurrentPage('home')}>
                ← Back to Shop
              </button>
            </div>
            {wishlistItems.length === 0 ? (
              <div className="empty-wishlist">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="#ccc">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <p>Your wishlist is empty</p>
                <button className="continue-shopping" onClick={() => setCurrentPage('home')}>
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="wishlist-grid">
                {wishlistItems.map(item => (
                  <div key={item.id} className="wishlist-item">
                    <button 
                      className="remove-from-wishlist"
                      onClick={() => removeFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      ×
                    </button>
                    <div 
                      className="wishlist-item-image"
                      onClick={() => {
                        setSelectedCjPid(item.pid || item.id);
                        setCurrentPage('home');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="wishlist-item-details">
                      <h3 
                        onClick={() => {
                          setSelectedCjPid(item.pid || item.id);
                          setCurrentPage('home');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {item.name}
                      </h3>
                      <p className="wishlist-item-price">R {Number(item?.price || 0).toFixed(2)}</p>
                      <button 
                        className="add-to-cart-from-wishlist"
                        onClick={() => {
                          addToCart(item);
                          removeFromWishlist(item.id);
                        }}
                        disabled={item.stock_quantity === 0}
                      >
                        {item.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : currentPage === 'privacy' ? (
        <div style={{ marginTop: '20px' }}>
          <PrivacyPolicy />
        </div>
      ) : currentPage === 'shipping' ? (
        <div style={{ marginTop: '20px' }}>
          <ShippingPolicy />
        </div>
      ) : currentPage === 'returns' ? (
        <div style={{ marginTop: '20px' }}>
          <ReturnsPolicy />
        </div>
      ) : currentPage === 'terms' ? (
        <div style={{ marginTop: '20px' }}>
          <TermsOfService />
        </div>
      ) : currentPage === 'data-deletion' ? (
        <div style={{ marginTop: '20px' }}>
          <DataDeletion />
        </div>
      ) : (
        <>
          {showAdminDashboard && isStorePreviewActive && (
            <AdminDashboard
              onClose={() => setShowAdminDashboard(false)}
              onStorePreview={(isActive) => setIsStorePreviewActive(isActive)}
              access={adminAccess}
            />
          )}

          {/* Show store content ONLY when admin dashboard is showing store preview OR admin is completely closed */}
          {!showCart && (!showAdminDashboard || (showAdminDashboard && isStorePreviewActive)) && (
            <div style={{
              marginLeft: showAdminDashboard && isStorePreviewActive ? '260px' : '0',
              minHeight: 'calc(100vh - 88px)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Catalog View Tabs */}
              <div style={{
                display: 'flex',
                gap: '10px',
                padding: '15px 20px',
                background: '#f9f9f9',
                borderBottom: '1px solid #eee',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    setCatalogView('cj');
                    setSelectedCjPid(null);
                    setSelectedLocalProductId(null);
                    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: catalogView === 'cj' ? '#ff6b9d' : '#f0f0f0',
                    color: catalogView === 'cj' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🌍 Import Store
                </button>
                <button
                  onClick={() => {
                    setCatalogView('local');
                    setSelectedCjPid(null);
                    setSelectedLocalProductId(null);
                    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: catalogView === 'local' ? '#ff6b9d' : '#f0f0f0',
                    color: catalogView === 'local' ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  ⚡ Local Warehouse (Fast Delivery)
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('learning-centre');
                    setLearningSlug('');
                    setShowCart(false);
                    window.location.hash = '/learning-centre';
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#fff7fa',
                    color: '#c53c72',
                    border: '1px solid #ffc9dc',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Helpful parenting guides"
                >
                  Learning Centre
                </button>
              </div>

              {/* CJ Catalog as main store */}
              {catalogView === 'cj' && (
                <div id="cj-anchor" style={{ flex: '1 0 auto' }}>
                  {!selectedCjPid && (
                    <CJCatalog 
                      query={cjQuery}
                      onQueryChange={setCjQuery}
                      onBack={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      onOpenProduct={openCuratedProduct}
                      isAdmin={isAdmin}
                      onAddToCart={addToCart}
                    />
                  )}

                  {selectedCjPid && (
                    <CJProductDetail
                      pid={selectedCjPid}
                      onClose={closeProductDetail}
                      onAddToCart={addToCart}
                      onAddToWishlist={addToWishlist}
                    />
                  )}
                </div>
              )}

              {/* Local Products Catalog */}
              {catalogView === 'local' && (
                <div id="local-anchor" style={{ flex: '1 0 auto' }}>
                  {!selectedLocalProductId ? (
                    <>
                      <LocalBundleShowcase
                        bundles={localBundles}
                        onAddBundle={addLocalBundle}
                      />
                      <FavouriteBrands
                        onSelectBrand={(brandSearch) => {
                          setSearchTerm(brandSearch);
                          setCatalogView('local');
                          window.setTimeout(() => {
                            document.getElementById('local-anchor')?.scrollIntoView({ behavior: 'smooth' });
                          }, 50);
                        }}
                      />
                      <LocalProductsCatalog
                        query={searchTerm}
                        onOpenProduct={openLocalProduct}
                        isAdmin={isAdmin}
                        onShowUpload={() => setShowLocalProductUpload(true)}
                        initialProducts={localProductsCache}
                        onAddToCart={addToCart}
                        onSearch={setSearchTerm}
                      />
                    </>
                  ) : (
                    <LocalProductDetail
                      product={selectedLocalProductId}
                      onClose={closeProductDetail}
                      onAddToCart={addToCart}
                      allProducts={[]}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Shopping Cart Full Page */}
          {showCart && (
            <div className="cart-page">
              <div className="cart-content">
                <div className="cart-header">
                  <h3>Shopping Cart ({cartCount} items)</h3>
                  <button className="close-cart" onClick={toggleCart}>← Back to Shop</button>
                </div>
                <div className="cart-items">
                  {cartItems.length === 0 ? (
                    <p className="empty-cart">Your cart is empty</p>
                  ) : mixedCarts ? (
                    <div className="cart-groups-container">
                      {/* Local products group */}
                      {hasLocal && (
                        <div className="cart-group">
                          <h4>Cart 1 – Fast delivery</h4>
                          <p style={{fontSize:'0.9em', color:'#555', margin:'4px 0 8px'}}>
                            Items stocked locally – delivered in 2–3 business days.
                           </p>
                           {localItems.map(renderItemRow)}
                           {renderLocalDeliverySelector()}
                           <div className="cart-footer">
                             <div className="cart-total">
                               <p>Subtotal: R{localSubtotal.toFixed(2)}</p>
                               <p>Shipping: R{getLocalShippingCost().toFixed(2)}</p>
                              <strong>Total: R{(localSubtotal + getLocalShippingCost()).toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Import products group */}
                      {hasImport && (
                        <div className="cart-group">
                          <h4>Cart 2 – Import</h4>
                          <p style={{fontSize:'0.9em', color:'#555', margin:'4px 0 8px'}}>
                            Overseas products – delivery estimate 7‑14 days (shipping quoted below).
                          </p>
                          {importItems.map(renderItemRow)}
                          <div className="cart-footer">
                            <div className="cart-total">
                              {/* shipping UI only for import group */}
                              {hasImport && (
                                <>
                                  {/* Country Selector */}
                                  <div style={{marginBottom: '12px'}}>
                                    <label style={{fontSize:'0.9em', fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>
                                      📍 Ship to:
                                    </label>
                                    <select
                                      value={shippingCountry}
                                      onChange={(e) => setShippingCountry(e.target.value)}
                                      style={{width: '100%', padding:'8px', borderRadius: '4px', border: '1px solid #ddd'}}
                                    >
                                      <option value="ZA">🇿🇦 South Africa</option>
                                      <option value="US">🇺🇸 United States</option>
                                      <option value="GB">🇬🇧 United Kingdom</option>
                                      <option value="AU">🇦🇺 Australia</option>
                                      <option value="CA">🇨🇦 Canada</option>
                                      <option value="DE">🇩🇪 Germany</option>
                                      <option value="FR">🇫🇷 France</option>
                                    </select>
                                  </div>

                                  {/* Real-time shipping options */}
                                  <div style={{marginBottom: '8px'}}>
                                    {shippingLoading ? (
                                      <p>Getting shipping options…</p>
                                    ) : shippingError ? (
                                      <div>
                                        <p style={{color:'#dc3545'}}>⚠️ Shipping quote unavailable</p>
                                        <p style={{color:'#6c757d', fontSize:'0.85em'}}>
                                          Real-time rates aren’t available right now. We’ll use an estimated tiered rate based on your subtotal.
                                          {shippingError && ` Error: ${String(shippingError)}`}
                                        </p>
                                      </div>
                                    ) : shippingOptions.length === 0 ? (
                                      <div>
                                        <p style={{color:'#dc3545'}}>⚠️ No shipping options available</p>
                                        <p style={{color:'#6c757d', fontSize:'0.85em'}}>
                                          Our shipping provider doesn’t have delivery methods for these products to your selected destination.
                                          We’ll use an estimated tiered rate based on your subtotal.
                                        </p>
                                      </div>
                                    ) : (
                                      shippingOptions.length > 0 && (
                                        <>
                                          <div style={{marginBottom:'8px'}}>
                                            <label style={{fontSize:'0.9em', fontWeight: 'bold'}}>Shipping method:</label>
                                            <select
                                              value={selectedShipping?.logisticName || ''}
                                              onChange={(e) => {
                                                const opt = shippingOptions.find(o => o.logisticName === e.target.value);
                                                setSelectedShipping(opt || null);
                                              }}
                                              style={{width: '100%', padding:'8px', marginTop: '6px', borderRadius: '4px', border: '1px solid #ddd'}}
                                            >
                                              {shippingOptions.map(o => (
                                                <option key={o.logisticName} value={o.logisticName}>
                                                  {o.logisticName} — R{o.priceZAR.toFixed(2)}{o.isFallback ? ' (Estimated)' : ''}
                                                </option>
                                              ))}
                                            </select>
                                            {selectedShipping?.deliveryDates && (
                                              <p style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                                                📅 Estimated delivery: {selectedShipping.deliveryDates.text}
                                              </p>
                                            )}
                                            {selectedShipping?.isFallback && (
                                              <p style={{fontSize: '0.85em', color: '#666', marginTop: '4px'}}>
                                                ℹ️ Estimated rate applied (no live quote available)
                                              </p>
                                            )}
                                          </div>

                                          {/* Insurance Option */}
                                          {insuranceData && insuranceData.available && (
                                            <div style={{
                                              padding: '10px',
                                              background: '#f8f9fa',
                                              borderRadius: '6px',
                                              marginBottom: '8px',
                                              border: '1px solid #e0e0e0'
                                            }}>
                                              <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                                                <input
                                                  type="checkbox"
                                                  checked={insuranceSelected}
                                                  onChange={(e) => setInsuranceSelected(e.target.checked)}
                                                  style={{width: '16px', height: '16px'}}
                                                />
                                                <span style={{fontSize: '0.9em', flex: 1}}>
                                                  🛡️ Shipping Insurance <strong>(R{insuranceData.costZAR})</strong>
                                                </span>
                                              </label>
                                              <p style={{fontSize: '0.8em', color: '#666', marginTop: '4px', marginLeft: '24px'}}>
                                                Covers R{insuranceData.coverage.toFixed(2)} • {insuranceData.percentage}% of order value
                                              </p>
                                            </div>
                                          )}
                                        </>
                                      )
                                    )}
                                  </div>
                                </>
                              )}
                              <p style={{marginBottom: '8px'}}>Subtotal: R{importSubtotal.toFixed(2)}</p>
                              <p style={{marginBottom: '8px'}}>Shipping: R{getShippingCost().toFixed(2)}{selectedShipping?.isFallback ? ' • Estimated' : ''}</p>
                              {insuranceSelected && insuranceData && (
                                <p style={{marginBottom: '8px'}}>Insurance: R{getInsuranceCost().toFixed(2)}</p>
                              )}
                              <strong>Total: R{(importSubtotal + getImportShippingCost() + (insuranceSelected ? getInsuranceCost() : 0)).toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Grand total panel */}
                      <div className="cart-grand-total">
                        <div className="cart-total">
                          <p style={{fontWeight: 'bold'}}>Grand Total: R{getTotalPrice().toFixed(2)}</p>
                          {appliedVoucher && (
                            <p style={{marginBottom: '8px', color: '#28a745'}}>
                              Discount ({appliedVoucher.code}): -R{Number(appliedVoucher.value || 0).toFixed(2)}
                              <button
                                onClick={removeVoucher}
                                style={{marginLeft: '8px', background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9em'}}
                              >
                                ✕
                              </button>
                            </p>
                          )}
                          {getBundleDiscount() > 0 && (
                            <p className="cart-kit-saving">
                              Kit saving: -R{getBundleDiscount().toFixed(2)}
                            </p>
                          )}
                          {getFirstOrderDiscount() > 0 && (
                            <p className="cart-first-order-saving">
                              First-order saving (10%): -R{getFirstOrderDiscount().toFixed(2)}
                            </p>
                          )}
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
                              style={{padding: '8px 16px', marginLeft: '8px', background: '#BEE7C1', color: '#126F71', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                            >
                              Apply
                            </button>
                            {voucherError && (
                              <p style={{color: '#dc3545', fontSize: '0.85em', marginTop: '4px'}}>{voucherError}</p>
                            )}
                          </div>
                        )}
                        <button
                          className="proceed-checkout"
                          onClick={handleCheckout}
                          disabled={hasStockIssues}
                          title={hasStockIssues ? 'Update cart: some items are out of stock or exceed available quantity' : 'Proceed to PayFast Checkout'}
                          style={hasStockIssues ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                        >
                          Proceed to PayFast Checkout
                        </button>
                        <PaymentMethodsStrip />
                        {hasStockIssues && (
                          <p style={{ color: '#dc3545', marginTop: '8px', fontSize: '0.9em' }}>
                            Please remove or adjust items marked "Sold out" before continuing.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // single cart scenario
                    cartItems.map(item => {
                      const stockQty = item.stock_quantity || 0;
                      const isOutOfStock = stockQty === 0;
                      const isLowStock = stockQty > 0 && stockQty < item.quantity;
                      
                      return (
                        <div key={item.id} className="cart-item">
                          <img src={item.image} alt={item.name} className="cart-item-image" />
                          <div className="cart-item-details">
                            <h4>{item.name}</h4>
                            <p>R{formatMoney(item.price)} each</p>
                            {isOutOfStock && (
                              <p style={{ color: '#e74c3c', fontSize: '0.85em', fontWeight: 'bold', margin: '4px 0' }}>
                                ⚠️ Sold out
                              </p>
                            )}
                            {isLowStock && (
                              <p style={{ color: '#f39c12', fontSize: '0.85em', fontWeight: 'bold', margin: '4px 0' }}>
                                ⚠️ Only {stockQty} available
                              </p>
                            )}
                            <div className="quantity-controls">
                              <button onClick={() => removeFromCart(item.id)}>-</button>
                              <span>{item.quantity}</span>
                              <button onClick={() => addToCart(item)}>+</button>
                            </div>
                          </div>
                          <div className="cart-item-total">
                            R{formatMoney(Number(item.price) * Number(item.quantity))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {cartItems.length > 0 && !mixedCarts && (
                  <div className="cart-footer">
                    <div className="cart-total">
                      <p style={{marginBottom: '8px'}}>Subtotal: R{getSubtotal().toFixed(2)}</p>
                      <p style={{marginBottom: '8px'}}>Shipping: R{(cartOnlyLocal ? getLocalShippingCost() : getImportShippingCost()).toFixed(2)}</p>
                      {appliedVoucher && (
                        <p style={{marginBottom: '8px', color: '#28a745'}}>
                          Discount ({appliedVoucher.code}): -R{Number(appliedVoucher.value || 0).toFixed(2)}
                          <button 
                            onClick={removeVoucher}
                            style={{marginLeft: '8px', background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9em'}}
                          >
                            ✕
                          </button>
                        </p>
                      )}
                      {getBundleDiscount() > 0 && (
                        <p className="cart-kit-saving">
                          Kit saving: -R{getBundleDiscount().toFixed(2)}
                        </p>
                      )}
                      {getFirstOrderDiscount() > 0 && (
                        <p className="cart-first-order-saving">
                          First-order saving (10%): -R{getFirstOrderDiscount().toFixed(2)}
                        </p>
                      )}
                      <strong>Total: R{getTotalPrice().toFixed(2)}</strong>
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
                          style={{padding: '8px 16px', marginLeft: '8px', background: '#BEE7C1', color: '#126F71', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                        >
                          Apply
                        </button>
                        {voucherError && (
                          <p style={{color: '#dc3545', fontSize: '0.85em', marginTop: '4px'}}>{voucherError}</p>
                        )}
                      </div>
                    )}

                    {cartOnlyLocal ? renderLocalDeliverySelector() : renderImportShippingSelector()}
                    
                    <button 
                      className="proceed-checkout" 
                      onClick={handleCheckout}
                      disabled={hasStockIssues}
                      title={hasStockIssues ? 'Update cart: some items are out of stock or exceed available quantity' : 'Proceed to PayFast Checkout'}
                      style={hasStockIssues ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                    >
                      Proceed to PayFast Checkout
                    </button>
                    <PaymentMethodsStrip />
                    {hasStockIssues && (
                      <p style={{ color: '#dc3545', marginTop: '8px', fontSize: '0.9em' }}>
                        Please remove or adjust items marked "Sold out" before continuing.
                      </p>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Footer */}
          {(!showAdminDashboard || isStorePreviewActive) && (
          <footer className="footer" style={{ flexShrink: 0 }}>
            <TrustBadges />
            <div style={{ marginTop: '1.5rem' }}>
              <p>© 2025 SnuggleUp</p>
              <p>Made with <span className="heart">❤️</span> for all parents.</p>
              <p>Contact: support@snuggleup.co.za </p>
              <p style={{ marginTop: '0.5rem' }}>
                <a href="/about.html" style={{ color: '#999', marginRight: '1rem' }}>About SnuggleUp</a>
                <a href="#" onClick={() => setCurrentPage('privacy')} style={{ color: '#999', marginRight: '1rem' }}>Privacy Policy</a>
                <a href="#" onClick={() => setCurrentPage('shipping')} style={{ color: '#999', marginRight: '1rem' }}>Shipping Policy</a>
                <a href="#" onClick={() => setCurrentPage('returns')} style={{ color: '#999', marginRight: '1rem' }}>Returns Policy</a>
                <a href="#" onClick={() => setCurrentPage('terms')} style={{ color: '#999', marginRight: '1rem' }}>Terms of Service</a>
                <a href="#" onClick={() => setCurrentPage('data-deletion')} style={{ color: '#999' }}>Data Deletion</a>
                <a href="#/learning-centre" style={{ color: '#999', marginLeft: '1rem' }}>Learning Centre</a>
              </p>
            </div>
              <div className="footer-payment-trust" aria-label="Secure payments powered by PayFast">
                <p className="payment-trust-label">Secure checkout powered by PayFast</p>
                <div className="payfast-trust-panel" role="img" aria-label="PayFast safe and secure payments">
                  <div className="payfast-trust-main">
                    <div>
                      <div className="payfast-trust-logo">
                        <span>Pay</span>Fast
                      </div>
                      <div className="payfast-trust-company">A DPO Company</div>
                    </div>
                    <div className="payfast-trust-divider" />
                    <div className="payfast-trust-message">Safe and secure payments</div>
                  </div>
                  <div className="payfast-trust-methods" aria-hidden="true">
                    <span className="trust-method trust-method-eft">instant EFT</span>
                    <span className="trust-method trust-method-bank">ABSA</span>
                    <span className="trust-method trust-method-bank">FNB</span>
                    <span className="trust-method trust-method-bank">Nedbank</span>
                    <span className="trust-method trust-method-bank">Standard Bank</span>
                    <span className="trust-method trust-method-visa">VISA</span>
                    <span className="trust-method trust-method-mastercard">Mastercard</span>
                  </div>
                </div>
                <PaymentMethodsStrip compact />
              </div>
          </footer>
          )}

          {/* Shipping Form Modal */}
          {showShippingForm && (
            <ShippingForm
              onSubmit={handleShippingFormSubmit}
              onCancel={() => {
                setShowShippingForm(false);
                setShowCart(true);
              }}
              orderSummary={{
                itemCount: cartCount,
                subtotal: getSubtotal(),
                shipping: getImportShippingCost() + getLocalShippingCost(),
                total: getTotalPrice()
              }}
              shippingLabel={getLocalShippingMethod() || getImportShippingMethod() || 'Delivery'}
              // Prefill with user's name & email; previously entered values override
              initialData={{
                firstName: defaultCustomerName.split(' ')[0] || '',
                lastName: defaultCustomerName.split(' ').slice(1).join(' ') || '',
                email: user?.email,
                ...(shippingFormData || {})
              }}
              readonlyEmail={!!user?.email}
              hasLocalItems={hasLocal}
              localDeliveryMode={localDeliveryMode}
              localFreeDeliveryEligible={hasLocal && getSubtotal() > 600}
              localShippingQuotes={localShippingQuotes}
              selectedLocalShipping={selectedLocalShipping}
              localShippingLoading={localShippingLoading}
              localShippingError={localShippingError}
              onLocalDeliveryModeChange={(mode) => {
                setLocalDeliveryMode(mode);
                setSelectedLocalShipping(null);
                setLocalShippingError('');
              }}
              onLocalShippingSelect={(rate) => {
                setSelectedLocalShipping(rate);
                setLocalShippingError('');
              }}
              onCheckLocalShippingRates={fetchLocalShippingQuotes}
            />
          )}

          {/* Local Product Upload Modal */}
          {showLocalProductUpload && (
            <LocalProductUpload
              onClose={() => setShowLocalProductUpload(false)}
              onProductAdded={(newProduct) => {
                // Refresh local products by incrementing counter
                setLocalProductsRefresh(prev => prev + 1);
              }}
              token={token}
            />
          )}

          {/* Maintenance Mode Overlay */}
          {backendDown && (
            <MaintenanceMode 
              onRetry={() => {
                setBackendCheckFailed(0);
                setBackendDown(false);
                window.location.reload();
              }}
            />
          )}
        </>
      )}
      {/* These controls must be available from every page, not only the shop view. */}
      {showAuthModal && (
        <div
          className="auth-overlay"
          onPointerDown={(event) => {
            if (!event.target.closest('.auth-form')) setShowAuthModal(false);
          }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
        >
          <div style={{ width: 'min(560px, 92vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            {authView === 'login' ? <Login onClose={() => { setShowAuthModal(false); }} onSwitchToRegister={() => setAuthView('register')} />
              : authView === 'register' ? <Register onClose={() => { setShowAuthModal(false); }} onSwitchToLogin={() => setAuthView('login')} />
                : authView === 'forgot-password' ? <ForgotPassword onClose={() => { setShowAuthModal(false); }} onBackToLogin={() => setAuthView('login')} />
                  : authView === 'reset-password' ? <ResetPassword onClose={() => { setShowAuthModal(false); }} onBackToLogin={() => setAuthView('login')} /> : null}
          </div>
        </div>
      )}
      {showUserAccount && <UserAccount onClose={() => setShowUserAccount(false)} isAdmin={isAdmin} />}
      {showOrderTracking && <OrderTrackingLookup onClose={() => setShowOrderTracking(false)} />}
    </div>
  );
}

export default App;
