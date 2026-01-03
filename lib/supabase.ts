import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

export interface ExpenseRow {
  id: number;
  amount: number;
  category: string;
  date: string;
  necessary: boolean;
  user_id: string;
  created_at: string;
}

export interface ExpenseWithProfile extends ExpenseRow {
  profiles: Pick<Profile, 'name'> | null;
}
