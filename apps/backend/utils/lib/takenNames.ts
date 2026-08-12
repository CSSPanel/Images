import { IMAGE_SPLITER, PENDING_PREFIX } from '../constants/Files'
import { normalizeMapName } from './mapName'
import { listKeys } from './r2/get'

export type NameHolder = {
	/** `approved` maps live at the bucket root, `pending` ones are awaiting review. */
	kind: 'approved' | 'pending'
	key: string
}

/**
 * Map every taken map name to the object holding it, in two list calls.
 * Approved maps win over pending ones: the approved object is what a replacement
 * would actually overwrite.
 */
export const listTakenNames = async (): Promise<Map<string, NameHolder>> => {
	const [approved, pending] = await Promise.all([listKeys('', { delimiter: '/' }), listKeys(PENDING_PREFIX)])

	const taken = new Map<string, NameHolder>()

	for (const object of pending) {
		// pending/{ts}-----{name}.webp
		const base = object.name.split(IMAGE_SPLITER).pop()
		if (base) taken.set(normalizeMapName(base), { kind: 'pending', key: object.key })
	}

	for (const object of approved) {
		if (object.name.endsWith('.webp')) taken.set(normalizeMapName(object.name), { kind: 'approved', key: object.key })
	}

	return taken
}
