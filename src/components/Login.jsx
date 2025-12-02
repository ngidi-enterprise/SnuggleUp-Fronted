import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import SocialLoginButtons from './SocialLoginButtons';
import { trackLogin } from '../lib/analytics';

function Login({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithCredentials } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginWithCredentials(email, password);
      trackLogin('email');
      setLoading(false);
      // Longer delay to ensure browser can detect successful login
      // and prompt to save password before modal closes
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <p className="auth-subtitle">Welcome back! Please login to continue.</p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} autoComplete="on" method="post" action="#">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            type="email"
            name="email"
            id="login-email"
            autoComplete="username email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Password</span>
            <button
              type="button"
              onClick={() => window.location.hash = '/forgot-password'}
              className="link-button"
              style={{ fontSize: '0.9em', fontWeight: 'normal' }}
            >
              Forgot Password?
            </button>
          </label>
          <input
            type="password"
            name="password"
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            disabled={loading}
          />
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <SocialLoginButtons />
      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <button className="link-button" onClick={onSwitchToRegister}>
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
