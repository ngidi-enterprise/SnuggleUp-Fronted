import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    if (!confirm(`${currentStatus ? 'Remove' : 'Grant'} superuser access for this user?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_admin: !currentStatus }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to update user');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const updateUserRole = async (userId, role) => {
    if (role === 'superuser' && !confirm('Give this user full superuser access?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const roleLabel = (role, isAdmin) => {
    if (role === 'product_assistant') return 'Product assistant';
    if (role === 'superuser' || isAdmin) return 'Superuser';
    return 'Customer';
  };

  if (loading) return <div className="admin-loading">Loading users...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <p>Total Users: {users.length}</p>
      </div>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.name || '-'}</td>
                <td>{user.phone || '-'}</td>
                <td>
                  <span className={`role-badge ${user.role === 'product_assistant' ? 'role-product-assistant' : (user.is_admin || user.role === 'superuser' ? 'role-admin' : 'role-user')}`}>
                    {roleLabel(user.role, user.is_admin)}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`btn-small ${user.is_admin ? 'btn-warning' : 'btn-primary'}`}
                    onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                  >
                    {user.is_admin ? 'Remove Superuser' : 'Make Superuser'}
                  </button>
                  <select
                    className="role-select"
                    value={user.role || (user.is_admin ? 'superuser' : 'customer')}
                    onChange={(event) => updateUserRole(user.id, event.target.value)}
                  >
                    <option value="customer">Customer</option>
                    <option value="product_assistant">Product assistant</option>
                    <option value="superuser">Superuser</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
