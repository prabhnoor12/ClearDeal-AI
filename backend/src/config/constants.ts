
// Application-wide constants
export const APP_NAME = 'ClearDeal-AI';
export const APP_ENV = process.env['NODE_ENV'] || 'development';
export const APP_VERSION = process.env['APP_VERSION'] || '1.0.0';
export const API_PREFIX = process.env['API_PREFIX'] || '/api';
export const DEFAULT_TIMEZONE = process.env['DEFAULT_TIMEZONE'] || 'UTC';
export const DEFAULT_LOCALE = process.env['DEFAULT_LOCALE'] || 'en-US';

// Roles
export const ROLES = {
	AGENT: 'agent',
	BROKER: 'broker',
	ADMIN: 'admin',
} as const;

// Risk score boundaries
export const RISK_SCORE_MIN = 0;
export const RISK_SCORE_MAX = 100;

// PDF
export const PDF_DEFAULT_FONT = 'Helvetica';
export const PDF_PAGE_SIZE = 'A4';

// Misc
export const SUPPORT_EMAIL = process.env['SUPPORT_EMAIL'] || 'support@cleardeal.ai';
export const DOCS_URL = process.env['DOCS_URL'] || 'https://docs.cleardeal.ai';
