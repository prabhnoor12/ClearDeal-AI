// AI client for ClearDeal AI
// Abstracts calls to OpenAI, Claude, etc.

export type AIProvider = 'openai' | 'claude' | 'mock';

export interface AIRequest {
  prompt: string;
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  log?: boolean;
}

export interface AIResponse {
  raw: string;
  parsed?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
  try {
    // TODO: Implement provider-specific logic
    if (request.log) {
      console.log(`[AI] Calling ${request.provider || 'openai'} with prompt:`, request.prompt);
    }
    // For now, return mock response
    return {
      raw: `Mock response for prompt: ${request.prompt}`,
      parsed: {},
      usage: { promptTokens: 10, completionTokens: 50, totalTokens: 60 },
    };
  } catch (err: any) {
    return {
      raw: '',
      error: err.message || 'Unknown AI error',
    };
  }
}
