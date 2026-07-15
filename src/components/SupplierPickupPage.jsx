import React, { useEffect, useMemo, useState } from 'react';
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

  const itemSummary = useMemo(() => {
    const items = data?.order?.items || [];
    if (items.length === 0) return 'Order items';
    return items.slice(0, 3).map(item => `${item.quantity} x ${item.name}`).join(', ');
  }, [data]);

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
          <span className={`supplier-status-pill ${statusMeta.tone}`}>{statusMeta.title}</span>
          <strong>#{data.order.orderNumber}</strong>
        </div>

        <div className="supplier-order-card">
          <p className="supplier-label">Items</p>
          <h1>{data.order.itemCount || data.order.items.length}</h1>
          <p className="supplier-items">{itemSummary}</p>
          {data.order.trackingReference && (
            <p className="supplier-ref">Ref: {data.order.trackingReference}</p>
          )}
          {data.order.courier && (
            <p className="supplier-ref">Courier: {data.order.courier}</p>
          )}
          {data.order.waybillUrl && (
            <a className="supplier-waybill" href={data.order.waybillUrl} target="_blank" rel="noreferrer">
              Open waybill / tracking
            </a>
          )}
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
