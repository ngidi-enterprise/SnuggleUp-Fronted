import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submittingOrderId, setSubmittingOrderId] = useState(null);
  const [diagnosingOrderId, setDiagnosingOrderId] = useState(null);
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

  const submitToCJ = async (orderId) => {
    if (!confirm('Submit this order to CJ Dropshipping for fulfillment?')) {
      return;
    }

    setSubmittingOrderId(orderId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}/submit-to-cj`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✓ Order submitted to CJ successfully!\nCJ Order ID: ${data.cjOrderId}\nCJ Order #: ${data.cjOrderNumber}`);
        fetchOrders(); // Refresh orders to show updated CJ status
      } else {
        // Error occurred, but order might have been created anyway (CJ quirk)
        // Refresh orders to check if order was actually created
        await fetchOrders();
        
        // Re-fetch to check if this specific order now has CJ info
        const checkRes = await fetch(`${API_BASE}/api/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        const updatedOrder = checkData.orders?.find(o => o.id === orderId);
        
        if (updatedOrder?.cj_order_id) {
          // Order WAS created despite the error!
          alert(`⚠️ Order was submitted to CJ despite error.\nCJ Order ID: ${updatedOrder.cj_order_id}\nCJ Order #: ${updatedOrder.cj_order_number}\n\nError was: ${data.details || data.error}`);
        } else {
          // Order really wasn't created
          alert(`Failed to submit order to CJ:\n${data.error}\n${data.details || ''}`);
        }
      }
    } catch (err) {
      alert('Error submitting order to CJ: ' + err.message);
      // Still refresh to see if order was created
      try {
        await fetchOrders();
      } catch (e) {
        console.error('Error refreshing orders:', e);
      }
    } finally {
      setSubmittingOrderId(null);
    }
  };

  const diagnoseOrder = async (order) => {
    try {
      setDiagnosingOrderId(order.id);
      // Extract CJ PIDs from order items
      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch {
        items = [];
      }
      const pids = items.map(i => i.cj_pid).filter(Boolean);
      const postalCode = order.shipping_postal_code || '2196';
      if (pids.length === 0) {
        alert('No CJ product IDs found in this order to diagnose.');
        return;
      }
      const res = await fetch(`${API_BASE}/api/admin/cj/diagnose-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pids, postalCode })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Diagnostics failed: ${data.error || 'Unknown error'}`);
        return;
      }
      const summary = data.summary || {};
      const perPid = summary.logisticsPerPid || {};
      const lines = Object.entries(perPid).map(([pid, lines]) => `• ${pid}: ${lines.join(', ') || 'No logistics to ZA'}`).join('\n');
      alert(`Diagnostics complete (postal ${data.postalCode}):\n\n${lines}\n\nWith freight: ${summary.withFreight}/${summary.total}`);
    } catch (err) {
      alert('Error running diagnostics: ' + err.message);
    } finally {
      setDiagnosingOrderId(null);
    }
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
        <button
          className="btn-small btn-secondary"
          onClick={async () => {
            try {
              const res = await fetch(`${API_BASE}/api/admin/orders/create-test`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (res.ok) {
                alert(`✓ Test order created!\nOrder #: ${data.orderNumber}\nStatus: ${data.status}`);
                fetchOrders();
              } else {
                alert(`Failed: ${data.error}`);
              }
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }}
        >
          + Create Test Order
        </button>
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
              <th>CJ Status</th>
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
                    {order.cj_order_id ? (
                      <div className="cj-status">
                        <span className={`status-badge status-cj-${(order.cj_status || 'submitted').toLowerCase()}`}>
                          {order.cj_status || 'SUBMITTED'}
                        </span>
                        {order.cj_tracking_number && (
                          <div className="cj-tracking">
                            <small>Track: {order.cj_tracking_number}</small>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="cj-status-none">Not submitted</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-small btn-primary"
                      onClick={() => viewOrderDetails(order)}
                    >
                      View
                    </button>
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => diagnoseOrder(order)}
                      disabled={diagnosingOrderId === order.id}
                    >
                      {diagnosingOrderId === order.id ? 'Diagnosing…' : 'Diagnose Logistics'}
                    </button>
                    {order.status === 'paid' && !order.cj_order_id && (
                      <button
                        className="btn-small btn-success"
                        onClick={() => submitToCJ(order.id)}
                        disabled={submittingOrderId === order.id}
                      >
                        {submittingOrderId === order.id ? 'Submitting...' : 'Submit to CJ'}
                      </button>
                    )}
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
              {selectedOrder.cj_order_id && (
                <>
                  <p>
                    <strong>CJ Order ID:</strong> {selectedOrder.cj_order_id}
                  </p>
                  <p>
                    <strong>CJ Order Number:</strong> {selectedOrder.cj_order_number}
                  </p>
                  <p>
                    <strong>CJ Status:</strong>{' '}
                    <span className={`status-badge status-cj-${(selectedOrder.cj_status || 'submitted').toLowerCase()}`}>
                      {selectedOrder.cj_status || 'SUBMITTED'}
                    </span>
                  </p>
                  {selectedOrder.cj_tracking_number && (
                    <>
                      <p>
                        <strong>Tracking Number:</strong> {selectedOrder.cj_tracking_number}
                      </p>
                      {selectedOrder.cj_tracking_url && (
                        <p>
                          <strong>Track Shipment:</strong>{' '}
                          <a href={selectedOrder.cj_tracking_url} target="_blank" rel="noopener noreferrer">
                            View Tracking
                          </a>
                        </p>
                      )}
                    </>
                  )}
                  <p>
                    <strong>Submitted to CJ:</strong> {new Date(selectedOrder.cj_submitted_at).toLocaleString()}
                  </p>
                </>
              )}
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
