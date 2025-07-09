import { LoggerService, Injectable } from '@nestjs/common';
import chalk from 'chalk';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    console.log(
      chalk.green(`[LOG${context ? `: ${context}` : ''}] ${message}`),
    );
  }
  error(message: string, trace: string, context?: string) {
    console.error(
      chalk.red(`[ERROR${context ? `: ${context}` : ''}] ${message}`),
      trace,
    );
  }
  warn(message: string, context?: string) {
    console.warn(
      chalk.yellow(`[WARN${context ? `: ${context}` : ''}] ${message}`),
    );
  }
  debug(message: string, context?: string) {
    console.debug(
      chalk.blue(`[DEBUG${context ? `: ${context}` : ''}] ${message}`),
    );
  }
  verbose(message: string, context?: string) {
    console.info(
      chalk.cyan(`[VERBOSE${context ? `: ${context}` : ''}] ${message}`),
    );
  }
}
