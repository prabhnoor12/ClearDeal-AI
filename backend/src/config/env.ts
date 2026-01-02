
// Environment variable loader with strong typing and defaults
export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  OPENAI_API_KEY?: string;
  STRIPE_API_KEY?: string;
  [key: string]: string | number | undefined;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const ENV: EnvConfig = {
  NODE_ENV: (process.env['NODE_ENV'] as 'development' | 'production' | 'test') || 'development',
  PORT: Number(process.env['PORT']) || 3000,
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),
  JWT_SECRET: getEnvVar('JWT_SECRET', ''),
  ...(process.env['OPENAI_API_KEY'] && { OPENAI_API_KEY: process.env['OPENAI_API_KEY'] }),
  ...(process.env['STRIPE_API_KEY'] && { STRIPE_API_KEY: process.env['STRIPE_API_KEY'] }),
};
