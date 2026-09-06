import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ybtplaxpbthyojqdeqhv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_T1ppa_-UunesRSEy5w8nPw_CXalgnru';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);