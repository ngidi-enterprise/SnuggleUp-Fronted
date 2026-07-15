import React, { useEffect, useState } from 'react';
import './SupplierPickupPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

const STATUS_COPY = {
  waiting: {
    title: 'Not collected yet',
    tone: 'waiting',
  },
  picked_up: {
    title: 'Collected',
    tone: 'success',
  },
  problem: {
    title: 'Problem',
    tone: 'problem',
  },
};

export default function SupplierPickupPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState('');

  const currentStatus = data?.order?.status || 'waiting';
  const statusMeta = STATUS_COPY[currentStatus] || STATUS_COPY.waiting;

  const items = data?.order?.items || [];

  const loadPickup = async () => {
    if (!token) {
      setError('Missing supplier link');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/supplier-pickup/${encodeURIComponent(token)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not load order');
      setData(payload);
      setNotes(payload.order?.notes || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPickup();
  }, [token]);

  const updateStatus = async (status) => {
    setSaving(status);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/supplier-pickup/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not save');
      setData(payload);
      setNotes(payload.order?.notes || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <main className="supplier-pickup-page">
        <section className="supplier-pickup-shell">
          <p className="supplier-loading">Loading order...</p>
        </section>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="supplier-pickup-page">
        <section className="supplier-pickup-shell">
          <div className="supplier-error">
            <strong>Link problem</strong>
            <p>{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="supplier-pickup-page">
      <section className="supplier-pickup-shell">
        <div className="supplier-topline">
          <div>
            <span className="supplier-brand">SnuggleUp</span>
            <strong>#{data.order.orderNumber}</strong>
          </div>
          <span className={`supplier-status-pill ${statusMeta.tone}`}>{statusMeta.title}</span>
        </div>

        <div className="supplier-order-card">
          <p className="supplier-label">Items</p>
          <h1>{data.order.itemCount || items.length}</h1>
          <ul className="supplier-items-list">
            {items.length > 0 ? (
              items.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  <strong>{item.quantity} x</strong>
                  <span>{item.name}</span>
                </li>
              ))
            ) : (
              <li>Items listed on order</li>
            )}
          </ul>
        </div>

        <div className="supplier-actions" aria-label="Supplier pickup actions">
          <button
            className="supplier-action collected"
            onClick={() => updateStatus('picked_up')}
            disabled={Boolean(saving)}
          >
            <span>✓</span>
            <strong>{saving === 'picked_up' ? 'Saving...' : 'Collected'}</strong>
          </button>

          <button
            className="supplier-action waiting"
            onClick={() => updateStatus('waiting')}
            disabled={Boolean(saving)}
          >
            <span>•</span>
            <strong>{saving === 'waiting' ? 'Saving...' : 'Not yet'}</strong>
          </button>

          <button
            className="supplier-action problem"
            onClick={() => updateStatus('problem')}
            disabled={Boolean(saving)}
          >
            <span>!</span>
            <strong>{saving === 'problem' ? 'Saving...' : 'Problem'}</strong>
          </button>
        </div>

        <label className="supplier-notes">
          <span>Optional note</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Example: Driver did not arrive"
            rows={3}
          />
        </label>

        {error && <p className="supplier-inline-error">{error}</p>}

        <div className="supplier-counts">
          <div>
            <span>Today</span>
            <strong>{data.summary?.pickedUpToday ?? 0}</strong>
          </div>
          <div>
            <span>This week</span>
            <strong>{data.summary?.pickedUpThisWeek ?? 0}</strong>
          </div>
        </div>

        {data.order.confirmedAt && (
          <p className="supplier-confirmed">
            Last collected: {new Date(data.order.confirmedAt).toLocaleString()}
          </p>
        )}
      </section>
    </main>
  );
}
