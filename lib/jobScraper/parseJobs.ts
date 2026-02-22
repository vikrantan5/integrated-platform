// Parse jobs from HTML using Cheerio
import * as cheerio from 'cheerio';
import { SiteConfig } from './config';
import { logger } from './logger';

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  jobType?: string;
  postedDate?: string;
}

// Generic job extraction patterns
const GENERIC_SELECTORS = [
  // Job containers
  { container: '[role="listitem"]', title: 'h3, h2, .title', location: '.location, [class*="location"]', link: 'a' },
  { container: '.job-card, [class*="job-card"]', title: 'h3, h2, .title', location: '.location, [class*="location"]', link: 'a' },
  { container: '.position-card, [class*="position"]', title: 'h3, h2, .title', location: '.location, [class*="location"]', link: 'a' },
  { container: 'article', title: 'h3, h2, .title', location: '.location, [class*="location"]', link: 'a' },
  { container: '[data-testid*="job"]', title: 'h3, h2', location: '[class*="location"]', link: 'a' },
  { container: '.base-card, [class*="card"]', title: 'h3, h2', location: '[class*="location"]', link: 'a' },
];

export async function parseJobs(
  $: cheerio.CheerioAPI,
  siteConfig: SiteConfig
): Promise<ParsedJob[]> {
  const jobs: ParsedJob[] = [];
  const siteName = siteConfig.company;

  logger.info('Starting job parsing', siteName);

  try {
     let jobElements: cheerio.Cheerio<any> | null = null;
    let usedSelector = '';

    // Try configured selectors first
    if (siteConfig.selectors?.jobContainer) {
      jobElements = $(siteConfig.selectors.jobContainer);
      usedSelector = siteConfig.selectors.jobContainer;
      logger.info(`Trying configured selector: ${usedSelector}`, siteName);
    }

    // If no results, try generic selectors
    if (!jobElements || jobElements.length === 0) {
      logger.warn('Configured selector found no jobs, trying generic selectors', siteName);

      for (const pattern of GENERIC_SELECTORS) {
        const elements = $(pattern.container);
        if (elements.length > 0) {
          jobElements = elements;
          usedSelector = pattern.container;
          logger.info(`Found ${elements.length} elements with: ${pattern.container}`, siteName);
          break;
        }
      }
    }

    if (!jobElements || jobElements.length === 0) {
      logger.error('No job elements found with any selector', siteName);
      return [];
    }

    logger.success(`Found ${jobElements.length} job elements`, siteName);

    // Parse each job element
    jobElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        let title = '';
        if (siteConfig.selectors?.title) {
          title = $el.find(siteConfig.selectors.title).first().text().trim();
        }
        if (!title) {
          // Try generic patterns
          title = $el.find('h3, h2, .title, [class*="title"]').first().text().trim();
        }

        // Extract location
        let location = 'Not specified';
        if (siteConfig.selectors?.location) {
          location = $el.find(siteConfig.selectors.location).first().text().trim();
        }
        if (!location || location === 'Not specified') {
          location = $el.find('.location, [class*="location"], [class*="Location"]').first().text().trim() || 'Not specified';
        }

        // Extract link
        let link = '';
        if (siteConfig.selectors?.link) {
          link = $el.find(siteConfig.selectors.link).first().attr('href') || '';
        }
        if (!link) {
          link = $el.find('a').first().attr('href') || '';
        }

        // Make absolute URL if relative
        if (link && !link.startsWith('http')) {
          const baseUrl = new URL(siteConfig.url);
          link = new URL(link, baseUrl.origin).toString();
        }

        // Extract description (optional)
        let description = $el.find('.description, [class*="description"], p').first().text().trim();
        if (description.length > 500) {
          description = description.substring(0, 500) + '...';
        }

        // Only add if we have minimum required fields
        if (title && link) {
          jobs.push({
            title,
            company: siteName,
            location,
            url: link,
            description: description || undefined,
          });
        }
      } catch (error: any) {
        logger.warn(`Error parsing job element ${index}`, siteName, { error: error.message });
      }
    });

    logger.success(`Successfully parsed ${jobs.length} jobs`, siteName);
    return jobs;
  } catch (error: any) {
    logger.error('Job parsing failed', siteName, { error: error.message });
    return [];
  }
}

// Parse jobs from raw HTML string (for Playwright results)
export async function parseJobsFromHTML(html: string, siteConfig: SiteConfig): Promise<ParsedJob[]> {
  const $ = cheerio.load(html);
  return parseJobs($, siteConfig);
}
