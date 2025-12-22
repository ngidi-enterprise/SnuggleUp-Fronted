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
  const [diagnosticsResults, setDiagnosticsResults] = useState(null);
  const [showCJPayloads, setShowCJPayloads] = useState(false);
  const [cjPayloads, setCJPayloads] = useState(null);
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
      console.log('Starting diagnostics for order:', order.id);
      // Extract CJ PIDs from order items
      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch {
        items = [];
      }
      const pids = items.map(i => i.cj_pid).filter(Boolean);
      const postalCode = order.shipping_postal_code || '2196';
      console.log('Extracted PIDs:', pids, 'Postal Code:', postalCode);
      if (pids.length === 0) {
        alert('No CJ product IDs found in this order to diagnose.');
        return;
      }
      console.log('Calling diagnostics API with:', { pids, postalCode });
      const res = await fetch(`${API_BASE}/api/admin/cj/diagnose-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pids, postalCode })
      });
      const data = await res.json();
      console.log('API Response:', res.ok, data);
      if (!res.ok) {
        alert(`Diagnostics failed: ${data.error || 'Unknown error'}`);
        return;
      }
      // Store results and show modal
      console.log('Setting diagnostics results');
      setDiagnosticsResults({
        order,
        items,
        ...data
      });
    } catch (err) {
      console.error('Diagnostics error:', err);
      alert('Error running diagnostics: ' + err.message);
    } finally {
      setDiagnosingOrderId(null);
    }
  };

  const closeDiagnostics = () => {
    setDiagnosticsResults(null);
  };

  const fetchCJPayloads = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/cj/recent-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCJPayloads(data);
        setShowCJPayloads(true);
      } else {
        alert(`Failed to fetch CJ payloads: ${data.error}`);
      }
    } catch (err) {
      alert('Error fetching CJ payloads: ' + err.message);
    }
  };

  const closeCJPayloads = () => {
    setShowCJPayloads(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy: ' + err.message);
    });
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
          onClick={fetchCJPayloads}
        >
          📋 View CJ Payloads
        </button>
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

      {/* Diagnostics Results Modal */}
      {diagnosticsResults && (
        <div className="modal-overlay" onClick={closeDiagnostics}>
          <div className="modal-content diagnostics-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDiagnostics}>
              ✕
            </button>
            <h2>Shipping Logistics Diagnostics</h2>
            
            <div className="diagnostics-summary">
              <p><strong>Order:</strong> #{diagnosticsResults.order.order_number}</p>
              <p><strong>Status:</strong> <span className={`status-badge status-${diagnosticsResults.order.status}`}>{diagnosticsResults.order.status}</span></p>
              {diagnosticsResults.order.cj_order_id && (
                <p><strong>Supplier Order ID:</strong> {diagnosticsResults.order.cj_order_id}</p>
              )}
              <p><strong>Destination Postal Code:</strong> {diagnosticsResults.postalCode}</p>
              <p><strong>Products Analyzed:</strong> {diagnosticsResults.summary.total}</p>
              <p><strong>Products with Logistics:</strong> {diagnosticsResults.summary.withFreight} / {diagnosticsResults.summary.total}</p>
              
              {/* Show ID validation status */}
              {diagnosticsResults.order.shipping_id_number && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '6px', borderLeft: '4px solid #3498db' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>SA ID Number Check:</p>
                  <p style={{ margin: '0', fontSize: '13px' }}>
                    <strong>Stored ID:</strong> {diagnosticsResults.order.shipping_id_number}
                    {' '}({diagnosticsResults.order.shipping_id_number?.length} digits)
                  </p>
                  {diagnosticsResults.order.shipping_id_number?.length !== 13 && (
                    <p style={{ margin: '6px 0 0 0', color: '#e74c3c', fontSize: '13px', fontWeight: 600 }}>
                      ⚠️ ID is not 13 digits - CJ will reject this order
                    </p>
                  )}
                </div>
              )}
              {!diagnosticsResults.order.shipping_id_number && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#fff3cd', borderRadius: '6px', borderLeft: '4px solid #f39c12' }}>
                  <p style={{ margin: '0', fontSize: '13px', fontWeight: 600, color: '#856404' }}>
                    ⚠️ No SA ID Number stored - CJ will reject this order
                  </p>
                </div>
              )}
            </div>

            {(() => {
              const isSubmitted = !!diagnosticsResults.order.cj_order_id;
              const hasAllLogistics = diagnosticsResults.summary.withFreight === diagnosticsResults.summary.total;
              const isSingleProduct = diagnosticsResults.summary.total === 1;
              const hasCommonLogistics = diagnosticsResults.summary.commonLogistics?.length > 0;
              const hasValidId = diagnosticsResults.order.shipping_id_number?.length === 13;
              const canSubmit = hasAllLogistics && (isSingleProduct || hasCommonLogistics) && hasValidId;

              if (isSubmitted) {
                // Order already submitted
                return (
                  <div className="diagnostics-success">
                    <h3>✓ Order Already Submitted</h3>
                    <p>This order was successfully submitted to the supplier. The diagnostic below shows current shipping availability for reference.</p>
                  </div>
                );
              } else if (!hasValidId) {
                // ID validation failed
                return (
                  <div className="diagnostics-warning">
                    <h3>❌ Cannot Submit - Invalid SA ID</h3>
                    <p>The supplier requires a valid 13-digit South African ID number. This order is missing or has an invalid ID.</p>
                  </div>
                );
              } else if (canSubmit) {
                // Order can be submitted
                if (isSingleProduct) {
                  const logistics = Object.values(diagnosticsResults.summary.logisticsPerPid || {})[0] || [];
                  return (
                    <div className="diagnostics-success">
                      <h3>✓ Ready to Submit</h3>
                      <p>Single-product order with {logistics.length} available shipping method(s):</p>
                      <ul className="logistics-list">
                        {logistics.map((line, idx) => (
                          <li key={idx} className="logistics-item-success">{line}</li>
                        ))}
                      </ul>
                      <p style={{ marginTop: '12px', fontSize: '13px', color: '#555' }}>
                        <strong>Note:</strong> Shipping availability confirmed. However, the supplier may still reject orders for other reasons (product restrictions, inventory, etc.).
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="diagnostics-success">
                      <h3>✓ Ready to Submit</h3>
                      <p>These shipping methods work for ALL products in this order:</p>
                      <ul className="logistics-list">
                        {diagnosticsResults.summary.commonLogistics.map((line, idx) => (
                          <li key={idx} className="logistics-item-success">{line}</li>
                        ))}
                      </ul>
                      <p style={{ marginTop: '12px', fontSize: '13px', color: '#555' }}>
                        <strong>Note:</strong> Shipping availability confirmed. However, the supplier may still reject orders for other reasons (product restrictions, inventory, etc.).
                      </p>
                    </div>
                  );
                }
              } else if (!hasAllLogistics) {
                // Some products have no logistics
                return (
                  <div className="diagnostics-warning">
                    <h3>❌ Cannot Submit</h3>
                    <p>Some products cannot be shipped to this destination. Remove products without logistics before submitting.</p>
                  </div>
                );
              } else {
                // Multi-product order with no common logistics
                return (
                  <div className="diagnostics-warning">
                    <h3>⚠️ No Common Shipping Method</h3>
                    <p>These products cannot be shipped together in one order. They must be shipped separately or removed.</p>
                  </div>
                );
              }
            })()}

            <div className="diagnostics-details">
              <h3>Per-Product Breakdown</h3>
              <table className="diagnostics-table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Product Name</th>
                    <th>Available Shipping Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(diagnosticsResults.summary.logisticsPerPid || {}).map(([pid, logistics]) => {
                    const item = diagnosticsResults.items.find(i => i.cj_pid === pid);
                    const hasCommon = logistics.some(line => 
                      diagnosticsResults.summary.commonLogistics?.includes(line)
                    );
                    return (
                      <tr key={pid} className={logistics.length === 0 ? 'diagnostics-row-error' : ''}>
                        <td>{pid}</td>
                        <td>{item?.name || 'Unknown'}</td>
                        <td>
                          {logistics.length > 0 ? (
                            <ul className="logistics-inline-list">
                              {logistics.map((line, idx) => {
                                const isCommon = diagnosticsResults.summary.commonLogistics?.includes(line);
                                return (
                                  <li key={idx} className={isCommon ? 'logistics-common' : ''}>
                                    {line}
                                    {isCommon && ' ✓'}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <span className="no-logistics">❌ No shipping to destination</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!diagnosticsResults.order.cj_order_id && (
              <div className="diagnostics-actions">
                {(() => {
                  const hasAllLogistics = diagnosticsResults.summary.withFreight === diagnosticsResults.summary.total;
                  const isSingleProduct = diagnosticsResults.summary.total === 1;
                  const hasCommonLogistics = diagnosticsResults.summary.commonLogistics?.length > 0;
                  const canSubmit = hasAllLogistics && (isSingleProduct || hasCommonLogistics);

                  if (canSubmit) {
                    return (
                      <p className="diagnostics-hint">
                        ✓ This order can be submitted. The system will automatically select an available shipping method.
                      </p>
                    );
                  } else if (!hasAllLogistics) {
                    return (
                      <p className="diagnostics-hint">
                        ❌ Remove products without shipping availability before submitting.
                      </p>
                    );
                  } else {
                    return (
                      <p className="diagnostics-hint">
                        ⚠️ Products must be ordered separately—no shipping method supports all items together.
                      </p>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CJ Payloads Modal */}
      {showCJPayloads && cjPayloads && (
        <div className="modal-overlay" onClick={closeCJPayloads}>
          <div className="modal-content diagnostics-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '80vh', overflow: 'auto' }}>
            <button className="modal-close" onClick={closeCJPayloads}>
              ✕
            </button>
            <h2>Recent CJ Submissions</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              {cjPayloads.count} submission(s) stored in memory. Copy exact request/response JSON for CJ support.
            </p>

            {cjPayloads.submissions.map((sub, idx) => (
              <div key={idx} style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: sub.error ? '4px solid #e74c3c' : '4px solid #27ae60' }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Order:</strong> {sub.orderNumber} | <strong>Time:</strong> {new Date(sub.timestamp).toLocaleString()}
                  {sub.error && <span style={{ marginLeft: '12px', color: '#e74c3c', fontWeight: 600 }}>❌ Failed: {sub.error}</span>}
                  {!sub.error && <span style={{ marginLeft: '12px', color: '#27ae60', fontWeight: 600 }}>✓ Success</span>}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Request URL:</strong>
                  <code style={{ display: 'block', padding: '8px', background: '#fff', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>
                    {sub.url}
                  </code>
                  <button 
                    className="btn-small btn-secondary" 
                    style={{ marginTop: '6px' }}
                    onClick={() => copyToClipboard(sub.url)}
                  >
                    📋 Copy URL
                  </button>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Request Parameters (JSON):</strong>
                  <pre style={{ 
                    background: '#fff', 
                    padding: '12px', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    overflow: 'auto', 
                    maxHeight: '200px',
                    border: '1px solid #ddd'
                  }}>
                    {JSON.stringify(sub.request, null, 2)}
                  </pre>
                  <button 
                    className="btn-small btn-secondary" 
                    style={{ marginTop: '6px' }}
                    onClick={() => copyToClipboard(JSON.stringify(sub.request, null, 2))}
                  >
                    📋 Copy Request JSON
                  </button>
                </div>

                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Response Body (JSON):</strong>
                  <pre style={{ 
                    background: '#fff', 
                    padding: '12px', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    overflow: 'auto', 
                    maxHeight: '200px',
                    border: '1px solid #ddd'
                  }}>
                    {sub.response ? JSON.stringify(sub.response, null, 2) : '(No response body)'}
                  </pre>
                  {sub.response && (
                    <button 
                      className="btn-small btn-secondary" 
                      style={{ marginTop: '6px' }}
                      onClick={() => copyToClipboard(JSON.stringify(sub.response, null, 2))}
                    >
                      📋 Copy Response JSON
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
