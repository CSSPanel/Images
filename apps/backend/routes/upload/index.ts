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
import {
	type Dimensions,
	type ImageMeta,
	type ResolutionVerdict,
	compareResolution,
	readStoredMeta,
	storedDimensions,
} from '../../utils/lib/imageMeta'
import { normalizeMapName } from '../../utils/lib/mapName'
import { uploadBuffer } from '../../utils/lib/r2'
import { objectExists } from '../../utils/lib/r2/get'
import { listTakenNames } from '../../utils/lib/takenNames'

type UploadResult = {
	name: string
	status: 'pending' | 'exists' | 'rejected'
	reason?: string
	/** What the upload was accepted as a replacement for, when it replaces something. */
	replaces?: 'approved' | 'pending'
}

type CheckResult = {
	/** Normalized name the file would be stored under. */
	name: string
	state: 'free' | 'approved' | 'pending'
	/** The image currently holding the name. */
	existing: ImageMeta | null
	/** Dimensions the incoming file ends up with after the master downscale. */
	incoming: Dimensions | null
	/** Incoming vs existing resolution. Null when there's nothing to compare. */
	resolution: ResolutionVerdict | null
}

const UploadRoutes = new Elysia({
	detail: {
		tags: ['Upload'],
	},
})
	.post(
		'/check',
		async ({ body, error }) => {
			try {
				const taken = await listTakenNames()

				// Several files can target the same name — only read each object once.
				const metaCache = new Map<string, Promise<ImageMeta | null>>()
				const metaOf = (key: string) => {
					const cached = metaCache.get(key)
					if (cached) return cached

					const meta = readStoredMeta(key)
					metaCache.set(key, meta)
					return meta
				}

				const results = await Promise.all(
					body.files.map(async ({ name, width, height }): Promise<CheckResult> => {
						const mapName = normalizeMapName(name)
						const holder = mapName ? taken.get(mapName) : undefined

						if (!holder) {
							return { name: mapName, state: 'free', existing: null, incoming: null, resolution: null }
						}

						const existing = await metaOf(holder.key)
						const incoming = width && height ? storedDimensions({ width, height }) : null

						return {
							name: mapName,
							state: holder.kind,
							existing,
							incoming,
							resolution: existing && incoming ? compareResolution(incoming, existing) : null,
						}
					}),
				)

				return results
			} catch (err) {
				console.error(err)
				return error(500, err instanceof Error ? err.message : 'An error occurred')
			}
		},
		{
			detail: {
				summary: 'Check which map names are already taken, and by what',
			},
			body: t.Object({
				files: t.Array(
					t.Object({
						name: t.String(),
						// Dimensions of the local file, so the answer can say whether it beats
						// the image that's already stored.
						width: t.Optional(t.Number()),
						height: t.Optional(t.Number()),
					}),
				),
			}),
		},
	)
	.post(
		'/',
		async ({ body, error }) => {
			try {
				// Names that are already taken (approved maps live at the bucket root, pending
				// uploads under the pending/ prefix), resolved without a round-trip per file.
				const taken = await listTakenNames()

				const results: UploadResult[] = []

				for (const { file, name, replace } of body.files) {
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

					// A taken name is only skipped when the uploader didn't ask to replace it.
					// Replacements still go through review — approving one is what overwrites
					// the live map, so nothing here can clobber it.
					const holder = taken.get(mapName)
					if (holder && !replace) {
						results.push({
							name: mapName,
							status: 'exists',
							reason: holder.kind === 'pending' ? 'Already awaiting review' : 'Map already exists',
						})
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
					if (!replace && (await objectExists(`${mapName}.webp`))) {
						results.push({ name: mapName, status: 'exists', reason: 'Map already exists' })
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

					taken.set(mapName, { kind: 'pending', key })
					results.push({ name: mapName, status: 'pending', replaces: holder?.kind })
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
						// Opt-in: submit even though the name is taken. The upload is queued for
						// review like any other, flagged as a replacement.
						replace: t.Optional(t.Boolean()),
					}),
				),
			}),
		},
	)

export default UploadRoutes
