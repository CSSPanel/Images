import sharp from 'sharp'
import { MASTER_MAX_DIMENSION } from '../constants/Files'
import { getObjectBuffer } from './r2/get'

export type Dimensions = {
	width: number
	height: number
}

export type ImageMeta = Dimensions & {
	bytes: number
}

export type ResolutionVerdict = 'higher' | 'same' | 'lower'

/** Read the pixel dimensions + stored size of an object. Null when it doesn't exist. */
export const readStoredMeta = async (key: string): Promise<ImageMeta | null> => {
	const object = await getObjectBuffer(key)
	if (!object) return null

	const meta = await sharp(object.body).metadata()

	return { width: meta.width ?? 0, height: meta.height ?? 0, bytes: object.body.byteLength }
}

/**
 * Dimensions an incoming image ends up with once stored: the master resize
 * (`fit: 'inside'` + `withoutEnlargement`) only ever downscales, to fit
 * MASTER_MAX_DIMENSION on the longest side.
 */
export const storedDimensions = ({ width, height }: Dimensions): Dimensions => {
	const longest = Math.max(width, height)
	if (longest <= 0 || longest <= MASTER_MAX_DIMENSION) return { width, height }

	const scale = MASTER_MAX_DIMENSION / longest

	return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Compare two images by pixel count — tells an upgrade apart from a downgrade. */
export const compareResolution = (incoming: Dimensions, existing: Dimensions): ResolutionVerdict => {
	const incomingPixels = incoming.width * incoming.height
	const existingPixels = existing.width * existing.height

	if (incomingPixels > existingPixels) return 'higher'
	if (incomingPixels < existingPixels) return 'lower'
	return 'same'
}
