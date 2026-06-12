import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://morkyxdmxiavtfefcsax.supabase.co';
const supabaseAnonKey = 'sb_publishable_j-LoxYqh5bUkx0ZQE0aVlg_GiK5F-n8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
