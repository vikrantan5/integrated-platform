// Scrape a single site with fallback strategy
import { SiteConfig } from './config';
import { logger } from './logger';
import { fetchHTML } from './fetchHTML';
import { fetchWithPlaywright } from './playwrightBrowser';
import { parseJobs, parseJobsFromHTML } from './parseJobs';
import { normalizeJobs, NormalizedJob } from './normalizeJob';
import { withRetry } from './retryHandler';

export interface ScrapeResult {
  site: string;
  success: boolean;
  jobs: NormalizedJob[];
  error?: string;
  method?: 'http' | 'playwright';
}

export async function scrapeSite(config: SiteConfig): Promise<ScrapeResult> {
  const siteName = config.company;

  try {
    logger.info('Starting scrape', siteName, { url: config.url });

    // STRATEGY 1: Try HTTP + Cheerio first
    logger.info('Attempting HTTP + Cheerio approach', siteName);
    
    const httpResult = await withRetry(
      async () => {
        const result = await fetchHTML(config.url, siteName);
        if (!result.success || !result.$) {
          throw new Error(result.error || 'HTTP fetch failed');
        }
        return result;
      },
      siteName,
      { maxRetries: 1 }
    ).catch((err) => {
      logger.warn('HTTP approach failed, will try Playwright', siteName);
      return null;
    });

    let jobs: NormalizedJob[] = [];
    let method: 'http' | 'playwright' = 'http';

    if (httpResult && httpResult.$) {
      // Parse jobs from Cheerio
      const parsedJobs = await parseJobs(httpResult.$, config);
      
      if (parsedJobs.length > 0) {
        jobs = normalizeJobs(parsedJobs, siteName);
        logger.success(`HTTP approach found ${jobs.length} jobs`, siteName);
      } else {
        logger.warn('HTTP approach found 0 jobs, trying Playwright', siteName);
      }
    }

    // STRATEGY 2: Fallback to Playwright if HTTP failed or found no jobs
    if (jobs.length === 0) {
      logger.info('Falling back to Playwright', siteName);
      method = 'playwright';

      const playwrightResult = await withRetry(
        async () => {
          const result = await fetchWithPlaywright(config.url, siteName);
          if (!result.success || !result.html) {
            throw new Error(result.error || 'Playwright fetch failed');
          }
          return result;
        },
        siteName,
        { maxRetries: 1 }
      ).catch((err) => {
        logger.error('Playwright approach also failed', siteName, { error: err.message });
        return null;
      });

      if (playwrightResult && playwrightResult.html) {
        const parsedJobs = await parseJobsFromHTML(playwrightResult.html, config);
        jobs = normalizeJobs(parsedJobs, siteName);
        logger.success(`Playwright found ${jobs.length} jobs`, siteName);
      }
    }

    // Final result
    if (jobs.length === 0) {
      logger.error('No jobs found with any method', siteName);
      return {
        site: siteName,
        success: false,
        jobs: [],
        error: 'No jobs found after trying all methods',
        method,
      };
    }

    logger.success(`Successfully scraped ${jobs.length} jobs`, siteName);
    return {
      site: siteName,
      success: true,
      jobs,
      method,
    };
  } catch (error: any) {
    logger.error('Site scraping failed completely', siteName, { error: error.message });
    return {
      site: siteName,
      success: false,
      jobs: [],
      error: error.message,
    };
  }
}
