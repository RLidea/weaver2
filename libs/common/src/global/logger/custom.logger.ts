import { LoggerService, Injectable } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(`[LOG${context ? `: ${context}` : ''}] ${message}`);
  }
  error(message: string, trace: string, context?: string) {
    console.error(`[ERROR${context ? `: ${context}` : ''}] ${message}`, trace);
  }
  warn(message: string, context?: string) {
    console.warn(`[WARN${context ? `: ${context}` : ''}] ${message}`);
  }
  debug(message: string, context?: string) {
    console.debug(`[DEBUG${context ? `: ${context}` : ''}] ${message}`);
  }
  verbose(message: string, context?: string) {
    console.info(`[VERBOSE${context ? `: ${context}` : ''}] ${message}`);
  }
}
