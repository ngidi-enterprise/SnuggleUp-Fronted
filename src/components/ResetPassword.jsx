import React, { useState, useEffect } from 'react';
import './Auth.css';
import { useAuth } from '../context/AuthContext';

const ResetPassword = ({ onClose, onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();

  // Supabase sends a recovery session via redirect; no need to parse token manually.
  useEffect(() => {
    // This component assumes the user arrived via Supabase reset link (session present)
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      await updatePassword(password);
      setMessage('Password reset successful! You can now log in with your new password.');
      setTimeout(() => {
        if (onBackToLogin) onBackToLogin();
      }, 2000);
    } catch (err) {
      setMessage(err.message || 'Error resetting password');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form">
      <h2>Reset Your Password</h2>
      <p className="auth-subtitle">Enter your new password below.</p>
      
      {message && <div className={message.includes('successful') ? 'success-message' : 'error-message'}>{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      
      <div className="auth-footer">
        <p>
          Remember your password?{' '}
          <button className="link-button" onClick={onBackToLogin}>
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
