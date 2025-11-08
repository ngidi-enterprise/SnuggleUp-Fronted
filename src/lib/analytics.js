// Google Analytics 4 tracking utilities
// Replace G-XXXXXXXXXX with your actual GA4 Measurement ID

/**
 * Track page views in Single Page Application
 * @param {string} path - The page path (e.g., '/products', '/checkout')
 * @param {string} title - The page title
 */
export const trackPageView = (path, title = '') => {
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
