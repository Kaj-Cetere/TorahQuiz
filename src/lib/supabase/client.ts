import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// These values will be set up in environment variables later
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a Supabase client using the auth-helpers-nextjs package
// This ensures proper cookie handling
export const supabase = createClientComponentClient(); 