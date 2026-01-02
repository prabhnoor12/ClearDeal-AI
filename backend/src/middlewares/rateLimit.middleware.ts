

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
	url: process.env['REDIS_URL'] || 'redis://localhost:6379',
});
redisClient.connect().catch(console.error);

export interface AdvancedRateLimitOptions {
	windowMs?: number;
	max?: number;
	keyGenerator?: (req: Request) => string;
	message?: string;
	skipFailedRequests?: boolean;
	skipSuccessfulRequests?: boolean;
}

export function advancedRateLimit(options: AdvancedRateLimitOptions = {}) {
	return rateLimit({
		store: new RedisStore({
			sendCommand: (...args: string[]) => redisClient.sendCommand(args),
		}),
		windowMs: options.windowMs ?? 60_000, // default 1 minute
		max: options.max ?? 100, // default 100 requests per window
		keyGenerator: options.keyGenerator ?? ((req: Request) => req.user?.userId || req.ip || 'unknown'),
		message: options.message ?? 'Too many requests. Please try again later.',
		skipFailedRequests: options.skipFailedRequests ?? false,
		skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
		handler: (_req: Request, res: Response) => {
			res.status(429).json({ status: 'error', message: options.message ?? 'Too many requests. Please try again later.' });
		},
	});
}

// Example usage in app:
// app.use(advancedRateLimit({ windowMs: 60_000, max: 50 }));
// app.use('/api/', advancedRateLimit({ windowMs: 15 * 60_000, max: 500, keyGenerator: req => req.user?.userId || req.ip }));
