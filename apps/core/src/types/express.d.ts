import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Or your custom user type
    }
  }
}
