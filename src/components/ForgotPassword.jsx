import React, { useState } from 'react';
import './Auth.css';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = ({ onClose, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await sendPasswordReset(email);
      setMessage('Password reset link sent! Check your email.');
    } catch (err) {
      setMessage(err.message || 'Error sending reset link');
    }
    setLoading(false);
  };

  return (
    <div className="auth-form">
      <h2>Forgot Your Password?</h2>
      <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
      
      {message && <div className={message.includes('sent') ? 'success-message' : 'error-message'}>{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
