import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Analytics from './admin/Analytics';
import ProductCuration from './admin/ProductCuration';
import PricingManager from './admin/PricingManager';
import OrderManagement from './admin/OrderManagement';
import UserManagement from './admin/UserManagement';
import InventoryPanel from './admin/InventoryPanel';
import SchedulerMonitor from './admin/SchedulerMonitor';
import LocalProductManager from './admin/LocalProductManager';
import Settings from './admin/Settings';
import './AdminDashboard.css';

export default function AdminDashboard({ onClose, onStorePreview, access = {} }) {
  const isSuperuser = Boolean(access.isSuperuser);
  const isProductAssistant = Boolean(access.isProductAssistant);
  const [activeTab, setActiveTab] = useState(isProductAssistant && !isSuperuser ? 'local-products' : 'analytics');
  const [assistantStats, setAssistantStats] = useState({ uploaded: 0, approved: 0 });
  const { user, logout } = useAuth();
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  const sidebarIdentity = isProductAssistant && !isSuperuser ? 'MOESHA' : user?.email;

  // Notify parent when store preview is active
  useEffect(() => {
    if (onStorePreview) {
      onStorePreview(activeTab === 'store');
    }
  }, [activeTab, onStorePreview]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      console.log('⏰ Admin session expired due to inactivity');
      logout();
      onClose();
      alert('Your admin session has expired due to inactivity. Please log in again.');
    }, INACTIVITY_TIMEOUT);
  }, [logout, onClose]);

  // Track user activity
  useEffect(() => {
    // Start the timer when component mounts
    resetInactivityTimer();

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Reset timer on any activity
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [resetInactivityTimer]);

  const allTabs = useMemo(() => [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'products', label: 'Product Curator', icon: '🛍️' },
    { id: 'local-products', label: 'Local Warehouse', icon: '🏭' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'scheduler', label: 'Scheduler Monitor', icon: '⏱️' },
    { id: 'store', label: 'Store Preview', icon: '🏪' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ], []);

  const tabs = useMemo(
    () => (isSuperuser ? allTabs : allTabs.filter((tab) => tab.id === 'local-products')),
    [allTabs, isSuperuser]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'local-products');
    }
  }, [activeTab, tabs]);

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return isSuperuser ? <Analytics /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'products':
        return isSuperuser ? <ProductCuration /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'local-products':
        return <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'pricing':
        return isSuperuser ? <PricingManager /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'inventory':
        return isSuperuser ? <InventoryPanel /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'scheduler':
        return isSuperuser ? <SchedulerMonitor /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'store':
        return null; // Will show store through parent component
      case 'orders':
        return isSuperuser ? <OrderManagement /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'users':
        return isSuperuser ? <UserManagement /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      case 'settings':
        return isSuperuser ? <Settings /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
      default:
        return isSuperuser ? <Analytics /> : <LocalProductManager access={access} onProductStatsChange={setAssistantStats} />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>{isSuperuser ? 'Superuser Panel' : 'SnuggleUp Team Panel'}</h2>
          <p className="admin-user-info">{sidebarIdentity}</p>
          <p className="admin-role-label">{isSuperuser ? 'Superuser' : 'Team Assistant'}</p>
          {isProductAssistant && !isSuperuser && (
            <div className="assistant-sidebar-stats" aria-label="Product upload summary">
              <div className="assistant-stat">
                <span className="assistant-stat-value">{assistantStats.uploaded}</span>
                <span className="assistant-stat-label">Uploaded</span>
              </div>
              <div className="assistant-stat">
                <span className="assistant-stat-value">{assistantStats.approved}</span>
                <span className="assistant-stat-label">Approved</span>
              </div>
            </div>
          )}
        </div>
        <nav className="admin-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="admin-nav-icon">{tab.icon}</span>
              <span className="admin-nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {activeTab === 'store' ? null : (
        <div className="admin-content">
          <div className="admin-content-header">
            <h1>{tabs.find((t) => t.id === activeTab)?.label}</h1>
          </div>
          <div className="admin-content-body">{renderContent()}</div>
        </div>
      )}
    </div>
  );
}
