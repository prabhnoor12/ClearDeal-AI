import type { Response } from 'express';


/**
 * Type for a standard API response.
 */
export type ApiResponse<T = unknown> = {
	status: 'success' | 'error';
	message: string;
	data?: T;
	code?: number;
	details?: unknown;
	meta?: unknown;
};

/**
 * Checks if a response is an error response.
 */
export function isErrorResponse<T>(resp: ApiResponse<T>): resp is ApiResponse<never> {
  return resp.status === 'error';
}

/**
 * Standard API success response
 */
export function success<T>(data: T, message = 'Success', meta?: unknown): ApiResponse<T> {
	return {
		status: 'success',
		message,
		data,
		...(meta ? { meta } : {}),
	};
}

/**
 * Sends a success response using Express Response.
 */
export function sendSuccess<T>(res: Response, data: T, message = 'Success', meta?: unknown, status = 200) {
  return res.status(status).json(success(data, message, meta));
}


/**
 * Standard API error response
 */
export function error(message = 'Error', code = 400, details?: unknown): ApiResponse<never> {
	return {
		status: 'error',
		message,
		code,
		...(details ? { details } : {}),
	};
}

/**
 * Sends an error response using Express Response.
 */
export function sendError(res: Response, message = 'Error', code = 400, details?: unknown) {
  return res.status(code).json(error(message, code, details));
}

/**
 * Paginated API response
 */
export function paginated<T>(data: T[], total: number, page: number, pageSize: number, message = 'Success', meta?: unknown): ApiResponse<T[]> {
	return {
		status: 'success',
		message,
		data,
		meta: {
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
			...(meta ? meta : {}),
		},
	};
}

/**
 * Validation error response (for Zod or similar)
 */
export function validationError(errors: unknown, message = 'Validation failed', code = 422): ApiResponse<never> {
	return {
		status: 'error',
		message,
		code,
		details: errors,
	};
}

/**
 * Serializes an error (Error object or string) for API response.
 */
export function serializeError(err: unknown): { name: string; message: string; stack?: string } | string {
	if (err instanceof Error) {
		const { name, message, stack } = err;
		return stack !== undefined ? { name, message, stack } : { name, message };
	}
	if (typeof err === 'object' && err !== null && 'message' in err) {
		// @ts-ignore
		const name = (err as any).name || 'Error';
		const message = (err as any).message;
		const stack = (err as any).stack;
		return stack !== undefined ? { name, message, stack } : { name, message };
	}
	return String(err);
}

/**
 * Custom response builder for advanced use cases.
 */
export function custom<T>(response: ApiResponse<T>): ApiResponse<T> {
	return response;
}
