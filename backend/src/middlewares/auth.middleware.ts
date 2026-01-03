
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { ROLES } from '../config/constants';

export interface AuthPayload {
  userId: string;
  email: string;
  role: typeof ROLES[keyof typeof ROLES];
  organizationId?: string;
}

/**
 * Middleware to verify JWT and attach user info to request.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Missing or invalid authorization header' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!ENV.JWT_SECRET) {
    res.status(500).json({ status: 'error', message: 'Server configuration error' });
    return;
  }
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as unknown as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

/**
 * Middleware to enforce role-based access control.
 * Usage: authorize('admin'), authorize(['broker', 'admin'])
 */
export function authorize(roles: AuthPayload['role'] | AuthPayload['role'][]): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, _res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!_req.user || !allowedRoles.includes(_req.user.role)) {
      _res.status(403).json({ status: 'error', message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Attach user type to Express Request
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
