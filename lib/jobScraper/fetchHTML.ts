// HTTP fetching with Cheerio parsing
import axios from 'axios';
import * as cheerio from 'cheerio';
import { USER_AGENTS, ACCEPT_LANGUAGES, SCRAPER_CONFIG } from './config';
import { logger } from './logger';

export interface FetchResult {
  success: boolean;
  html?: string;
  $?: cheerio.CheerioAPI;
  error?: string;
}

// Get random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Get random accept language
function getRandomLanguage(): string {
  return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

export async function fetchHTML(url: string, siteName: string): Promise<FetchResult> {
  try {
    logger.info('Fetching HTML with HTTP request', siteName, { url });

    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': getRandomLanguage(),
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: SCRAPER_CONFIG.timeout,
      maxRedirects: 5,
    });

    const html = response.data;

    // Check if we got actual content
    if (!html || html.length < 100) {
      logger.warn('HTML content too short or empty', siteName, { length: html?.length || 0 });
      return { success: false, error: 'Empty or insufficient HTML content' };
    }

    // Load HTML into Cheerio
    const $ = cheerio.load(html);

    // Check if page has meaningful content
    const bodyText = $('body').text().trim();
    if (bodyText.length < 50) {
      logger.warn('Page body content is minimal', siteName, { bodyLength: bodyText.length });
      return { success: false, error: 'Minimal page content detected' };
    }

    logger.success('Successfully fetched HTML', siteName, { htmlLength: html.length });
    return { success: true, html, $ };
  } catch (error: any) {
    const errorMessage = error.response?.status
      ? `HTTP ${error.response.status}: ${error.response.statusText}`
      : error.message;

    logger.error('HTTP fetch failed', siteName, { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}
