import { Role } from './roles';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: Role;
      departmentId?: string | null;
    }
    interface Request {
      user?: Express.User;
      cookies?: Record<string, string>;
    }
  }
}

export {};
