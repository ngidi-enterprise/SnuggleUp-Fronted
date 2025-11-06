import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchUsers();
  }, []);

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
    if (!confirm(`${currentStatus ? 'Remove' : 'Grant'} admin access for this user?`)) return;

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
                  <span className={`role-badge ${user.is_admin ? 'role-admin' : 'role-user'}`}>
                    {user.is_admin ? '👑 Admin' : '👤 User'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className={`btn-small ${user.is_admin ? 'btn-warning' : 'btn-primary'}`}
                    onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
