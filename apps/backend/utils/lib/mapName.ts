/**
 * Normalize a map name for use as an R2 key / URL segment.
 * - lowercases
 * - strips a trailing file extension (e.g. ".webp", ".png")
 * - keeps only [a-z0-9_-]
 *
 * "De_Dust2.WEBP" -> "de_dust2"
 */
export const normalizeMapName = (raw: string): string =>
	raw
		.trim()
		.toLowerCase()
		.replace(/\.[a-z0-9]+$/, '')
		.replace(/[^a-z0-9_-]/g, '')
