import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SchedulerMonitor() {
  const { token } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  const fetchHealth = async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/api/admin/scheduler-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError('');
    } catch (err) {
      setError('Failed to load scheduler health: ' + err.message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const downloadReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduler-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scheduler-report-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download report: ' + err.message);
    }
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-ZA', { 
      timeZone: 'Africa/Johannesburg',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const StatusBadge = ({ status, overdue }) => {
    if (overdue) {
      return <span style={{ background: '#e74c3c', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '12px' }}>⚠️ OVERDUE</span>;
    }
    return <span style={{ background: '#27ae60', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: '12px' }}>✅ ON TIME</span>;
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading scheduler health...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>⏱️ Scheduler Monitor</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
            /> 
            Auto-refresh (30s)
          </label>
          <button 
            onClick={fetchHealth} 
            disabled={refreshing}
            style={{
              padding: '6px 12px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1
            }}
          >
            {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
          <button 
            onClick={downloadReport}
            style={{
              padding: '6px 12px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            📄 Download Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffe6e6', color: '#c0392b', padding: '10px', borderRadius: 4, marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Warnings */}
          {health.systemHealth.warnings.length > 0 && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '12px', borderRadius: 4, marginBottom: '20px' }}>
              <strong>⚠️ Alerts:</strong>
              <ul style={{ margin: '8px 0 0 20px' }}>
                {health.systemHealth.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Inventory Sync */}
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: 8, 
            padding: '16px', 
            marginBottom: '20px',
            background: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>🗃️ Inventory Sync</h3>
              <StatusBadge status={health.inventorySync.enabled} overdue={health.inventorySync.overdue} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Status</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {health.inventorySync.enabled ? '✅ ENABLED' : '❌ DISABLED'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Last Run</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatTime(health.inventorySync.lastExecution)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Runs</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {health.inventorySync.totalRuns}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Success Rate</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: health.inventorySync.successRate >= 90 ? '#27ae60' : '#e67e22' }}>
                  {health.inventorySync.successRate !== null ? `${health.inventorySync.successRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Duration</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatDuration(health.inventorySync.avgDurationMs)}
                </div>
              </div>
            </div>

            {health.inventorySync.recentRuns.length > 0 && (
              <div style={{ background: 'white', padding: '12px', borderRadius: 4 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Recent Runs:</div>
                <div style={{ fontSize: '12px' }}>
                  {health.inventorySync.recentRuns.map((run, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: i < health.inventorySync.recentRuns.length - 1 ? '1px solid #eee' : 'none' }}>
                      <span style={{ color: run.status === 'success' ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>
                        {run.status === 'success' ? '✅' : '⚠️'}
                      </span>
                      {' '}{formatTime(run.timestamp)} - {run.status.toUpperCase()} (updated: {run.updated}/{run.processed}, {formatDuration(run.durationMs)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Sync */}
          <div style={{ 
            border: '1px solid #ddd', 
            borderRadius: 8, 
            padding: '16px',
            background: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>💰 Price Sync</h3>
              <StatusBadge status={health.priceSync.enabled} overdue={health.priceSync.overdue} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Status</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {health.priceSync.enabled ? '✅ ENABLED' : '❌ DISABLED'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Last Run</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatTime(health.priceSync.lastExecution)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Total Runs</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {health.priceSync.totalRuns}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Success Rate</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: health.priceSync.successRate >= 90 ? '#27ae60' : '#e67e22' }}>
                  {health.priceSync.successRate !== null ? `${health.priceSync.successRate.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Duration</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatDuration(health.priceSync.avgDurationMs)}
                </div>
              </div>
            </div>

            {health.priceSync.recentRuns.length > 0 && (
              <div style={{ background: 'white', padding: '12px', borderRadius: 4 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Recent Runs:</div>
                <div style={{ fontSize: '12px' }}>
                  {health.priceSync.recentRuns.map((run, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: i < health.priceSync.recentRuns.length - 1 ? '1px solid #eee' : 'none' }}>
                      <span style={{ color: run.status === 'success' ? '#27ae60' : '#e67e22', fontWeight: 'bold' }}>
                        {run.status === 'success' ? '✅' : '⚠️'}
                      </span>
                      {' '}{formatTime(run.timestamp)} - {run.status.toUpperCase()} (synced: {run.synced}, changes: {run.priceChanges}, {formatDuration(run.durationMs)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* System Health */}
          <div style={{ 
            marginTop: '20px',
            padding: '12px',
            background: '#e8f5e9',
            borderRadius: 4,
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>System Health</div>
            <div>Uptime: {(health.systemHealth.uptime / 3600).toFixed(1)} hours</div>
            <div>Memory: {(health.systemHealth.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB / {(health.systemHealth.memoryUsage.heapTotal / 1024 / 1024).toFixed(1)}MB</div>
          </div>
        </>
      )}
    </div>
  );
}
