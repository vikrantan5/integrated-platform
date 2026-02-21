-- ================================================
-- SUPABASE DATABASE SCHEMA FOR RESUME ANALYZER
-- ================================================

-- Create resume_analyses table
CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    job_id TEXT,
    file_name TEXT NOT NULL,
    resume_url TEXT NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    category_scores JSONB NOT NULL DEFAULT '{
        "format": 0,
        "keywords": 0,
        "experience": 0,
        "skills": 0
    }'::jsonb,
    strengths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    improvements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ats_compatibility TEXT NOT NULL CHECK (ats_compatibility IN ('Excellent', 'Good', 'Fair', 'Poor')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resume_analyses_student_id ON public.resume_analyses(student_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_job_id ON public.resume_analyses(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created_at ON public.resume_analyses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (students can only access their own data)
-- Policy: Students can view their own resume analyses
CREATE POLICY "Students can view own resume analyses" ON public.resume_analyses
    FOR SELECT
    USING (student_id = auth.uid()::text);

-- Policy: Students can insert their own resume analyses
CREATE POLICY "Students can insert own resume analyses" ON public.resume_analyses
    FOR INSERT
    WITH CHECK (student_id = auth.uid()::text);

-- Policy: Students can delete their own resume analyses
CREATE POLICY "Students can delete own resume analyses" ON public.resume_analyses
    FOR DELETE
    USING (student_id = auth.uid()::text);

-- ================================================
-- STORAGE BUCKET FOR RESUMES
-- ================================================

-- Create storage bucket for resumes (Run this in Supabase Dashboard -> Storage)
-- Bucket name: "resumes"
-- Public: true (for easy access to resume URLs)

-- Storage policies for the "resumes" bucket
-- Policy: Anyone can upload resumes
CREATE POLICY "Allow authenticated users to upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

-- Policy: Anyone can view resumes
CREATE POLICY "Allow public to view resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');

-- Policy: Users can delete their own resumes
CREATE POLICY "Allow users to delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE public.resume_analyses IS 'Stores ATS resume analysis results for students';
COMMENT ON COLUMN public.resume_analyses.id IS 'Unique identifier for the analysis';
COMMENT ON COLUMN public.resume_analyses.student_id IS 'ID of the student who uploaded the resume';
COMMENT ON COLUMN public.resume_analyses.job_id IS 'Optional: ID of the job the resume was analyzed for';
COMMENT ON COLUMN public.resume_analyses.file_name IS 'Original filename of the uploaded resume';
COMMENT ON COLUMN public.resume_analyses.resume_url IS 'Public URL to the resume file in Supabase Storage';
COMMENT ON COLUMN public.resume_analyses.overall_score IS 'Overall ATS score (0-100)';
COMMENT ON COLUMN public.resume_analyses.category_scores IS 'JSON object with scores for format, keywords, experience, and skills';
COMMENT ON COLUMN public.resume_analyses.strengths IS 'Array of identified strengths in the resume';
COMMENT ON COLUMN public.resume_analyses.improvements IS 'Array of suggested improvements';
COMMENT ON COLUMN public.resume_analyses.keywords IS 'Array of important keywords found or missing';
COMMENT ON COLUMN public.resume_analyses.ats_compatibility IS 'ATS compatibility rating: Excellent, Good, Fair, or Poor';
COMMENT ON COLUMN public.resume_analyses.created_at IS 'Timestamp when the analysis was created';

-- ================================================
-- EXAMPLE QUERY TO TEST
-- ================================================

-- Get all resume analyses for a specific student
-- SELECT * FROM public.resume_analyses WHERE student_id = 'YOUR_USER_ID' ORDER BY created_at DESC;

-- Get latest resume analysis for a student
-- SELECT * FROM public.resume_analyses WHERE student_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 1;

-- ================================================
-- MIGRATION NOTES
-- ================================================

/*
MIGRATION STEPS FROM FIREBASE TO SUPABASE:

1. **Create Storage Bucket:**
   - Go to Supabase Dashboard -> Storage
   - Click "New bucket"
   - Name: "resumes"
   - Public: Yes
   - Apply the storage policies above

2. **Run This SQL:**
   - Copy the SQL above
   - Go to Supabase Dashboard -> SQL Editor
   - Paste and execute

3. **Update Application Code:**
   - Replace `lib/actions/resume.action.ts` imports with `lib/actions/resume-supabase.action.ts`
   - Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

4. **Test the Flow:**
   - Upload a resume
   - Verify it appears in Supabase Storage bucket "resumes"
   - Verify analysis is saved in "resume_analyses" table
   - Check that results page displays correctly

5. **Optional - Migrate Existing Data:**
   - Export existing data from Firebase Firestore
   - Transform to match Supabase schema
   - Bulk insert into Supabase
*/
