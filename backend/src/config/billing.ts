


export interface BillingTier {
	id: string;
	name: string;
	monthlyPrice: number;
	includedScans: number;
	overagePrice: number;
	features: string[];
}

export interface BillingConfig {
	provider: 'stripe' | 'mock';
	stripe?: {
		apiKey: string;
		webhookSecret: string;
	};
	tiers: BillingTier[];
	defaultTierId: string;
	currency: string;
	usageBillingEnabled: boolean;
}

export const BILLING_CONFIG: BillingConfig = {
	provider: (process.env['BILLING_PROVIDER'] as 'stripe' | 'mock') || 'stripe',
	stripe: {
		apiKey: process.env['STRIPE_API_KEY'] || '',
		webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || '',
	},
	tiers: [
		{
			id: 'agent',
			name: 'Agent',
			monthlyPrice: Number(process.env['BILLING_AGENT_PRICE']) || 49,
			includedScans: Number(process.env['BILLING_AGENT_SCANS']) || 20,
			overagePrice: Number(process.env['BILLING_AGENT_OVERAGE']) || 3,
			features: ['Single agent', 'Basic risk reports', 'Email support'],
		},
		{
			id: 'broker',
			name: 'Broker',
			monthlyPrice: Number(process.env['BILLING_BROKER_PRICE']) || 199,
			includedScans: Number(process.env['BILLING_BROKER_SCANS']) || 100,
			overagePrice: Number(process.env['BILLING_BROKER_OVERAGE']) || 2,
			features: ['Team dashboard', 'Broker analytics', 'Priority support'],
		},
		{
			id: 'enterprise',
			name: 'Enterprise',
			monthlyPrice: Number(process.env['BILLING_ENTERPRISE_PRICE']) || 999,
			includedScans: Number(process.env['BILLING_ENTERPRISE_SCANS']) || 1000,
			overagePrice: Number(process.env['BILLING_ENTERPRISE_OVERAGE']) || 1,
			features: ['Custom integrations', 'White-label', 'Dedicated support'],
		},
	],
	defaultTierId: process.env['BILLING_DEFAULT_TIER'] || 'agent',
	currency: process.env['BILLING_CURRENCY'] || 'USD',
	usageBillingEnabled: process.env['BILLING_USAGE_ENABLED'] === 'true',
};
