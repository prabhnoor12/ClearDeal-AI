

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

import * as notificationService from '../services/notification.service';

import { serializeError, validationError } from '../utils/response';

/**
 * Express error-handling middleware for API responses.
 */
export function errorMiddleware(
	err: any,
	req: Request,
	res: Response,
	_next: NextFunction
) {
	// Notify admin or dev team for critical errors (example)
	if (err && typeof err === 'object' && 'status' in err && (err as any).status === 500) {
		if (typeof notificationService.notifyAdmin === 'function') {
			notificationService.notifyAdmin({
				type: 'critical_error',
				error: serializeError(err),
				url: req.originalUrl,
				method: req.method,
				user: req.user,
				timestamp: new Date(),
			});
		}
	}
	// Log error with request context
	logger.error('API Error', {
		error: serializeError(err),
		url: req.originalUrl,
		method: req.method,
		user: req.user,
		body: req.body,
		query: req.query,
		params: req.params,
	});

	// Handle validation errors (Zod or custom)
	if (err && typeof err === 'object' && 'errors' in err) {
		return res.status(422).json(validationError((err as any).errors));
	}

	// Handle custom error types (example: NotFoundError, AuthError)
	if (err && typeof err === 'object' && 'type' in err) {
		switch ((err as any).type) {
			case 'NotFoundError':
				return res.status(404).json({ status: 'error', message: (err as any).message || 'Resource not found' });
			case 'AuthError':
				return res.status(401).json({ status: 'error', message: (err as any).message || 'Unauthorized' });
			// Add more custom error types as needed
		}
	}

	// Handle custom error codes
	const status = (err && typeof err === 'object' && 'status' in err && typeof (err as any).status === 'number')
		? (err as any).status
		: 500;
	const code = (err && typeof err === 'object' && 'code' in err && typeof (err as any).code === 'number')
		? (err as any).code
		: undefined;
	const message = (err && typeof err === 'object' && 'message' in err)
		? (err as any).message
		: 'Internal Server Error';
	const details = serializeError(err);

	// Send standardized error response
	return res.status(status).json({ status: 'error', message, code, details });
}

/**
 * Async error handler wrapper for Express routes/controllers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}
