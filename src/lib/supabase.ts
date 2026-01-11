import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = 'https://pqaifyxnimnszqrdvaxw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxYWlmeXhuaW1uc3pxcmR2YXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMjY5NTYsImV4cCI6MjA4MDgwMjk1Nn0.2ZcQN6Cz4CLajK68o6vF3J-E_hZvb0sUJ4UDwyH8Pog';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type { Database };
