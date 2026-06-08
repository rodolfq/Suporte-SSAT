import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/['"]/g, '');
// Handle traditional anon key and newer publishable key names
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)?.trim().replace(/['"]/g, '');

// Helper to check if URL is valid
const isValidUrl = (url: string | undefined): url is string => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.includes('.');
  } catch {
    return false;
  }
};

// Only initialize if we have valid credentials
export const supabase = (isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey.trim() !== '')
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'systemsat-auth-token',
        flowType: 'pkce',
        lockType: 'localStorage' // Garante que múltiplas abas não entrem em conflito ao renovar o token
      } as any
    })
  : null;

if (!supabase) {
  console.warn('Supabase client not initialized: Missing or invalid credentials.');
  console.log('URL:', supabaseUrl);
  console.log('Key present:', !!supabaseAnonKey);
}