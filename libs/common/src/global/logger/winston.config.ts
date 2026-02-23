import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isDevelopment = process.env.NODE_ENV !== 'production';

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const devTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike('Weaver2', {
      colors: true,
      prettyPrint: true,
    }),
  ),
});

const prodTransports = [
  new winston.transports.Console({ format: jsonFormat }),
  new DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: jsonFormat,
  }),
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: jsonFormat,
  }),
];

export const winstonLoggerConfig: winston.LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  transports: isDevelopment ? [devTransport] : prodTransports,
};
