


import {
	v1 as uuidv1,
	v4 as uuidv4,
	v5 as uuidv5,
	NIL as NIL_UUID,
	validate as uuidValidate,
	version as uuidVersion,
	parse as uuidParse,
	stringify as uuidStringify,
} from 'uuid';

/**
 * Type for a UUID string (v1, v4, v5, or nil).
 */
export type UUID = string & { readonly __uuid: unique symbol };


/**
 * Generates a UUID v1 string (timestamp-based).
 */
export function generateUuidV1(): UUID {
	return uuidv1() as UUID;
}


/**
 * Generates a UUID v4 string (random-based).
 */
export function generateUuidV4(): UUID {
	return uuidv4() as UUID;
}

/**
 * Generates a UUID v5 string (namespace-based, deterministic).
 * @param name The name to hash.
 * @param namespace A UUID string namespace (must be valid UUID).
 */
export function generateUuidV5(name: string, namespace: string): UUID {
	if (!uuidValidate(namespace)) throw new Error('Invalid namespace UUID');
	return uuidv5(name, namespace) as UUID;
}

/**
 * Returns the nil UUID (all zeros).
 */
export function nilUuid(): UUID {
	return NIL_UUID as UUID;
}


/**
 * Validates if a string is a valid UUID (v1, v4, v5, or nil).
 */
export function isValidUuid(uuid: string): uuid is UUID {
	return uuidValidate(uuid);
}


/**
 * Returns the version of a UUID (1, 4, 5, etc.), or null if invalid.
 */
export function getUuidVersion(uuid: string): number | null {
	if (!uuidValidate(uuid)) return null;
	return uuidVersion(uuid);
}


/**
 * Parses a UUID string into a byte array (Uint8Array).
 */
export function parseUuid(uuid: string): Uint8Array | null {
	if (!uuidValidate(uuid)) return null;
	return uuidParse(uuid);
}


/**
 * Stringifies a byte array (Uint8Array) into a UUID string.
 */
export function stringifyUuid(bytes: Uint8Array): UUID {
	return uuidStringify(bytes) as UUID;
}
