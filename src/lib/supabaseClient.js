// Supabase client with dual import strategy:
// 1) Try local dependency ('@supabase/supabase-js')
// 2) Fallback to CDN ESM import (https://esm.sh/@supabase/supabase-js@2)
// This makes the app work in web IDEs like StackBlitz without local installs.

let supabase = null;
let initPromise = null;

const AUTH_ERROR_STORAGE_KEY = 'snuggleup.auth.error';

function readOAuthRedirectParams() {
  if (typeof window === 'undefined') {
    return { code: '', error: '', errorDescription: '' };
  }

  const searchParams = new URLSearchParams(window.location.search || '');
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?')
    ? hash.slice(hash.indexOf('?') + 1)
    : hash.replace(/^#\/?/, '');
  const hashParams = new URLSearchParams(hashQuery);

  return {
    code: searchParams.get('code') || hashParams.get('code') || '',
    error: searchParams.get('error') || hashParams.get('error') || '',
    errorDescription:
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error_code') ||
      hashParams.get('error_code') ||
      '',
  };
}

function clearOAuthRedirectParams() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  [
    'auth',
    'code',
    'error',
    'error_code',
    'error_description',
  ].forEach((key) => url.searchParams.delete(key));

  const nextHash = url.hash.startsWith('#/auth/callback') ? '' : url.hash;
  const nextSearch = url.searchParams.toString();
  const cleanUrl = `${url.origin}${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${nextHash}`;
  window.history.replaceState({}, document.title, cleanUrl);
}

async function recoverOAuthRedirectSession(client) {
  if (typeof window === 'undefined') return;

  const { code, error, errorDescription } = readOAuthRedirectParams();

  if (error || errorDescription) {
    window.sessionStorage.setItem(
      AUTH_ERROR_STORAGE_KEY,
      errorDescription || error || 'Social login could not be completed.'
    );
    clearOAuthRedirectParams();
    return;
  }

  if (!code) return;

  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    window.sessionStorage.setItem(
      AUTH_ERROR_STORAGE_KEY,
      exchangeError.message || 'Social login could not be completed.'
    );
  }
  clearOAuthRedirectParams();
}

export function popAuthRedirectError() {
  if (typeof window === 'undefined') return '';
  const message = window.sessionStorage.getItem(AUTH_ERROR_STORAGE_KEY) || '';
  if (message) window.sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
  return message;
}

async function init() {
  let mod = null;
  try {
    // Avoid Vite trying to pre-bundle a missing dep in web IDEs; try local first.
    // The vite-ignore keeps dev server from erroring if the package isn't installed.
    mod = await import(/* @vite-ignore */ '@supabase/supabase-js');
  } catch (_) {
    try {
      // Fallback to CDN ESM build when local dep isn't available
      mod = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2');
      console.info('Loaded @supabase/supabase-js from CDN fallback');
    } catch (err2) {
      console.error('Failed to load @supabase/supabase-js from both local and CDN.', err2?.message || err2);
      return null;
    }
  }

  const { createClient } = mod;
  // Try env vars first, fallback to hardcoded for StackBlitz (safe for anon keys)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljywlweffxmktrjbaurc.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeXdsd2VmZnhta3RyamJhdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDgxNDIsImV4cCI6MjA3NjQ4NDE0Mn0.mc93VQPUczIO0SPZ804LhmaiNTwdjwOzmfFeHrPqoLk';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return null;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  await recoverOAuthRedirectSession(client);
  return client;
}

// Lazy initializer to avoid top-level await in build
export async function getSupabase() {
  if (supabase) return supabase;
  if (!initPromise) initPromise = init();
  supabase = await initPromise;
  return supabase;
}

export function isSupabaseReady() {
  return Boolean(supabase);
}
