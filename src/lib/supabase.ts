import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://njvugbobmhqsowaxibam.supabase.co';
const supabaseAnonKey = 'sb_publishable_c3nVjYFY1D3wGlgNMT02DQ_lRbhVvxm';

// Untyped client: generated Database types are out-of-date vs live schema
// (admin migration adds columns the generator hasn't been re-run against).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Unique storage key prevents collision with the mobile app's session
    // when both are open under the same origin (dev only).
    storageKey: 'enlazo-admin-auth',
    // 'pkce' flow is more robust across multiple tabs than 'implicit'
    flowType: 'pkce',
  },
});

export type { Database };
