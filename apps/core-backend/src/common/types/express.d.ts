import { User } from '@weaver2/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: User; // Or your custom user type
    }
  }
}
