import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `${API_BASE}/api/admin/orders?status=${statusFilter}`
        : `${API_BASE}/api/admin/orders`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchOrders();
      } else {
        alert('Failed to update order status');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  if (loading) return <div className="admin-loading">Loading orders...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="order-management-container">
      <div className="order-filters">
        <label>Filter by Status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Orders</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              let items = [];
              try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              } catch {
                items = [];
              }

              return (
                <tr key={order.id}>
                  <td>#{order.order_number}</td>
                  <td>{order.customer_email}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>{items.length} item(s)</td>
                  <td>R {Number(order.total).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-small btn-primary"
                      onClick={() => viewOrderDetails(order)}
                    >
                      View
                    </button>
                    {order.status === 'pending' && (
                      <select
                        className="status-select"
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Change Status
                        </option>
                        <option value="completed">Mark Completed</option>
                        <option value="cancelled">Cancel</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetails}>
          <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeOrderDetails}>
              ✕
            </button>
            <h2>Order Details</h2>

            <div className="order-details-section">
              <h3>Order Information</h3>
              <p>
                <strong>Order Number:</strong> #{selectedOrder.order_number}
              </p>
              <p>
                <strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`status-badge status-${selectedOrder.status}`}>
                  {selectedOrder.status}
                </span>
              </p>
            </div>

            <div className="order-details-section">
              <h3>Customer Information</h3>
              <p>
                <strong>Email:</strong> {selectedOrder.customer_email}
              </p>
              <p>
                <strong>User ID:</strong> {selectedOrder.user_id}
              </p>
            </div>

            <div className="order-details-section">
              <h3>Order Items</h3>
              <table className="order-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    try {
                      const items =
                        typeof selectedOrder.items === 'string'
                          ? JSON.parse(selectedOrder.items)
                          : selectedOrder.items;
                      return items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>R {Number(item.price).toFixed(2)}</td>
                        </tr>
                      ));
                    } catch {
                      return (
                        <tr>
                          <td colSpan="2">Unable to parse items</td>
                        </tr>
                      );
                    }
                  })()}
                </tbody>
              </table>
            </div>

            <div className="order-details-section">
              <h3>Payment Summary</h3>
              <p>
                <strong>Subtotal:</strong> R {Number(selectedOrder.subtotal).toFixed(2)}
              </p>
              <p>
                <strong>Shipping:</strong> R {Number(selectedOrder.shipping).toFixed(2)}
              </p>
              <p>
                <strong>Discount:</strong> R {Number(selectedOrder.discount || 0).toFixed(2)}
              </p>
              <p>
                <strong>Total:</strong> R {Number(selectedOrder.total).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
