// Billing routes: Subscription, usage, and payment endpoints
import { Router } from 'express';
import * as billingController from '../controllers/billing.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All billing routes require authentication
router.use(authenticate);

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * POST /billing/subscription
 * Create a new subscription
 */
router.post('/subscription', billingController.createSubscription);

/**
 * POST /billing/subscription/:id/change-tier
 * Change subscription tier
 */
router.post('/subscription/:id/change-tier', billingController.changeSubscriptionTier);

/**
 * POST /billing/subscription/:id/pause
 * Pause a subscription
 */
router.post('/subscription/:id/pause', billingController.pauseSubscription);

/**
 * POST /billing/subscription/:id/resume
 * Resume a paused subscription
 */
router.post('/subscription/:id/resume', billingController.resumeSubscription);

/**
 * POST /billing/subscription/:id/cancel
 * Cancel a subscription
 */
router.post('/subscription/:id/cancel', billingController.cancelSubscription);

// ============================================================================
// Usage & Billing
// ============================================================================

/**
 * GET /billing/usage/:orgId
 * Get current usage for an organization
 */
router.get('/usage/:orgId', billingController.getUsage);

/**
 * GET /billing/history/:orgId
 * Get billing history for an organization
 */
router.get('/history/:orgId', billingController.getBillingHistory);

/**
 * GET /billing/estimate/:orgId
 * Estimate next month's bill
 */
router.get('/estimate/:orgId', billingController.estimateNextBill);

/**
 * GET /billing/tiers
 * Get all available billing tiers
 */
router.get('/tiers', billingController.getAllTiers);

/**
 * GET /billing/credits/:orgId
 * Check credits for an organization
 */
router.get('/credits/:orgId', billingController.checkCredits);

export default router;
