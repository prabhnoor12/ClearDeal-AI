


export type AIProvider = 'openai' | 'anthropic' | 'azure' | 'mock';

export interface AIConfig {
	provider: AIProvider;
	openai?: {
		apiKey: string;
		model: string;
		endpoint?: string;
	};
	anthropic?: {
		apiKey: string;
		model: string;
		endpoint?: string;
	};
	azure?: {
		apiKey: string;
		endpoint: string;
		deployment: string;
		model: string;
	};
	mock?: {
		enabled: boolean;
	};
	defaultTemperature: number;
	maxTokens: number;
	timeoutMs: number;
}

export const AI_CONFIG: AIConfig = {
	provider: (process.env['AI_PROVIDER'] as AIProvider) || 'openai',
	openai: {
		apiKey: process.env['OPENAI_API_KEY'] || '',
		model: process.env['OPENAI_MODEL'] || 'gpt-4',
		endpoint: process.env['OPENAI_ENDPOINT'] || '',
	},
	anthropic: {
		apiKey: process.env['ANTHROPIC_API_KEY'] || '',
		model: process.env['ANTHROPIC_MODEL'] || 'claude-2',
		endpoint: process.env['ANTHROPIC_ENDPOINT'] || '',
	},
	azure: {
		apiKey: process.env['AZURE_OPENAI_API_KEY'] || '',
		endpoint: process.env['AZURE_OPENAI_ENDPOINT'] || '',
		deployment: process.env['AZURE_OPENAI_DEPLOYMENT'] || '',
		model: process.env['AZURE_OPENAI_MODEL'] || '',
	},
	mock: {
		enabled: process.env['AI_MOCK'] === 'true',
	},
	defaultTemperature: Number(process.env['AI_TEMPERATURE']) || 0.2,
	maxTokens: Number(process.env['AI_MAX_TOKENS']) || 2048,
	timeoutMs: Number(process.env['AI_TIMEOUT_MS']) || 30000,
};
