import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSupabase, popAuthRedirectError } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [authRedirectError, setAuthRedirectError] = useState('');

  // Normalize Supabase user into app user shape
  const toAppUser = (sbUser) => {
    if (!sbUser) return null;
    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      name: meta.name || meta.full_name || meta.fullName || '',
      phone: meta.phone || '',
      // keep raw for advanced use if needed
      _sb: sbUser,
    };
  };

  // Load session from Supabase on mount and subscribe to changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const supabase = await getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      const redirectError = popAuthRedirectError();
      if (redirectError) setAuthRedirectError(redirectError);
      setUser(toAppUser(session?.user || null));
      setToken(session?.access_token || null);
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(toAppUser(session?.user || null));
          setToken(session?.access_token || null);
        }
      );

      return () => {
        listener.subscription.unsubscribe();
      };
    };

    let cleanup;
    init().then((c) => (cleanup = c)).catch(() => setLoading(false));
    return () => {
      mounted = false;
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // New auth methods using Supabase
  const loginWithCredentials = async (email, password) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    const appUser = toAppUser(data.user);
    setUser(appUser);
    setToken(data.session?.access_token || null);
    return appUser;
  };

  const registerWithCredentials = async ({ name, email, phone, password }) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
        emailRedirectTo: `${window.location.origin}/#/reset-password`,
      },
    });
    if (error) throw error;
    const appUser = toAppUser(data.user);
    setUser(appUser);
    setToken(data.session?.access_token || null);
    return appUser;
  };

  const sendPasswordReset = async (email) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) throw error;
    return true;
  };

  const updatePassword = async (newPassword) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data.user;
  };

  const signInWithProvider = async (provider) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');

    const configuredRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL;
    const redirectTo = configuredRedirect || (
      window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za'
        ? 'https://snuggleup.co.za/?auth=callback'
        : `${window.location.origin}${window.location.pathname}?auth=callback`
    );

    const options = {
      redirectTo,
      skipBrowserRedirect: false,
    };

    if (provider === 'facebook') {
      options.scopes = 'email,public_profile';
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogleIdToken = async (idToken, nonce) => {
    const supabase = await getSupabase();
    if (!supabase)
      throw new Error('Auth is initializing. Please try again in a moment.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      ...(nonce ? { nonce } : {}),
    });
    if (error) throw error;

    const appUser = toAppUser(data.user);
    setUser(appUser);
    setToken(data.session?.access_token || null);
    return appUser;
  };

  const logout = async () => {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setToken(null);
  };

  // Auto-logout after 30 minutes of inactivity with 2-minute warning
  useEffect(() => {
    if (!user) return;

    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const WARNING_MS = 28 * 60 * 1000; // 28 minutes (2 min before logout)
    let timeoutId;
    let warningTimeoutId;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity >= TIMEOUT_MS) {
        console.log('🔒 Auto-logout: Session expired due to inactivity');
        setShowExpiryWarning(false);
        logout();
      } else {
        // Check again in remaining time
        const remaining = TIMEOUT_MS - timeSinceLastActivity;
        timeoutId = setTimeout(checkInactivity, remaining);
      }
    };

    const showWarning = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity >= WARNING_MS) {
        setShowExpiryWarning(true);
      } else {
        // Check again in remaining time until warning
        const remaining = WARNING_MS - timeSinceLastActivity;
        warningTimeoutId = setTimeout(showWarning, remaining);
      }
    };

    // Start timeout checkers
    timeoutId = setTimeout(checkInactivity, TIMEOUT_MS);
    warningTimeoutId = setTimeout(showWarning, WARNING_MS);

    // Track user activity
    const updateActivity = () => {
      setLastActivity(Date.now());
      setShowExpiryWarning(false); // Hide warning on activity
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningTimeoutId);
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user, lastActivity]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    showExpiryWarning,
    authRedirectError,
    // legacy flags
    login: () => {
      throw new Error('Use loginWithCredentials(email, password)');
    },
    register: () => {
      throw new Error(
        'Use registerWithCredentials({name,email,phone,password})'
      );
    },
    // new supabase methods
    loginWithCredentials,
    registerWithCredentials,
    sendPasswordReset,
    updatePassword,
    signInWithProvider,
    signInWithGoogleIdToken,
    logout,
    clearAuthRedirectError: () => setAuthRedirectError(''),
    // Keep session alive (extend timeout on manual action)
    extendSession: () => setLastActivity(Date.now()),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showExpiryWarning && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#ff9800',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
            ⏰ Session Expiring Soon
          </div>
          <div style={{ fontSize: '14px' }}>
            Your session will expire in 2 minutes due to inactivity. Click below to stay logged in.
          </div>
          <button
            onClick={() => {
              setLastActivity(Date.now());
              setShowExpiryWarning(false);
            }}
            style={{
              backgroundColor: 'white',
              color: '#ff9800',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Stay Logged In
          </button>
        </div>
      )}
      {authRedirectError && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            backgroundColor: '#fff5f5',
            color: '#9b1c1c',
            padding: '14px 16px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 10000,
            maxWidth: '420px',
            fontSize: '14px',
          }}
        >
          <strong>Social login could not finish.</strong>
          <div style={{ marginTop: '6px' }}>{authRedirectError}</div>
          <button
            type="button"
            onClick={() => setAuthRedirectError('')}
            style={{
              marginTop: '10px',
              background: '#9b1c1c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
};
