/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
import helmet from 'helmet';
import { INestApplication } from '@nestjs/common';
import * as csurf from 'csurf';
import * as process from 'process';

export function setSecurityMiddleware(app: INestApplication): void {
  /*
    HTTP header
   */
  app.use(helmet());
  app.use(helmet.hidePoweredBy());

  /*
    CORS
   */

  const whitelist = [
    ...(process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    undefined, // for Postman/Insomnia
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('❌ CORS blocked for:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cookie, Accept, Observe, Authorization',
    methods: 'GET,PUT,POST,DELETE,OPTIONS,PATCH',
    credentials: true,
  });

  /*
    CSRF
   */
  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  );
}
