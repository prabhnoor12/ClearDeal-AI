import { z } from 'zod';

// Billing Tier validation
export const BillingTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  monthlyPrice: z.number().min(0),
  includedScans: z.number().min(0),
  overagePrice: z.number().min(0),
  features: z.array(z.string()),
});

// Subscription creation validation
export const SubscriptionCreateSchema = z.object({
  userId: z.string().min(1),
  tierId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

// Payment info validation
export const PaymentInfoSchema = z.object({
  cardNumber: z.string().length(16),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  cvc: z.string().length(3),
  name: z.string().min(1),
});

// Validate billing config
export const BillingConfigSchema = z.object({
  provider: z.enum(['stripe', 'mock']),
  stripe: z
    .object({
      apiKey: z.string().min(1),
      webhookSecret: z.string().min(1),
    })
    .optional(),
  tiers: z.array(BillingTierSchema),
  defaultTierId: z.string().min(1),
  currency: z.string().min(1),
  usageBillingEnabled: z.boolean(),
});

// Utility functions
export function validateBillingTier(data: unknown) {
  return BillingTierSchema.safeParse(data);
}

export function validateSubscriptionCreate(data: unknown) {
  return SubscriptionCreateSchema.safeParse(data);
}

export function validatePaymentInfo(data: unknown) {
  return PaymentInfoSchema.safeParse(data);
}

export function validateBillingConfig(data: unknown) {
  return BillingConfigSchema.safeParse(data);
}
