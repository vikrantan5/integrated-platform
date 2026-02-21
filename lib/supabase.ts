import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
