import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

/**
 * Typed Supabase client. All `.from()` calls will be fully type-checked
 * against the Database interface in src/types/database.ts.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
