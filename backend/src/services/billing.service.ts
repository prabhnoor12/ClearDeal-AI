// Billing service: handles usage, credits, and subscription management
import * as subscriptionRepository from '../repositories/subscription.repository';

import { Subscription } from '../repositories/subscription.repository';
import { BILLING_CONFIG, BillingTier } from '../config/billing';

export interface UsageRecord {
  orgId: string;
  scansUsed: number;
  scansIncluded: number;
  overageScans: number;
  overageCost: number;
  totalCost: number;
  billingPeriod: string;
}

export async function calculateUsage(orgId: string): Promise<UsageRecord> {
  const subscription = await getActiveSubscription(orgId);
  const tier = getTierById(subscription?.tierId || BILLING_CONFIG.defaultTierId);

  // TODO: Replace with actual scan count from database
  const scansUsed = Math.floor(Math.random() * 50);
  const scansIncluded = tier?.includedScans || 0;
  const overageScans = Math.max(0, scansUsed - scansIncluded);
  const overageCost = overageScans * (tier?.overagePrice || 0);
  const totalCost = (tier?.monthlyPrice || 0) + overageCost;

  return {
    orgId,
    scansUsed,
    scansIncluded,
    overageScans,
    overageCost,
    totalCost,
    billingPeriod: new Date().toISOString().slice(0, 7),
  };
}

export async function recordUsage(orgId: string, usage: UsageRecord): Promise<void> {
  console.log(`[BillingService] Recording usage for org ${orgId}:`, usage);
  // TODO: Store usage record in database
}

export async function getActiveSubscription(orgId: string): Promise<Subscription | null> {
  const subscriptions = await subscriptionRepository.findAll();
  return subscriptions.find(s => s.userId === orgId && s.status === 'active') || null;
}

export async function createSubscription(data: {
  userId: string;
  tierId: string;
  paymentMethodId?: string;
}): Promise<Subscription> {
  const tier = getTierById(data.tierId);
  if (!tier) throw new Error(`Invalid tier: ${data.tierId}`);

  const subscription: Subscription = {
    id: `sub_${Date.now()}`,
    userId: data.userId,
    tierId: data.tierId,
    startDate: new Date().toISOString(),
    status: 'active',
  };

  return subscriptionRepository.create(subscription);
}

export async function cancelSubscription(subscriptionId: string): Promise<Subscription | null> {
  return subscriptionRepository.update(subscriptionId, {
    status: 'cancelled',
    endDate: new Date().toISOString(),
  });
}

export function getTierById(tierId: string): BillingTier | undefined {
  return BILLING_CONFIG.tiers.find(t => t.id === tierId);
}

export function getAllTiers(): BillingTier[] {
  return BILLING_CONFIG.tiers;
}

export async function checkCredits(orgId: string): Promise<{ hasCredits: boolean; remaining: number }> {
  const usage = await calculateUsage(orgId);
  const remaining = usage.scansIncluded - usage.scansUsed;
  return {
    hasCredits: remaining > 0 || BILLING_CONFIG.usageBillingEnabled,
    remaining: Math.max(0, remaining),
  };
}
