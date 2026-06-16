import { Request } from 'express';
import { UserRole } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: UserRole;
        area?: string;
      };
    }
  }
}
