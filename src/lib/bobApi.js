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

async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMessage = (data && data.error) || res.statusText || 'Request failed';
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
  }

  return data;
}

export async function checkBobHealth() {
  return http('/api/bob/health');
}

export async function testBobRates(payload) {
  return http('/api/bob/rates', {
    method: 'POST',
    body: payload,
  });
}

export async function testBobOrders(payload) {
  return http('/api/bob/orders', {
    method: 'POST',
    body: payload,
  });
}

export async function testBobShipments(payload) {
  return http('/api/bob/shipments', {
    method: 'POST',
    body: payload,
  });
}
