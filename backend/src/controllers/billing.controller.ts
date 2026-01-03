
import { Request, Response, NextFunction } from 'express';
import * as billingService from '../services/billing.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

// ============================================================================ 
// Subscription Management
// ============================================================================

/**
 * POST /billing/subscription
 * Create a new subscription
 */
export async function createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { userId, tierId, paymentMethodId } = req.body;
		if (!userId || !tierId) {
			sendError(res, 'userId and tierId are required', 400);
			return;
		}
		const subscription = await billingService.createSubscription({ userId, tierId, paymentMethodId });
		sendSuccess(res, subscription, 'Subscription created', undefined, 201);
	} catch (error) {
		logger.error('[BillingController] createSubscription error', error);
		next(error);
	}
}

/**
 * POST /billing/subscription/:id/change-tier
 * Change subscription tier
 */
export async function changeSubscriptionTier(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { id } = req.params;
		const { newTierId } = req.body;
		if (!id || !newTierId) {
			sendError(res, 'subscriptionId and newTierId are required', 400);
			return;
		}
		const updated = await billingService.changeSubscriptionTier(id, newTierId);
		if (!updated) {
			sendError(res, 'Subscription not found', 404);
			return;
		}
		sendSuccess(res, updated, 'Subscription tier updated');
	} catch (error) {
		logger.error('[BillingController] changeSubscriptionTier error', error);
		next(error);
	}
}

/**
 * POST /billing/subscription/:id/pause
 * Pause a subscription
 */
export async function pauseSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { id } = req.params;
		if (!id) {
			sendError(res, 'subscriptionId is required', 400);
			return;
		}
		const updated = await billingService.pauseSubscription(id);
		if (!updated) {
			sendError(res, 'Subscription not found', 404);
			return;
		}
		sendSuccess(res, updated, 'Subscription paused');
	} catch (error) {
		logger.error('[BillingController] pauseSubscription error', error);
		next(error);
	}
}

/**
 * POST /billing/subscription/:id/resume
 * Resume a paused subscription
 */
export async function resumeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { id } = req.params;
		if (!id) {
			sendError(res, 'subscriptionId is required', 400);
			return;
		}
		const updated = await billingService.resumeSubscription(id);
		if (!updated) {
			sendError(res, 'Subscription not found', 404);
			return;
		}
		sendSuccess(res, updated, 'Subscription resumed');
	} catch (error) {
		logger.error('[BillingController] resumeSubscription error', error);
		next(error);
	}
}

/**
 * POST /billing/subscription/:id/cancel
 * Cancel a subscription
 */
export async function cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { id } = req.params;
		if (!id) {
			sendError(res, 'subscriptionId is required', 400);
			return;
		}
		const updated = await billingService.cancelSubscription(id);
		if (!updated) {
			sendError(res, 'Subscription not found', 404);
			return;
		}
		sendSuccess(res, updated, 'Subscription cancelled');
	} catch (error) {
		logger.error('[BillingController] cancelSubscription error', error);
		next(error);
	}
}

// ============================================================================ 
// Usage & Billing
// ============================================================================

/**
 * GET /billing/usage/:orgId
 * Get current usage for an organization
 */
export async function getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { orgId } = req.params;
		if (!orgId) {
			sendError(res, 'orgId is required', 400);
			return;
		}
		const usage = await billingService.calculateUsage(orgId);
		sendSuccess(res, usage, 'Usage retrieved');
	} catch (error) {
		logger.error('[BillingController] getUsage error', error);
		next(error);
	}
}

/**
 * GET /billing/history/:orgId
 * Get billing history for an organization
 */
export async function getBillingHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { orgId } = req.params;
		if (!orgId) {
			sendError(res, 'orgId is required', 400);
			return;
		}
		const history = await billingService.getBillingHistory(orgId);
		sendSuccess(res, history, 'Billing history retrieved');
	} catch (error) {
		logger.error('[BillingController] getBillingHistory error', error);
		next(error);
	}
}

/**
 * GET /billing/estimate/:orgId
 * Estimate next month's bill
 */
export async function estimateNextBill(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { orgId } = req.params;
		if (!orgId) {
			sendError(res, 'orgId is required', 400);
			return;
		}
		const estimate = await billingService.estimateNextBill(orgId);
		sendSuccess(res, estimate, 'Estimated next bill');
	} catch (error) {
		logger.error('[BillingController] estimateNextBill error', error);
		next(error);
	}
}

/**
 * GET /billing/tiers
 * Get all available billing tiers
 */
export function getAllTiers(_req: Request, res: Response): void {
	try {
		const tiers = billingService.getAllTiers();
		sendSuccess(res, tiers, 'Billing tiers');
	} catch (error) {
		logger.error('[BillingController] getAllTiers error', error);
		sendError(res, 'Failed to get billing tiers', 500, error);
	}
}

/**
 * GET /billing/credits/:orgId
 * Check credits for an organization
 */
export async function checkCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { orgId } = req.params;
		if (!orgId) {
			sendError(res, 'orgId is required', 400);
			return;
		}
		const credits = await billingService.checkCredits(orgId);
		sendSuccess(res, credits, 'Credits checked');
	} catch (error) {
		logger.error('[BillingController] checkCredits error', error);
		next(error);
	}
}
