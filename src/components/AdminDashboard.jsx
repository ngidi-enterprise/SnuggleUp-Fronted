import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function AdminDashboard({ onClose, onStorePreview }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const { user, logout } = useAuth();
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

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

  const tabs = [
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
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <Analytics />;
      case 'products':
        return <ProductCuration />;
      case 'local-products':
        return <LocalProductManager />;
      case 'pricing':
        return <PricingManager />;
      case 'inventory':
        return <InventoryPanel />;
      case 'scheduler':
        return <SchedulerMonitor />;
      case 'store':
        return null; // Will show store through parent component
      case 'orders':
        return <OrderManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Analytics />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>🛡️ Admin Panel</h2>
          <p className="admin-user-info">{user?.email}</p>
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
