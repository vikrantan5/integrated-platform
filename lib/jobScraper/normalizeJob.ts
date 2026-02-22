// Normalize and validate job data
import { ParsedJob } from './parseJobs';
import { logger } from './logger';
import { generateId } from '@/lib/utils';

export interface NormalizedJob {
  id: string;
  title: string;
  description: string;
  role: string;
  salary: number;
  experience: number;
  location: string;
  status: 'open' | 'closed';
  openings: number;
  companyId: string;
  companyName: string;
  recruiterId: string;
  techStack: string[];
  createdAt: string;
  source: 'external';
  externalCompany: string;
  externalUrl: string;
  scrapedAt: string;
  scrapeStatus: 'success';
  jobType?: string;
  postedDate?: string;
}

// Validate job data
function isValidJob(job: ParsedJob, siteName: string): boolean {
  // Must have title
  if (!job.title || job.title.length < 3) {
    logger.warn('Rejected: title too short', siteName, { title: job.title });
    return false;
  }

  // Must have valid URL
  if (!job.url || !job.url.startsWith('http')) {
    logger.warn('Rejected: invalid URL', siteName, { url: job.url });
    return false;
  }

  // Check for suspicious content
  if (job.title.toLowerCase().includes('cookie') || job.title.toLowerCase().includes('privacy policy')) {
    logger.warn('Rejected: non-job content', siteName, { title: job.title });
    return false;
  }

  return true;
}

// Clean text content
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces
    .replace(/\n+/g, ' ') // Replace newlines
    .trim();
}

// Extract experience from title/description
function extractExperience(title: string, description?: string): number {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Look for patterns like "3+ years", "5-7 years", etc.
  const expMatch = text.match(/(\d+)[-+]?\s*(?:to\s+\d+)?\s*(?:years?|yrs?)/i);
  if (expMatch) {
    return parseInt(expMatch[1], 10);
  }

  // Default based on title
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    return 5;
  }
  if (text.includes('mid') || text.includes('intermediate')) {
    return 3;
  }
  if (text.includes('junior') || text.includes('entry')) {
    return 1;
  }

  return 2; // Default
}

// Extract tech stack from title/description
function extractTechStack(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const techStack: string[] = [];

  const technologies = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust',
    'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'machine learning', 'ai', 'data science', 'devops', 'cloud',
  ];

  for (const tech of technologies) {
    if (text.includes(tech)) {
      techStack.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }

  return techStack.length > 0 ? techStack : ['General'];
}

// Normalize job to match Job interface
export function normalizeJob(parsedJob: ParsedJob, siteName: string): NormalizedJob | null {
  try {
    // Validate
    if (!isValidJob(parsedJob, siteName)) {
      return null;
    }

    // Clean data
    const title = cleanText(parsedJob.title);
    const location = cleanText(parsedJob.location);
    const description = parsedJob.description ? cleanText(parsedJob.description) : `${title} position at ${parsedJob.company}`;
    
    // Extract role from title
    const role = title.split('-')[0].trim() || title;

    // Generate unique ID based on URL to avoid duplicates
    const urlHash = Buffer.from(parsedJob.url).toString('base64').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    const id = `ext_${urlHash}_${Date.now().toString(36)}`;

    const normalizedJob: NormalizedJob = {
      id,
      title,
      description,
      role,
      salary: 0, // External jobs don't have salary info
      experience: extractExperience(title, description),
      location,
      status: 'open',
      openings: 1,
      companyId: `external_${parsedJob.company.toLowerCase().replace(/\s+/g, '_')}`,
      companyName: parsedJob.company,
      recruiterId: 'external_scraper',
      techStack: extractTechStack(title, description),
      createdAt: new Date().toISOString(),
      source: 'external',
      externalCompany: parsedJob.company,
      externalUrl: parsedJob.url,
      scrapedAt: new Date().toISOString(),
      scrapeStatus: 'success',
      jobType: parsedJob.jobType,
      postedDate: parsedJob.postedDate,
    };

    logger.success('Normalized job', siteName, { title: normalizedJob.title });
    return normalizedJob;
  } catch (error: any) {
    logger.error('Normalization failed', siteName, { error: error.message });
    return null;
  }
}

// Normalize array of jobs and remove duplicates
export function normalizeJobs(parsedJobs: ParsedJob[], siteName: string): NormalizedJob[] {
  const normalized: NormalizedJob[] = [];
  const seenUrls = new Set<string>();

  for (const job of parsedJobs) {
    // Skip duplicates
    if (seenUrls.has(job.url)) {
      logger.warn('Skipping duplicate job', siteName, { url: job.url });
      continue;
    }

    const normalizedJob = normalizeJob(job, siteName);
    if (normalizedJob) {
      normalized.push(normalizedJob);
      seenUrls.add(job.url);
    }
  }

  logger.success(`Normalized ${normalized.length}/${parsedJobs.length} jobs`, siteName);
  return normalized;
}
