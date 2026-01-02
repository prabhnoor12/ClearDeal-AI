
/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
	const iso = date.toISOString();
	const parts = iso.split('T');
	return parts[0] ?? '';
}

/**
 * Formats a Date object to YYYY-MM-DD HH:mm:ss string (UTC).
 */
export function formatDateTime(date: Date): string {
	return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Formats a Date object to a custom string using Intl.DateTimeFormat.
 * @param date Date object
 * @param locale e.g. 'en-US'
 * @param options Intl.DateTimeFormatOptions
 */
export function formatWithLocale(date: Date, locale = 'en-US', options?: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Parses a YYYY-MM-DD string to a Date object (UTC, no time component).
 */
export function parseDate(dateStr: string): Date {
	const [yearStr, monthStr, dayStr] = dateStr.split('-');
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);
	if (
		Number.isNaN(year) ||
		Number.isNaN(month) ||
		Number.isNaN(day) ||
		month < 1 || month > 12 ||
		day < 1 || day > 31
	) {
		throw new Error('Invalid date string');
	}
	return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Parses a date-time string (YYYY-MM-DD HH:mm:ss or ISO) to a Date object (UTC).
 */
export function parseDateTime(dateTimeStr: string): Date {
	// Accepts 'YYYY-MM-DD HH:mm:ss' or ISO
	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateTimeStr)) {
		return new Date(dateTimeStr.replace(' ', 'T') + 'Z');
	}
	return new Date(dateTimeStr);
}

/**
 * Adds days to a date and returns a new Date object.
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Adds months to a date and returns a new Date object.
 */
export function addMonths(date: Date, months: number): Date {
	const result = new Date(date);
	result.setMonth(result.getMonth() + months);
	return result;
}

/**
 * Adds years to a date and returns a new Date object.
 */
export function addYears(date: Date, years: number): Date {
	const result = new Date(date);
	result.setFullYear(result.getFullYear() + years);
	return result;
}

/**
 * Returns a date range array from start to end (inclusive, step in days).
 */
export function dateRange(start: Date, end: Date, step = 1): Date[] {
	const range: Date[] = [];
	let current = new Date(start);
	while (current <= end) {
		range.push(new Date(current));
		current = addDays(current, step);
	}
	return range;
}

/**
 * Returns true if two dates are the same day (ignores time).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getUTCFullYear() === date2.getUTCFullYear() &&
		date1.getUTCMonth() === date2.getUTCMonth() &&
		date1.getUTCDate() === date2.getUTCDate()
	);
}

/**
 * Returns true if date1 is before date2 (ignores time).
 */
export function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

/**
 * Returns true if date1 is after date2 (ignores time).
 */
export function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

/**
 * Returns the difference in days between two dates (date2 - date1).
 */
export function diffInDays(date1: Date, date2: Date): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
	const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
	return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Returns the start of the day (00:00:00.000 UTC) for a given date.
 */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Returns the end of the day (23:59:59.999 UTC) for a given date.
 */
export function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/**
 * Checks if a date is between two other dates (inclusive).
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}
