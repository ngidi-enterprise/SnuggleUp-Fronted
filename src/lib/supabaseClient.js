// Supabase client with dual import strategy:
// 1) Try local dependency ('@supabase/supabase-js')
// 2) Fallback to CDN ESM import (https://esm.sh/@supabase/supabase-js@2)
// This makes the app work in web IDEs like StackBlitz without local installs.

let supabase = null;

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

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

supabase = await init();

export { supabase };
