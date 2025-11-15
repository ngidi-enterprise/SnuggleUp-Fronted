// Lightweight CJ API client for the frontend
// Uses backend proxy at /api/cj to avoid exposing CJ credentials

const DEFAULT_BASE = 'https://snuggleup-backend.onrender.com';
const PROD_BASE = 'https://api.snuggleup.co.za';
let resolvedBase = DEFAULT_BASE;
try {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host && (host === 'snuggleup.co.za' || host === 'www.snuggleup.co.za')) {
    resolvedBase = PROD_BASE;
  }
} catch {}
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE.replace(/\/$/, '')
  : resolvedBase;

async function http(path, { method = 'GET', query = {}, body, headers = {} } = {}) {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const error = (data && data.error) || res.statusText || 'Request failed';
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }

  return data;
}

export async function searchProducts({ q, pageNum = 1, pageSize = 20, minPrice, maxPrice, categoryId } = {}) {
  return http('/api/cj/products', {
    query: {
      productNameEn: q,
      pageNum,
      pageSize,
      minPrice,
      maxPrice,
      categoryId,
    },
  });
}

export async function getProduct(pid) {
  return http(`/api/cj/products/${encodeURIComponent(pid)}`);
}

export async function getInventory(vid) {
  return http(`/api/cj/inventory/${encodeURIComponent(vid)}`);
}

export async function getCuratedInventory() {
  return http('/api/cj/inventory/curated');
}

export async function syncInventory(token, limit) {
  return http('/api/cj/inventory/sync', {
    method: 'POST',
    body: { limit },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export async function createOrder(order) {
  return http('/api/cj/orders', { method: 'POST', body: order });
}

export const CJ_API_BASE = API_BASE;
