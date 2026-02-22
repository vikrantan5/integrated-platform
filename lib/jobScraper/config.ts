// Job scraper configuration

export interface SiteConfig {
  company: string;
  url: string;
  enabled: boolean;
  selectors?: {
    jobContainer?: string;
    title?: string;
    location?: string;
    link?: string;
    description?: string;
  };
}

// Rotating user agents to avoid detection
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
];

export const ACCEPT_LANGUAGES = [
  'en-US,en;q=0.9',
  'en-GB,en;q=0.9',
  'en;q=0.9',
];

// Company career page configurations
export const SITE_CONFIGS: SiteConfig[] = [
  {
    company: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/search/?currentJobId=3926236738&f_C=1337%2C39939%2C2587638%2C9202023&geoId=92000000&origin=COMPANY_PAGE_JOBS_CLUSTER_EXPANSION&originToLandingJobPostings=3926236738%2C3984109877%2C3983351442%2C3967486976%2C3980673313%2C3973342095%2C3918812878%2C3854944588%2C3976068048',
    enabled: true,
    selectors: {
      jobContainer: '.job-search-card, .base-card',
      title: '.base-search-card__title, h3',
      location: '.job-search-card__location',
      link: 'a.base-card__full-link',
    },
  },
  {
    company: 'PayPal',
    url: 'https://paypal.eightfold.ai/careers?location=india&pid=274901904099&Job%20Category=Software%20Development&Employment%20Type=full%20time&domain=paypal.com&sort_by=relevance&triggerGoButton=false',
    enabled: true,
    selectors: {
      jobContainer: '.position-card, [data-test="position-card"]',
      title: '.position-title, h3',
      location: '.position-location',
      link: 'a[href*="/careers/job"]',
    },
  },
  {
    company: 'Uber',
    url: 'https://www.uber.com/careers/list/?department=Engineering&location=India',
    enabled: true,
    selectors: {
      jobContainer: '[data-testid="job-card"], .job-card',
      title: 'h3, .job-title',
      location: '.location',
      link: 'a',
    },
  },
  {
    company: 'Google',
    url: 'https://www.google.com/about/careers/applications/jobs/results/?location=India&employment_type=FULL_TIME',
    enabled: true,
    selectors: {
      jobContainer: '[role="listitem"], .lLd3oc',
      title: 'h3',
      location: '.pwO9Dc',
      link: 'a',
    },
  },
  {
    company: 'Salesforce',
    url: 'https://careers.salesforce.com/en/jobs/?search=software&country=India',
    enabled: true,
  },
  {
    company: 'Microsoft',
    url: 'https://careers.microsoft.com/professionals/us/en/search-results?keywords=software%20engineer&location=India',
    enabled: true,
  },
  {
    company: 'Amazon',
    url: 'https://www.amazon.jobs/en/search?base_query=software+engineer&loc_query=India&country=IND',
    enabled: true,
  },
];

export const SCRAPER_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRetries: 2,
  concurrency: 3, // Max parallel scrapes
  retryDelay: 2000, // 2 seconds between retries
  playwrightTimeout: 45000, // 45 seconds for Playwright
  waitForSelector: 5000, // Wait 5 seconds for dynamic content
};
