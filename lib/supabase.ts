import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Client for frontend (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Admin client for backend (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
// Types for Supabase tables
export interface SupabaseResumeAnalysis {
  id: string;
  student_id: string;
  job_id?: string;
  file_name: string;
  resume_url: string;
  overall_score: number;
  category_scores: {
    format: number;
    keywords: number;
    experience: number;
    skills: number;
  };
  strengths: string[];
  improvements: string[];
  keywords: string[];
  ats_compatibility: string;
  created_at: string;
}
