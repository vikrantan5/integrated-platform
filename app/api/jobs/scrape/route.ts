// API route to manually trigger job scraping
import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllSites } from '@/lib/jobScraper/scrapeAllSites';
import { saveExternalJobs } from '@/lib/actions/job.action';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual scraping triggered');

    // Run scraper
    const scrapeResult = await scrapeAllSites();

    if (!scrapeResult.success || scrapeResult.jobs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Scraping completed but no jobs found',
          summary: scrapeResult.summary,
          errors: scrapeResult.errors,
        },
        { status: 200 }
      );
    }

    // Save jobs to Firestore
    console.log(`Saving ${scrapeResult.jobs.length} jobs to database...`);
    const saveResult = await saveExternalJobs(scrapeResult.jobs);

    return NextResponse.json({
      success: true,
      message: `Successfully scraped and saved ${saveResult.saved} jobs`,
      summary: {
        ...scrapeResult.summary,
        totalScraped: scrapeResult.totalJobs,
        saved: saveResult.saved,
        skipped: saveResult.skipped,
        saveErrors: saveResult.errors,
      },
      errors: scrapeResult.errors,
    });
  } catch (error: any) {
    console.error('Scraping API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Scraping failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Job scraping endpoint',
    usage: 'Send POST request to trigger scraping',
  });
}
