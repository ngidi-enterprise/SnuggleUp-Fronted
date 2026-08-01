import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
// Google OAuth client IDs are public browser identifiers, not secrets.
const GOOGLE_CLIENT_ID =
  '890890309730-5h3r5rr1muhfnbl25oa6shgqcjhsvb19.apps.googleusercontent.com';

const loadGoogleIdentityServices = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve(window.google);
    return;
  }

  const existing = document.getElementById(GOOGLE_SCRIPT_ID);
  if (existing) {
    existing.addEventListener('load', () => resolve(window.google), { once: true });
    existing.addEventListener(
      'error',
      () => reject(new Error('Unable to load Google sign-in.')),
      { once: true }
    );
    return;
  }

  const script = document.createElement('script');
  script.id = GOOGLE_SCRIPT_ID;
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => resolve(window.google);
  script.onerror = () => reject(new Error('Unable to load Google sign-in.'));
  document.head.appendChild(script);
});

const createGoogleNonce = async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const encoded = new TextEncoder().encode(nonce);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { nonce, hashedNonce };
};

export default function SocialLoginButtons({ onSuccess }) {
  const { signInWithProvider, signInWithGoogleIdToken } = useAuth();
  const [error, setError] = useState('');
  const [loadingKey, setLoadingKey] = useState('');
  const googleButtonRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    const mountGoogleButton = async () => {
      try {
        const googleApi = await loadGoogleIdentityServices();
        const { nonce, hashedNonce } = await createGoogleNonce();
        if (!active || !googleButtonRef.current) return;

        googleApi.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            setError('');
            setLoadingKey('google');
            try {
              await signInWithGoogleIdToken(response.credential, nonce);
              onSuccess?.();
            } catch (signInError) {
              setError(signInError?.message || 'Unable to finish Google sign-in.');
            } finally {
              setLoadingKey('');
            }
          },
        });

        googleButtonRef.current.innerHTML = '';
        googleApi.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.max(
            180,
            Math.floor(googleButtonRef.current.clientWidth || 220)
          ),
        });
      } catch (scriptError) {
        if (active) {
          setError(scriptError?.message || 'Unable to load Google sign-in.');
        }
      }
    };

    mountGoogleButton();
    return () => {
      active = false;
    };
  }, [onSuccess, signInWithGoogleIdToken]);

  const onFacebookClick = async () => {
    setError('');
    setLoadingKey('facebook');
    try {
      await signInWithProvider('facebook');
    } catch (signInError) {
      setError(signInError?.message || 'Unable to start social login.');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="social-buttons-row">
        {GOOGLE_CLIENT_ID ? (
          <div
            ref={googleButtonRef}
            className={`google-button-host${loadingKey === 'google' ? ' is-loading' : ''}`}
            aria-label="Continue with Google"
          />
        ) : (
          <button
            type="button"
            className="social-btn-new google"
            onClick={() => signInWithProvider('google')}
            disabled={!!loadingKey}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              alt="Google logo"
              className="social-icon-img"
            />
            <span className="social-label">Continue with Google</span>
          </button>
        )}
        <button
          type="button"
          className="social-btn-new facebook"
          onClick={onFacebookClick}
          disabled={!!loadingKey}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg"
            alt="Facebook logo"
            className="social-icon-img"
          />
          <span className="social-label">
            {loadingKey === 'facebook'
              ? 'Redirecting...'
              : 'Continue with Facebook'}
          </span>
        </button>
      </div>
      <p className="social-privacy-note">
        Social login only shares your name and email so we can create your
        SnuggleUp account. We cannot post, read messages, or monitor your social
        accounts.
      </p>
      <div className="or-separator">
        <span>Or</span>
      </div>
    </div>
  );
}
