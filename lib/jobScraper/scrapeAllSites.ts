// Scrape all sites in parallel with concurrency control
import { SITE_CONFIGS, SCRAPER_CONFIG } from './config';
import { logger } from './logger';
import { scrapeSite, ScrapeResult } from './scrapeSite';
import { NormalizedJob } from './normalizeJob';
import { closeBrowser } from './playwrightBrowser';

export interface ScrapeAllResult {
  success: boolean;
  totalJobs: number;
  jobs: NormalizedJob[];
  results: ScrapeResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    jobsPerSite: Record<string, number>;
  };
  errors: string[];
}

// Run tasks with concurrency limit
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = task(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

export async function scrapeAllSites(): Promise<ScrapeAllResult> {
  const startTime = Date.now();
  logger.info('🚀 Starting job aggregation pipeline');
  logger.info(`Scraping ${SITE_CONFIGS.length} sites with concurrency: ${SCRAPER_CONFIG.concurrency}`);

  try {
    // Filter enabled sites
    const enabledSites = SITE_CONFIGS.filter((site) => site.enabled);
    logger.info(`${enabledSites.length} sites enabled`);

    // Scrape sites with concurrency control
    const results = await runWithConcurrency(
      enabledSites,
      SCRAPER_CONFIG.concurrency,
      (config) => scrapeSite(config)
    );

    // Aggregate all jobs
    const allJobs: NormalizedJob[] = [];
    const errors: string[] = [];
    const jobsPerSite: Record<string, number> = {};

    let successfulSites = 0;
    let failedSites = 0;

    for (const result of results) {
      jobsPerSite[result.site] = result.jobs.length;

      if (result.success && result.jobs.length > 0) {
        allJobs.push(...result.jobs);
        successfulSites++;
      } else {
        failedSites++;
        if (result.error) {
          errors.push(`${result.site}: ${result.error}`);
        }
      }
    }

    // Close browser instance
    await closeBrowser();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Pipeline complete in ${duration}s`);
    logger.success(`Total jobs scraped: ${allJobs.length}`);
    logger.info(`Successful sites: ${successfulSites}/${enabledSites.length}`);
    if (failedSites > 0) {
      logger.warn(`Failed sites: ${failedSites}`);
    }

    return {
      success: true,
      totalJobs: allJobs.length,
      jobs: allJobs,
      results,
      summary: {
        total: enabledSites.length,
        successful: successfulSites,
        failed: failedSites,
        jobsPerSite,
      },
      errors,
    };
  } catch (error: any) {
    logger.error('Pipeline failed', undefined, { error: error.message });

    // Ensure browser is closed on error
    await closeBrowser();

    return {
      success: false,
      totalJobs: 0,
      jobs: [],
      results: [],
      summary: {
        total: 0,
        successful: 0,
        failed: SITE_CONFIGS.length,
        jobsPerSite: {},
      },
      errors: [error.message],
    };
  }
}
