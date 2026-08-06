// Google Analytics 4 plus privacy-safe first-party storefront insights.
// The first-party data is anonymous: random browser IDs, paths, and product metadata only.

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';
const SESSION_KEY = 'snuggleup_analytics_session';
const VISITOR_KEY = 'snuggleup_analytics_visitor';
const OPT_OUT_KEY = 'snuggleup_analytics_opt_out';
const EVENT_SEQUENCE_KEY = `${SESSION_KEY}:event_sequence`;
let activePage = null;
let analyticsPaused = false;
let analyticsAuthToken = '';
let scrollMilestones = new Set();
let currentPageLoadId = null;
const recentEvents = new Map();
const MANAGEMENT_ROUTE_PATTERNS = [
  /^\/admin(?:\/|$)/i,
  /^\/superuser(?:\/|$)/i,
  /^\/login\/admin(?:\/|$)/i,
  /^\/admin-login(?:\/|$)/i,
  /^\/management(?:\/|$)/i,
];

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
currentPageLoadId = randomId();

const AUTOMATIC_EVENT_NAMES = new Set([
  'session_start',
  'page_view',
  'page_exit',
  'product_view',
  'scroll_depth',
  'image_view',
]);

const shouldSuppressClientDuplicate = (eventName, details, pagePath, pageLoadId) => {
  const now = Date.now();
  const productId = details.productId || '';
  const eventValue = details.eventValue ?? '';
  const key = [
    eventName,
    pagePath,
    productId,
    eventValue,
    AUTOMATIC_EVENT_NAMES.has(eventName) ? pageLoadId : '',
  ].join('|');
  const windowMs = AUTOMATIC_EVENT_NAMES.has(eventName) ? 30 * 60 * 1000 : 1500;
  const lastSentAt = recentEvents.get(key);
  if (lastSentAt && now - lastSentAt < windowMs) return true;
  recentEvents.set(key, now);

  if (recentEvents.size > 250) {
    for (const [storedKey, sentAt] of recentEvents) {
      if (now - sentAt > 30 * 60 * 1000) recentEvents.delete(storedKey);
    }
  }
  return false;
};

const isManagementAnalyticsPath = (value) => {
  const path = String(value || '/').split('?')[0];
  return MANAGEMENT_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
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
const nextEventSequence = () => {
  try {
    const previous = Number.parseInt(window.sessionStorage.getItem(EVENT_SEQUENCE_KEY), 10);
    const next = Number.isSafeInteger(previous) && previous > 0 ? previous + 1 : 1;
    window.sessionStorage.setItem(EVENT_SEQUENCE_KEY, String(next));
    return next;
  } catch {
    return Date.now();
  }
};

const trafficSource = () => {
  const params = new URLSearchParams(window.location.search || '');
  const isGoogleAdsClick = Boolean(params.get('gclid'));
  const source = params.get('utm_source') || (isGoogleAdsClick ? 'google' : '');
  const medium = params.get('utm_medium') || (isGoogleAdsClick ? 'cpc' : '');
  const campaign = params.get('utm_campaign') || '';
  const utmTerm = params.get('utm_term') || '';
  const utmContent = params.get('utm_content') || '';
  const adGroup = params.get('utm_adgroup') || params.get('adgroup') || utmContent;
  const gclid = params.get('gclid') || '';
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch {}
  return { source, medium, campaign, utmTerm, utmContent, adGroup, gclid, referrerHost };
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
    || isManagementAnalyticsPath(window.location.pathname)
    || window.localStorage.getItem(OPT_OUT_KEY) === '1'
  ) return false;
  const pagePath = details.pagePath || window.location.pathname || '/';
  if (isManagementAnalyticsPath(pagePath)) return false;
  const pageLoadId = details.pageLoadId || activePage?.pageLoadId || currentPageLoadId;
  if (shouldSuppressClientDuplicate(eventName, details, pagePath, pageLoadId)) {
    return false;
  }
  const payload = {
    eventName,
    sessionId: getStorageId(SESSION_KEY, window.sessionStorage),
    visitorId: getStorageId(VISITOR_KEY, window.localStorage),
    pagePath,
    pageTitle: details.pageTitle || document.title || '',
    pageLoadId,
    clientOccurredAt: new Date().toISOString(),
    eventSequence: nextEventSequence(),
    ...trafficSource(),
    ...approximateRegion(),
    ...details,
  };
  const body = JSON.stringify(payload);
  try {
    if (eventName === 'page_exit' && !analyticsAuthToken && navigator.sendBeacon) {
      const queued = navigator.sendBeacon(
        `${API_BASE}/api/analytics/events`,
        new Blob([body], { type: 'application/json' })
      );
      if (queued) return;
    }
    const headers = { 'Content-Type': 'application/json' };
    if (analyticsAuthToken) headers.Authorization = `Bearer ${analyticsAuthToken}`;
    fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
      credentials: 'include',
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
};

const closeActivePage = () => {
  if (!activePage) return;
  const seconds = Math.max(0, Math.round((Date.now() - activePage.startedAt) / 1000));
  sendStorefrontEvent('page_exit', {
    pagePath: activePage.path,
    pageTitle: activePage.title,
    pageLoadId: activePage.pageLoadId,
    durationSeconds: seconds,
  });
  activePage = null;
};

export const setStorefrontAnalyticsPaused = (paused) => {
  analyticsPaused = Boolean(paused);
  if (analyticsPaused) activePage = null;
};

export const setStorefrontAnalyticsAuthToken = (token) => {
  analyticsAuthToken = String(token || '');
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
          pageLoadId: activePage.pageLoadId,
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
  currentPageLoadId = randomId();
  activePage = {
    path,
    title: title || document.title,
    pageLoadId: currentPageLoadId,
    startedAt: Date.now(),
  };
  const sessionId = getStorageId(SESSION_KEY, window.sessionStorage);
  if (!window.sessionStorage.getItem(`${SESSION_KEY}:started`)) {
    window.sessionStorage.setItem(`${SESSION_KEY}:started`, '1');
    sendStorefrontEvent('session_start', {
      pagePath: path,
      pageTitle: title || document.title,
      pageLoadId: currentPageLoadId,
      sessionId,
    });
  }
  const recorded = sendStorefrontEvent('page_view', {
    pagePath: path,
    pageTitle: title || document.title,
    pageLoadId: currentPageLoadId,
    sessionId,
  });
  if (!recorded) return;
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
  const recorded = sendStorefrontEvent('product_view', {
    productId: product.id || product.pid,
    productName: product.name || product.product_name || product.title,
    productCategory: product.category || product.product_category,
  });
  if (!recorded) return;
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
  sendStorefrontEvent('remove_from_cart', {
    productId: product.id || product.pid,
    productName: product.name || product.product_name,
    productCategory: product.category,
    eventValue: Math.max(1, Number(quantity) || 1),
  });
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
  sendStorefrontEvent('purchase', {
    productId: transactionId,
    productName: 'Completed order',
    eventValue: Array.isArray(items) ? items.length : 0,
  });
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

export const trackImageView = (product, imageIndex) => {
  sendStorefrontEvent('image_view', {
    productId: product?.id || product?.pid || product?.cj_pid,
    productName: product?.name || product?.product_name,
    eventValue: Math.max(1, Number(imageIndex) || 1),
  });
};

export const trackSectionOpen = (sectionName, product = null) => {
  sendStorefrontEvent('section_open', {
    productId: product?.id || product?.pid || product?.cj_pid,
    productName: product?.name || product?.product_name,
    pageTitle: String(sectionName || 'Product information').slice(0, 120),
  });
};
