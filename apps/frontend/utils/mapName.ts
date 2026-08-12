/**
 * Client-side mirror of the backend's `normalizeMapName`
 * (apps/backend/utils/lib/mapName.ts). The server stays the authority on what a file is
 * stored as — this only keys local conflict lookups by the name it will end up with.
 *
 * "De_Dust2.WEBP" -> "de_dust2"
 */
export const normalizeMapName = (raw: string): string =>
	raw
		.trim()
		.toLowerCase()
		.replace(/\.[a-z0-9]+$/, '')
		.replace(/[^a-z0-9_-]/g, '')
