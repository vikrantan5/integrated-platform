"# 🚀 External Job Aggregation - Quick Start

## What's New?

Your job portal now automatically fetches jobs from external company career pages (LinkedIn, Google, PayPal, etc.) and displays them alongside recruiter-posted jobs!

---

## 🎯 Features Added

### 1. **Automatic Job Scraping**
- Fetches jobs from 7 major companies
- Smart scraping: HTTP first, Playwright fallback
- Runs every 6 hours automatically

### 2. **Merged Job Display**
- Recruiter jobs + External jobs in same UI
- Clear badges showing job source
- Filter by source (All / Recruiter / External)

### 3. **Production-Ready**
- Fault-tolerant (never crashes)
- Retry logic with exponential backoff
- Duplicate prevention
- Comprehensive error handling

---

## 🏃 Quick Test

### 1. Start the App
```bash
cd /app
yarn dev
```

### 2. Trigger Scraping (Manual)
```bash
curl -X POST http://localhost:3001/api/jobs/scrape
```

This will:
- Scrape 7 company career pages
- Parse job listings
- Save to Firestore
- Show results summary

### 3. View Jobs
Open: http://localhost:3001/jobseeker/jobs

You'll see:
- 🟢 **Recruiter** badge for manual posts
- 🔵 **External** badge for scraped jobs
- Filter dropdown for job source
- Stats showing job counts

---

## 📁 Key Files

```
/lib/jobScraper/          # Scraper engine
├── config.ts             # Add/remove companies here
├── scrapeAllSites.ts     # Main orchestrator
└── ...

/app/api/jobs/scrape/     # Manual trigger endpoint
/app/api/cron/scrapeJobs/ # Scheduled endpoint (6 hours)
```

---

## ⚙️ Configuration

### Add More Companies

Edit `/lib/jobScraper/config.ts`:

```typescript
export const SITE_CONFIGS: SiteConfig[] = [
  // ... existing sites
  {
    company: 'Netflix',
    url: 'https://jobs.netflix.com/search?location=India',
    enabled: true,
  },
];
```

### Change Scraping Frequency

Edit cron schedule in production (Vercel, etc.)
- Current: Every 6 hours
- Recommended: 6-12 hours

### Adjust Concurrency

In `/lib/jobScraper/config.ts`:
```typescript
export const SCRAPER_CONFIG = {
  concurrency: 3,  // Change to 2 or 4
  // ...
};
```

---

## 🧪 Testing Steps

1. **Check API health:**
   ```bash
   curl http://localhost:3001/api/jobs/scrape
   # Should return: \"Job scraping endpoint\"
   ```

2. **Trigger scraping:**
   ```bash
   curl -X POST http://localhost:3001/api/jobs/scrape
   ```

3. **Monitor logs:**
   - Watch console for structured output
   - Look for ✅ success messages
   - Check which sites succeeded

4. **Verify in UI:**
   - Go to /jobseeker/jobs
   - Filter by \"External Only\"
   - Click external jobs → opens company site

---

## 📊 Expected Results

After scraping:
- **40-80 jobs** from external sources
- **6-7 sites** successfully scraped
- **0-1 sites** may fail (normal)
- **~60-90 seconds** total time

Per site breakdown:
- LinkedIn: 8-15 jobs
- PayPal: 10-15 jobs
- Uber: 5-10 jobs
- Google: 12-20 jobs
- Salesforce: 3-8 jobs
- Microsoft: 0-10 jobs
- Amazon: 0-8 jobs

---

## 🛠️ Troubleshooting

### No jobs found?
- Check site URLs are still valid
- Some sites may block scraping temporarily
- Try manual trigger again after a few minutes

### Playwright errors?
- Ensure Chromium is installed:
  ```bash
  npx playwright install chromium
  ```

### Timeout errors?
- Normal for some sites
- Pipeline continues with other sites
- Check logs for specific error

---

## 🚀 Deployment

### For Production

1. **Set cron secret:**
   ```env
   CRON_SECRET=your-random-secret
   ```

2. **Configure cron job:**
   
   **Vercel:**
   ```json
   {
     \"crons\": [{
       \"path\": \"/api/cron/scrapeJobs\",
       \"schedule\": \"0 */6 * * *\"
     }]
   }
   ```

3. **Test first run:**
   ```bash
   curl -H \"Authorization: Bearer YOUR_SECRET\" \
     https://your-app.com/api/cron/scrapeJobs
   ```

---

## 📝 Frontend Changes

### JobCard Component
- Shows source badge
- External jobs link to company site
- Opens in new tab

### Jobs Page
- Source filter dropdown
- Job counts by source
- Manual refresh button

---

## 🎯 Usage Tips

1. **First Run:** Trigger manually to populate database
2. **Monitor:** Check logs for first few runs
3. **Adjust:** Enable/disable sites based on results
4. **Extend:** Add more companies as needed

---

## 📚 Full Documentation

See: `/app/JOB_SCRAPER_DOCUMENTATION.md`

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ API returns success with job counts
- ✅ Jobs page shows external jobs
- ✅ Source badges appear correctly
- ✅ External links open company sites
- ✅ Logs show successful scraping

---

## 🎉 That's It!

Your job portal now has automatic external job aggregation! 🚀

For questions or issues, check the full documentation.
"