// Cron job for scheduled scraping (every 6 hours)
import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllSites } from '@/lib/jobScraper/scrapeAllSites';
import { saveExternalJobs } from '@/lib/actions/job.action';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('⏰ Scheduled job scraping started');

    // Run scraper
    const scrapeResult = await scrapeAllSites();

    if (!scrapeResult.success || scrapeResult.jobs.length === 0) {
      console.log('No jobs found during scheduled scrape');
      return NextResponse.json({
        success: false,
        message: 'No jobs found',
        summary: scrapeResult.summary,
      });
    }

    // Save jobs to Firestore
    console.log(`Saving ${scrapeResult.jobs.length} jobs...`);
    const saveResult = await saveExternalJobs(scrapeResult.jobs);

    console.log(`✅ Scheduled scraping complete: ${saveResult.saved} saved, ${saveResult.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled scraping completed',
      summary: {
        ...scrapeResult.summary,
        totalScraped: scrapeResult.totalJobs,
        saved: saveResult.saved,
        skipped: saveResult.skipped,
      },
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
