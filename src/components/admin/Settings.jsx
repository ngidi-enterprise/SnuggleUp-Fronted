import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStorefrontAnalyticsIdentity } from '../../lib/analytics';

export default function Settings() {
  const { token } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shippingFallbackEnabled, setShippingFallbackEnabled] = useState(false);
  const [deviceExclusion, setDeviceExclusion] = useState({ excluded: false, device: null });
  const [deviceSaving, setDeviceSaving] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [runtimeRes, deviceRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/config/runtime`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/analytics/admin-device`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          }),
        ]);
        const runtimeData = await runtimeRes.json();
        const deviceData = await deviceRes.json();
        if (!runtimeRes.ok) throw new Error(runtimeData.error || `HTTP ${runtimeRes.status}`);
        if (!deviceRes.ok) throw new Error(deviceData.error || `HTTP ${deviceRes.status}`);
        setShippingFallbackEnabled(!!runtimeData.shippingFallbackEnabled);
        setDeviceExclusion(deviceData);
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

  const updateDeviceExclusion = async (exclude) => {
    try {
      setDeviceSaving(true);
      setDeviceMessage('');
      const identity = getStorefrontAnalyticsIdentity();
      const res = await fetch(`${API_BASE}/api/analytics/admin-device`, {
        method: exclude ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          visitorId: identity.visitorId,
          label: 'My SnuggleUp admin browser',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDeviceExclusion(data);
      setDeviceMessage(exclude
        ? 'This browser will remain classified as superuser traffic after logout.'
        : 'This browser will be counted as customer traffic after you log out.'
      );
    } catch (e) {
      setDeviceMessage(`Unable to update this browser: ${e.message}`);
    } finally {
      setDeviceSaving(false);
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

      <h3 style={{ marginTop: 28 }}>Analytics Device Exclusion</h3>
      <div style={{ padding: 16, border: '1px solid #d8e7e5', borderRadius: 8, background: '#f8fcfb' }}>
        <p style={{ marginTop: 0, fontWeight: 700, color: '#243746' }}>
          Status: {deviceExclusion.excluded ? 'Excluded as superuser traffic' : 'Not securely registered'}
        </p>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
          Registering creates a secure, long-lasting cookie for this browser. The raw device token is never shown
          in reports and only its cryptographic hash is stored in the database.
        </p>
        {deviceExclusion.excluded ? (
          <button
            type="button"
            onClick={() => updateDeviceExclusion(false)}
            disabled={deviceSaving}
            style={{ padding: '10px 14px', cursor: deviceSaving ? 'wait' : 'pointer' }}
          >
            {deviceSaving ? 'Updating…' : 'Include this device in customer analytics again'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateDeviceExclusion(true)}
            disabled={deviceSaving}
            style={{
              padding: '10px 14px',
              border: 0,
              borderRadius: 6,
              background: '#126f71',
              color: '#fff',
              fontWeight: 700,
              cursor: deviceSaving ? 'wait' : 'pointer',
            }}
          >
            {deviceSaving ? 'Registering…' : 'Exclude this device from customer analytics'}
          </button>
        )}
        {deviceMessage && (
          <p role="status" style={{ marginBottom: 0, color: '#126f71', fontSize: 13 }}>
            {deviceMessage}
          </p>
        )}
      </div>
    </div>
  );
}
