import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';

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
    
    // Use production domain or fallback to current origin
    const redirectTo = window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za'
      ? 'https://snuggleup.co.za'
      : window.location.origin;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
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
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
