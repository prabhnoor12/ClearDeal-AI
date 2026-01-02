
import { Request, Response, NextFunction } from 'express';
import { ROLES } from '../config/constants';

/**
 * Middleware to enforce broker-only access.
 */
export function requireBroker(req: Request, res: Response, next: NextFunction) {
	if (!req.user || req.user.role !== ROLES.BROKER) {
		return res.status(403).json({ status: 'error', message: 'Broker access required' });
	}
	return next();
}

/**
 * Middleware to attach broker-specific info to request (stub for future use).
 */


/**
 * Middleware to attach broker-specific info to request (stub for future use).
 */
export async function attachBrokerInfo(req: Request, _res: Response, next: NextFunction) {
	try {
		if (!req.user || req.user.role !== ROLES.BROKER) {
			return next();
		}
		// Lookup organization details for broker
		// TODO: Implement broker organization lookup
		// ...existing code...
		return next();
	} catch (error) {
		return next(error);
	}
}
