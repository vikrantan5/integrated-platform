// Structured logging for job scraper

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  site?: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, site?: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      site,
      data,
    };

    this.logs.push(entry);

    // Console output with colors
    const prefix = site ? `[${site}]` : '';
    const formattedMessage = `${prefix} ${message}`;

    switch (level) {
      case 'info':
        console.log(`ℹ️  ${formattedMessage}`, data || '');
        break;
      case 'success':
        console.log(`✅ ${formattedMessage}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️  ${formattedMessage}`, data || '');
        break;
      case 'error':
        console.error(`❌ ${formattedMessage}`, data || '');
        break;
    }
  }

  info(message: string, site?: string, data?: any) {
    this.log('info', message, site, data);
  }

  success(message: string, site?: string, data?: any) {
    this.log('success', message, site, data);
  }

  warn(message: string, site?: string, data?: any) {
    this.log('warn', message, site, data);
  }

  error(message: string, site?: string, data?: any) {
    this.log('error', message, site, data);
  }

  getLogs() {
    return this.logs;
  }

  getSummary() {
    const summary = {
      total: this.logs.length,
      info: this.logs.filter((l) => l.level === 'info').length,
      success: this.logs.filter((l) => l.level === 'success').length,
      warn: this.logs.filter((l) => l.level === 'warn').length,
      error: this.logs.filter((l) => l.level === 'error').length,
    };
    return summary;
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new Logger();
