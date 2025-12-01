import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { token } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shippingFallbackEnabled, setShippingFallbackEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/admin/config/runtime`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setShippingFallbackEnabled(!!data.shippingFallbackEnabled);
        } else {
          setError(data.error || `HTTP ${res.status}`);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [API_BASE, token]);

  const toggleFallback = async (next) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/admin/config/shipping-fallback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: next })
      });
      const data = await res.json();
      if (res.ok) {
        setShippingFallbackEnabled(!!data.shippingFallbackEnabled);
      } else {
        alert('Failed to update setting: ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading settings...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h3>Runtime Settings</h3>
      <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, background: '#f9fafb' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={shippingFallbackEnabled}
            onChange={(e) => toggleFallback(e.target.checked)}
            disabled={saving}
          />
          Use fallback shipping estimates when supplier returns zero/none
        </label>
        <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
          When enabled, checkout shows estimated shipping based on order subtotal if real quotes are unavailable.
        </p>
      </div>
    </div>
  );
}
