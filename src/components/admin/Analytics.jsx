import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    console.log('Analytics Debug:', {
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      apiBase: API_BASE,
      hasToken: !!token
    });
    
    if (!token) {
      setError('No authentication token available. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      const [res, trafficRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/api/admin/traffic-insights`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      console.log('Analytics response:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Analytics error response:', errorText);
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }

      const data = await res.json();
      setAnalytics(data);
      if (trafficRes.ok) {
        setTraffic(await trafficRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="admin-error">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="admin-error">No analytics data available</div>;
  }

  const { summary, dailyOrders, topProducts } = analytics;
  const trafficSummary = traffic?.summary || {};
  const formatNumber = (value) => Number(value || 0).toLocaleString('en-ZA');
  const formatDuration = (seconds) => {
    const value = Number(seconds || 0);
    return value >= 60 ? `${Math.floor(value / 60)}m ${value % 60}s` : `${value}s`;
  };

  return (
    <div className="analytics-container">
      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="analytics-card">
          <div className="analytics-card-icon">💰</div>
          <div className="analytics-card-content">
            <h3>Total Revenue</h3>
            <p className="analytics-card-value">
              R {Number(summary.total_revenue || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">📦</div>
          <div className="analytics-card-content">
            <h3>Total Orders</h3>
            <p className="analytics-card-value">{summary.total_orders || 0}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">✅</div>
          <div className="analytics-card-content">
            <h3>Completed</h3>
            <p className="analytics-card-value">{summary.completed_orders || 0}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">⏳</div>
          <div className="analytics-card-content">
            <h3>Pending</h3>
            <p className="analytics-card-value">{summary.pending_orders || 0}</p>
          </div>
        </div>
      </div>

      <div className="analytics-section" style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Store traffic and interest</h2>
          <span style={{ color: '#637381', fontSize: '0.9rem' }}>{traffic?.period || 'Last 30 days'}</span>
        </div>
        {!traffic ? (
          <p style={{ color: '#637381' }}>Traffic tracking is ready. The first visitor data will appear here shortly.</p>
        ) : (
          <>
            <div className="analytics-summary" style={{ marginTop: '16px' }}>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Visitors</h3><p className="analytics-card-value">{formatNumber(trafficSummary.visitors)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Sessions</h3><p className="analytics-card-value">{formatNumber(trafficSummary.sessions)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Page views</h3><p className="analytics-card-value">{formatNumber(trafficSummary.page_views)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Product views</h3><p className="analytics-card-value">{formatNumber(trafficSummary.product_views)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Average visit time</h3><p className="analytics-card-value">{formatDuration(trafficSummary.average_seconds)}</p></div></div>
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Where visitors come from</h3>
              {traffic.sources?.length ? (
                <table><thead><tr><th>Source</th><th>Medium</th><th>Sessions</th></tr></thead><tbody>
                  {traffic.sources.map((item, index) => <tr key={`${item.source}-${index}`}><td>{item.source}</td><td>{item.medium}</td><td>{formatNumber(item.sessions)}</td></tr>)}
                </tbody></table>
              ) : <p>No traffic sources recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most visited pages</h3>
              {traffic.pages?.length ? (
                <table><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>
                  {traffic.pages.map((item, index) => <tr key={`${item.page_path}-${index}`}><td>{item.page_title || item.page_path}</td><td>{formatNumber(item.views)}</td></tr>)}
                </tbody></table>
              ) : <p>No page views recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most viewed products</h3>
              {traffic.products?.length ? (
                <table><thead><tr><th>Product</th><th>Views</th><th>Clicks</th><th>Added to cart</th></tr></thead><tbody>
                  {traffic.products.map((item) => <tr key={item.product_id}><td>{item.product_name || item.product_id}</td><td>{formatNumber(item.views)}</td><td>{formatNumber(item.clicks)}</td><td>{formatNumber(item.add_to_cart)}</td></tr>)}
                </tbody></table>
              ) : <p>No product interest recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most active visiting times</h3>
              {traffic.popularHours?.length ? <p>{traffic.popularHours.map((item) => `${String(item.hour).padStart(2, '0')}:00 (${formatNumber(item.sessions)} sessions)`).join('   |   ')}</p> : <p>No session data recorded yet.</p>}
            </div>
          </>
        )}
      </div>

      {/* Daily Orders Chart */}
      <div className="analytics-section">
        <h2>📈 Sales Last 30 Days</h2>
        <div className="analytics-chart">
          {dailyOrders && dailyOrders.length > 0 ? (
            <div className="bar-chart">
              {dailyOrders.slice(0, 10).reverse().map((day) => {
                const maxRevenue = Math.max(...dailyOrders.map((d) => Number(d.revenue || 0)));
                const height = maxRevenue > 0 ? (Number(day.revenue || 0) / maxRevenue) * 200 : 10;
                
                return (
                  <div key={day.date} className="bar-chart-item">
                    <div className="bar-chart-label">
                      {new Date(day.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="bar-chart-bar-container">
                      <div
                        className="bar-chart-bar"
                        style={{ height: `${height}px` }}
                        title={`R ${Number(day.revenue || 0).toFixed(2)}`}
                      >
                        <span className="bar-chart-value">R {Number(day.revenue || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No sales data available</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="analytics-section">
        <h2>🏆 Top Selling Products</h2>
        <div className="analytics-table">
          {topProducts && topProducts.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Times Ordered</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td>{product.product_name || 'Unknown Product'}</td>
                    <td>{product.times_ordered}</td>
                    <td>R {Number(product.total_revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No product data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
