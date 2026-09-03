import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: createAdminClient cannot be executed in browser context.');
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-service-key';

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
