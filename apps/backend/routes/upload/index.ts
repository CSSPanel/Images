import Elysia, { t } from 'elysia'
import sharp from 'sharp'
import {
	IMAGE_SPLITER,
	MASTER_MAX_DIMENSION,
	MASTER_WEBP_QUALITY,
	MAX_UPLOAD_BYTES,
	MIN_DIMENSION,
	PENDING_PREFIX,
} from '../../utils/constants/Files'
import { normalizeMapName } from '../../utils/lib/mapName'
import { uploadBuffer } from '../../utils/lib/r2'
import { listKeys, objectExists } from '../../utils/lib/r2/get'

type UploadResult = {
	name: string
	status: 'pending' | 'skipped' | 'rejected'
	reason?: string
}

const UploadRoutes = new Elysia({
	detail: {
		tags: ['Upload'],
	},
}).post(
	'/',
	async ({ body, error }) => {
		try {
			// Collect names that are already taken (approved maps live at the bucket
			// root; pending uploads live under the pending/ prefix) so we can skip
			// duplicates without a round-trip per file.
			const [approved, pending] = await Promise.all([listKeys('', { delimiter: '/' }), listKeys(PENDING_PREFIX)])

			const taken = new Set<string>()
			for (const o of approved) {
				if (o.name.endsWith('.webp')) taken.add(normalizeMapName(o.name))
			}
			for (const o of pending) {
				// pending/{ts}-----{name}.webp
				const base = o.name.split(IMAGE_SPLITER).pop()
				if (base) taken.add(normalizeMapName(base))
			}

			const results: UploadResult[] = []

			for (const { file, name } of body.files) {
				const mapName = normalizeMapName(name)

				if (!mapName) {
					results.push({ name, status: 'rejected', reason: 'Invalid name' })
					continue
				}

				// Decode base64 (tolerate an accidental data: URL prefix).
				const base64 = file.includes(',') ? file.slice(file.indexOf(',') + 1) : file
				const decoded = Buffer.from(base64, 'base64')

				if (decoded.byteLength > MAX_UPLOAD_BYTES) {
					results.push({ name: mapName, status: 'rejected', reason: 'File too large' })
					continue
				}

				if (taken.has(mapName)) {
					results.push({ name: mapName, status: 'skipped', reason: 'Map already exists' })
					continue
				}

				// Validate resolution.
				const meta = await sharp(decoded).metadata()
				const longest = Math.max(meta.width ?? 0, meta.height ?? 0)
				if (longest < MIN_DIMENSION) {
					results.push({
						name: mapName,
						status: 'rejected',
						reason: `Resolution too low (min ${MIN_DIMENSION}px on the longest side)`,
					})
					continue
				}

				// Double-check against a concurrent upload that didn't show in the list yet.
				if (await objectExists(`${mapName}.webp`)) {
					results.push({ name: mapName, status: 'skipped', reason: 'Map already exists' })
					continue
				}

				// Normalize to webp. `fit: inside` + `withoutEnlargement` keeps images that
				// are already <= MASTER_MAX_DIMENSION at their original size and only
				// downscales larger ones; it never upscales.
				const webp = await sharp(decoded)
					.rotate()
					.resize({
						width: MASTER_MAX_DIMENSION,
						height: MASTER_MAX_DIMENSION,
						fit: 'inside',
						withoutEnlargement: true,
					})
					.webp({ quality: MASTER_WEBP_QUALITY })
					.toBuffer()

				const key = `${PENDING_PREFIX}${Date.now()}${IMAGE_SPLITER}${mapName}.webp`
				await uploadBuffer(webp, key, 'image/webp')

				taken.add(mapName)
				results.push({ name: mapName, status: 'pending' })
			}

			return results
		} catch (err) {
			console.error(err)
			return error(500, err instanceof Error ? err.message : 'An error occurred')
		}
	},
	{
		detail: {
			summary: 'Upload map images for review',
		},
		body: t.Object({
			files: t.Array(
				t.Object({
					file: t.String(),
					name: t.String(),
				}),
			),
		}),
	},
)

export default UploadRoutes
