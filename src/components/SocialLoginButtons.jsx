import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const providers = [
  { 
    key: 'google', 
    label: 'Login with Google', 
    className: 'google', 
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg'
  },
  { 
    key: 'facebook', 
    label: 'Login with Facebook', 
    className: 'facebook', 
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg'
  },
];

export default function SocialLoginButtons() {
  const { signInWithProvider } = useAuth();
  const [error, setError] = useState('');
  const [loadingKey, setLoadingKey] = useState('');

  const onClick = async (providerKey) => {
    setError('');
    setLoadingKey(providerKey);
    try {
      await signInWithProvider(providerKey);
      // Supabase will redirect for OAuth; no further action needed here
    } catch (e) {
      // Common error: provider not enabled/configured in Supabase dashboard
      setError(e?.message || 'Unable to start social login.');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div>
      {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="social-buttons-row">
        {providers.map(p => (
          <button
            key={p.key}
            type="button"
            className={`social-btn-new ${p.className}`}
            onClick={() => onClick(p.key)}
            disabled={!!loadingKey}
          >
            <img src={p.iconUrl} alt={`${p.key} logo`} className="social-icon-img" />
            <span className="social-label">{loadingKey === p.key ? 'Redirecting…' : p.label}</span>
          </button>
        ))}
      </div>
      <div className="or-separator">
        <span>Or</span>
      </div>
    </div>
  );
}
