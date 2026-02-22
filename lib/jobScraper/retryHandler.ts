// Retry handler with exponential backoff
import { SCRAPER_CONFIG } from './config';
import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  siteName: string,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? SCRAPER_CONFIG.maxRetries;
  const baseDelay = options.retryDelay ?? SCRAPER_CONFIG.retryDelay;
  const useBackoff = options.exponentialBackoff ?? true;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = useBackoff ? baseDelay * Math.pow(2, attempt - 1) : baseDelay;
        logger.info(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, siteName);
        await sleep(delay);
      }

      return await fn();
    } catch (error: any) {
      lastError = error;
      logger.warn(`Attempt ${attempt + 1} failed`, siteName, { error: error.message });

      if (attempt === maxRetries) {
        logger.error('All retry attempts exhausted', siteName, { error: error.message });
        throw error;
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
