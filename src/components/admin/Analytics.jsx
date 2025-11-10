import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchAnalytics();
  }, []);

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
      const res = await fetch(`${API_BASE}/api/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Analytics response:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Analytics error response:', errorText);
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }

      const data = await res.json();
      setAnalytics(data);
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
