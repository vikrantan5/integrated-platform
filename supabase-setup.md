"# 🚀 SUPABASE SETUP GUIDE FOR RESUME ANALYZER

## Overview
This guide will help you migrate the ATS Resume Analyzer from Firebase Storage to Supabase Storage + Database.

---

## ⚙️ STEP 1: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard: https://ktmxilcslghutmajhozw.supabase.co
2. Navigate to **Storage** in the left sidebar
3. Click **\"New bucket\"**
4. Configure the bucket:
   - **Name:** `resumes`
   - **Public bucket:** ✅ **YES** (Enable this)
   - **File size limit:** 10MB (optional)
   - **Allowed MIME types:** `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
5. Click **\"Create bucket\"**

---

## 📊 STEP 2: Run SQL Schema

1. In Supabase Dashboard, go to **SQL Editor** in the left sidebar
2. Click **\"New query\"**
3. Copy the entire content from `/app/supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click **\"Run\"** or press `Ctrl+Enter`
6. Verify:
   - Table `resume_analyses` is created
   - Indexes are created
   - RLS policies are applied

### What the Schema Creates:
- ✅ `resume_analyses` table with proper columns
- ✅ Indexes for fast queries
- ✅ Row Level Security (RLS) policies
- ✅ Storage bucket policies

---

## 🔐 STEP 3: Configure Storage Policies

If the SQL policies didn't apply automatically:

1. Go to **Storage** → **Policies** tab
2. For the `resumes` bucket, add these policies:

### Policy 1: Allow Upload
```sql
CREATE POLICY \"Allow authenticated users to upload resumes\"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');
```

### Policy 2: Allow Public Read
```sql
CREATE POLICY \"Allow public to view resumes\"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');
```

### Policy 3: Allow Delete Own Files
```sql
CREATE POLICY \"Allow users to delete own resumes\"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## ✅ STEP 4: Verify Environment Variables

Ensure your `/app/.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ktmxilcslghutmajhozw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0bXhpbGNzbGdodXRtYWpob3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTIwNzAsImV4cCI6MjA4NzIyODA3MH0.N3ZsTiy_X_eg7xVr4hL1g_KgVHmwZPBbBVViypLgTho
```

---

## 🧪 STEP 5: Test the Migration

### Test Upload Flow:
1. Start the application: `yarn dev`
2. Login as a student
3. Go to **Dashboard** → **\"Analyze Your Resume\"**
4. Upload a PDF or DOCX file
5. Wait for analysis to complete
6. Verify in Supabase Dashboard:
   - **Storage** → `resumes` bucket → Should see uploaded file
   - **Table Editor** → `resume_analyses` → Should see new row

### Test Retrieval:
1. Go to **Resume Analyzer** → **\"View Analysis History\"**
2. Check that all analyses are displayed
3. Click on an analysis to view detailed results
4. Verify all scores, strengths, and improvements are shown

---

## 📋 VERIFICATION CHECKLIST

- [ ] Supabase `resumes` bucket created and set to public
- [ ] SQL schema executed successfully
- [ ] `resume_analyses` table exists with all columns
- [ ] RLS policies are active
- [ ] Storage policies are applied
- [ ] Environment variables are set
- [ ] Can upload resume and see it in Supabase Storage
- [ ] Analysis results saved to `resume_analyses` table
- [ ] Can view analysis history
- [ ] Can view detailed analysis results
- [ ] Can delete old analyses

---

## 🔍 TROUBLESHOOTING

### Issue: \"Failed to upload resume\"
**Solution:** Check that the `resumes` bucket exists and is public.

### Issue: \"Row Level Security policy violation\"
**Solution:** 
1. Go to **Table Editor** → `resume_analyses` → **RLS**
2. Temporarily disable RLS for testing: `ALTER TABLE resume_analyses DISABLE ROW LEVEL SECURITY;`
3. Or ensure policies allow authenticated users to insert

### Issue: \"Storage bucket not found\"
**Solution:** 
1. Verify bucket name is exactly `resumes` (lowercase)
2. Check that bucket is public
3. Verify `NEXT_PUBLIC_SUPABASE_URL` in .env.local

### Issue: Resume URL is 404
**Solution:**
1. Go to Storage → `resumes` bucket → Settings
2. Ensure **\"Public bucket\"** is enabled
3. Click **\"Save\"**

---

## 🗄️ DATABASE SCHEMA OVERVIEW

### Table: `resume_analyses`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `student_id` | TEXT | User ID who uploaded |
| `job_id` | TEXT | Optional job ID |
| `file_name` | TEXT | Original filename |
| `resume_url` | TEXT | Public Supabase Storage URL |
| `overall_score` | INTEGER | ATS score (0-100) |
| `category_scores` | JSONB | Scores for format, keywords, experience, skills |
| `strengths` | TEXT[] | Array of strengths |
| `improvements` | TEXT[] | Array of improvements |
| `keywords` | TEXT[] | Relevant keywords |
| `ats_compatibility` | TEXT | Excellent/Good/Fair/Poor |
| `created_at` | TIMESTAMP | When analysis was created |

---

## 📊 USEFUL SQL QUERIES

### View all analyses:
```sql
SELECT * FROM resume_analyses ORDER BY created_at DESC;
```

### Get analyses for a specific student:
```sql
SELECT * FROM resume_analyses 
WHERE student_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```

### Count total analyses:
```sql
SELECT COUNT(*) FROM resume_analyses;
```

### Average overall score:
```sql
SELECT AVG(overall_score) as avg_score FROM resume_analyses;
```

---

## 🎉 SUCCESS!

Once all steps are complete, your Resume Analyzer will be using Supabase instead of Firebase!

**Benefits:**
✅ Better query performance with PostgreSQL
✅ Easier data management with SQL
✅ Row Level Security for data privacy
✅ Public storage URLs for resumes
✅ No Firebase dependencies for resume feature

---

## 📞 SUPPORT

If you encounter any issues, check:
1. Supabase Dashboard → Logs
2. Browser Console for errors
3. Network tab for failed requests

**Common Solutions:**
- Clear browser cache
- Restart Next.js dev server
- Double-check environment variables
- Verify Supabase project is not paused
"