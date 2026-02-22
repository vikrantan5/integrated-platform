// Playwright browser automation fallback
import { chromium, Browser, Page } from 'playwright';
import { SCRAPER_CONFIG, USER_AGENTS } from './config';
import { logger } from './logger';

export interface BrowserResult {
  success: boolean;
  html?: string;
  error?: string;
}

let browserInstance: Browser | null = null;

// Get or create browser instance
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

// Close browser instance
export async function closeBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function fetchWithPlaywright(url: string, siteName: string): Promise<BrowserResult> {
  let page: Page | null = null;

  try {
    logger.info('Launching Playwright browser', siteName);

    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent: USER_AGENTS[0],
      viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();

    // Set timeout
    page.setDefaultTimeout(SCRAPER_CONFIG.playwrightTimeout);

    logger.info('Navigating to URL', siteName, { url });
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPER_CONFIG.playwrightTimeout,
    });

    // Wait for dynamic content to load
    logger.info('Waiting for dynamic content', siteName);
    await page.waitForTimeout(SCRAPER_CONFIG.waitForSelector);

    // Try to wait for common job listing selectors
    const selectors = [
      '[role="listitem"]',
      '.job-card',
      '.position-card',
      '[data-testid="job-card"]',
      'article',
      '.base-card',
    ];

    let foundSelector = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000, state: 'attached' });
        logger.success(`Found job containers with selector: ${selector}`, siteName);
        foundSelector = true;
        break;
      } catch {
        // Try next selector
      }
    }

    if (!foundSelector) {
      logger.warn('No job container selectors found, continuing anyway', siteName);
    }

    // Get HTML content
    const html = await page.content();

    if (!html || html.length < 100) {
      logger.error('Empty or insufficient HTML from Playwright', siteName);
      await page.close();
      await context.close();
      return { success: false, error: 'Empty HTML content' };
    }

    logger.success('Successfully fetched HTML with Playwright', siteName, {
      htmlLength: html.length,
    });

    await page.close();
    await context.close();

    return { success: true, html };
  } catch (error: any) {
    logger.error('Playwright fetch failed', siteName, { error: error.message });

    if (page) {
      try {
        await page.close();
      } catch {}
    }

    return { success: false, error: error.message };
  }
}
