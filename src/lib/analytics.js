// Google Analytics 4 plus privacy-safe first-party storefront insights.
// The first-party data is anonymous: random browser IDs, paths, and product metadata only.

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';
const SESSION_KEY = 'snuggleup_analytics_session';
const VISITOR_KEY = 'snuggleup_analytics_visitor';
const OPT_OUT_KEY = 'snuggleup_analytics_opt_out';
let activePage = null;
let analyticsPaused = false;
let scrollMilestones = new Set();

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getStorageId = (key, storage) => {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = randomId();
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return randomId();
  }
};

const trafficSource = () => {
  const params = new URLSearchParams(window.location.search || '');
  const isGoogleAdsClick = Boolean(params.get('gclid'));
  const source = params.get('utm_source') || (isGoogleAdsClick ? 'google' : '');
  const medium = params.get('utm_medium') || (isGoogleAdsClick ? 'cpc' : '');
  const campaign = params.get('utm_campaign') || '';
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch {}
  return { source, medium, campaign, referrerHost };
};

const approximateRegion = () => {
  let timezoneName = '';
  try { timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  return {
    timezoneName,
    browserLocale: navigator.language || '',
  };
};

const sendStorefrontEvent = (eventName, details = {}) => {
  if (
    analyticsPaused
    || typeof window === 'undefined'
    || window.location.pathname.startsWith('/admin')
    || window.localStorage.getItem(OPT_OUT_KEY) === '1'
  ) return;
  const payload = {
    eventName,
    sessionId: getStorageId(SESSION_KEY, window.sessionStorage),
    visitorId: getStorageId(VISITOR_KEY, window.localStorage),
    pagePath: details.pagePath || window.location.pathname || '/',
    pageTitle: details.pageTitle || document.title || '',
    ...trafficSource(),
    ...approximateRegion(),
    ...details,
  };
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_BASE}/api/analytics/events`, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(`${API_BASE}/api/analytics/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {}
};

const closeActivePage = () => {
  if (!activePage) return;
  const seconds = Math.max(0, Math.round((Date.now() - activePage.startedAt) / 1000));
  sendStorefrontEvent('page_exit', { pagePath: activePage.path, pageTitle: activePage.title, durationSeconds: seconds });
  activePage = null;
};

export const setStorefrontAnalyticsPaused = (paused) => {
  analyticsPaused = Boolean(paused);
  if (analyticsPaused) activePage = null;
};

export const getStorefrontAnalyticsIdentity = () => ({
  sessionId: getStorageId(SESSION_KEY, window.sessionStorage),
  visitorId: getStorageId(VISITOR_KEY, window.localStorage),
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', closeActivePage);
  window.addEventListener('scroll', () => {
    if (!activePage || analyticsPaused) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    [25, 50, 75, 90].forEach((milestone) => {
      if (depth >= milestone && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        sendStorefrontEvent('scroll_depth', {
          pagePath: activePage.path,
          pageTitle: activePage.title,
          eventValue: milestone,
        });
      }
    });
  }, { passive: true });
}

/**
 * Track page views in Single Page Application
 * @param {string} path - The page path (e.g., '/products', '/checkout')
 * @param {string} title - The page title
 */
export const trackPageView = (path, title = '') => {
  if (activePage?.path === path) return;
  closeActivePage();
  scrollMilestones = new Set();
  activePage = { path, title: title || document.title, startedAt: Date.now() };
  const sessionId = getStorageId(SESSION_KEY, window.sessionStorage);
  if (!window.sessionStorage.getItem(`${SESSION_KEY}:started`)) {
    window.sessionStorage.setItem(`${SESSION_KEY}:started`, '1');
    sendStorefrontEvent('session_start', { pagePath: path, pageTitle: title || document.title, sessionId });
  }
  sendStorefrontEvent('page_view', { pagePath: path, pageTitle: title || document.title, sessionId });
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title,
      page_location: window.location.href
    });
  }
};

/**
 * Track product views
 * @param {object} product - Product data
 */
export const trackProductView = (product) => {
  sendStorefrontEvent('product_view', {
    productId: product.id || product.pid,
    productName: product.name,
    productCategory: product.category,
  });
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'view_item', {
      currency: 'ZAR',
      value: product.price,
      items: [{
        item_id: product.id || product.pid,
        item_name: product.name,
        item_category: product.category,
        price: product.price
      }]
    });
  }
};

/**
 * Track add to cart events
 * @param {object} product - Product data
 * @param {number} quantity - Quantity added
 */
export const trackAddToCart = (product, quantity = 1) => {
  sendStorefrontEvent('add_to_cart', {
    productId: product.id || product.pid,
    productName: product.name,
    productCategory: product.category,
  });
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'add_to_cart', {
      currency: 'ZAR',
      value: product.price * quantity,
      items: [{
        item_id: product.id || product.pid,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity
      }]
    });
  }
};

/**
 * Track remove from cart events
 * @param {object} product - Product data
 * @param {number} quantity - Quantity removed
 */
export const trackRemoveFromCart = (product, quantity = 1) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'remove_from_cart', {
      currency: 'ZAR',
      value: product.price * quantity,
      items: [{
        item_id: product.id || product.pid,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: quantity
      }]
    });
  }
};

/**
 * Track begin checkout
 * @param {array} cartItems - Array of cart items
 * @param {number} totalValue - Total cart value
 */
export const trackBeginCheckout = (cartItems, totalValue) => {
  sendStorefrontEvent('begin_checkout');
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'begin_checkout', {
      currency: 'ZAR',
      value: totalValue,
      items: cartItems.map(item => ({
        item_id: item.id || item.pid,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity
      }))
    });
  }
};

/**
 * Track purchase/conversion
 * @param {string} transactionId - Order/transaction ID
 * @param {array} items - Array of purchased items
 * @param {number} total - Total purchase amount
 * @param {number} shipping - Shipping cost
 * @param {number} tax - Tax amount (if applicable)
 */
export const trackPurchase = (transactionId, items, total, shipping = 0, tax = 0) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      currency: 'ZAR',
      value: total,
      shipping: shipping,
      tax: tax,
      items: items.map(item => ({
        item_id: item.id || item.pid,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity
      }))
    });
  }
};

/**
 * Track search queries
 * @param {string} searchTerm - The search term
 */
export const trackSearch = (searchTerm) => {
  sendStorefrontEvent('search', { pageTitle: 'Product search' });
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  }
};

/**
 * Track user login
 * @param {string} method - Login method (e.g., 'email', 'google')
 */
export const trackLogin = (method = 'email') => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'login', {
      method: method
    });
  }
};

/**
 * Track user sign up
 * @param {string} method - Sign up method (e.g., 'email', 'google')
 */
export const trackSignUp = (method = 'email') => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'sign_up', {
      method: method
    });
  }
};

/**
 * Track custom events
 * @param {string} eventName - Custom event name
 * @param {object} params - Event parameters
 */
export const trackEvent = (eventName, params = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

export const trackProductClick = (product) => {
  sendStorefrontEvent('product_click', {
    productId: product?.id || product?.pid,
    productName: product?.name || product?.product_name,
    productCategory: product?.category,
  });
};

export const trackCategoryView = (categoryName) => {
  sendStorefrontEvent('category_view', {
    pageTitle: String(categoryName || 'Product category').slice(0, 120),
  });
};

export const trackPaymentStarted = () => {
  sendStorefrontEvent('payment_started', { pageTitle: 'PayFast payment opened' });
};
