// Auth middleware placeholder
import { Request, Response, NextFunction } from 'express';
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Implement auth check
  next();
};
