import Elysia, { t } from 'elysia'
import isAdmin from '../../middlewares/isAdmin'
import { IMAGE_SPLITER, PENDING_PREFIX } from '../../utils/constants/Files'
import { compareResolution, readStoredMeta } from '../../utils/lib/imageMeta'
import { normalizeMapName } from '../../utils/lib/mapName'
import { DeleteR2File } from '../../utils/lib/r2/delete'
import { copyObject, getObjectBuffer, listKeys, objectExists } from '../../utils/lib/r2/get'

const AdminRoutes = new Elysia({
	detail: {
		tags: ['Admin'],
	},
})
	.use(isAdmin)
	.get(
		'/pending',
		async ({ error }) => {
			try {
				// List uploads awaiting approval (pending/{timestamp}-----{name}.webp).
				const objects = await listKeys(PENDING_PREFIX)

				const files = objects
					.map(o => {
						const [timeStr, namePart] = o.name.split(IMAGE_SPLITER)
						if (!timeStr || !namePart) return null

						return {
							timestamp: Number.parseInt(timeStr) || 0,
							name: namePart.replace('.webp', ''),
							// Key without the pending/ prefix — used by the other admin routes.
							fileName: o.name,
						}
					})
					.filter((f): f is NonNullable<typeof f> => f !== null)
					.sort((a, b) => b.timestamp - a.timestamp)

				return files
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Get all pending images',
			},
		},
	)
	.get(
		'/:image/compare',
		async ({ params: { image }, query: { name }, error }) => {
			try {
				const mapName = normalizeMapName(name)
				if (!mapName) return error(400, 'Invalid name')

				const [incoming, existing] = await Promise.all([
					readStoredMeta(`${PENDING_PREFIX}${image}`),
					readStoredMeta(`${mapName}.webp`),
				])

				if (!incoming) return error(404, 'Pending image not found')

				return {
					name: mapName,
					incoming,
					// Null when the name is free — nothing would be overwritten.
					existing,
					resolution: existing ? compareResolution(incoming, existing) : null,
				}
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Compare a pending image against the map it would replace',
			},
			params: t.Object({
				image: t.String(),
			}),
			query: t.Object({
				name: t.String(),
			}),
		},
	)
	.get(
		'/:image',
		async ({ params: { image }, set, error }) => {
			try {
				const object = await getObjectBuffer(`${PENDING_PREFIX}${image}`)
				if (!object) {
					set.status = 404
					return 'Not found'
				}

				// Return a typed Blob: elysia-compress detects image/webp as
				// non-compressible and passes it through untouched. Returning a raw
				// buffer instead gets mis-detected as text and Brotli-compressed,
				// which mangles the Content-Type; a bare `new Response` is emptied.
				return new Blob([object.body], { type: 'image/webp' })
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Get a pending image',
			},
			params: t.Object({
				image: t.String(),
			}),
		},
	)
	.post(
		'/:image',
		async ({ params: { image }, body: { name, replace }, error }) => {
			try {
				const mapName = normalizeMapName(name)
				if (!mapName) return error(400, 'Invalid name')

				const src = `${PENDING_PREFIX}${image}`
				const dest = `${mapName}.webp`

				// Make sure the pending object still exists before approving.
				if (!(await objectExists(src))) return error(404, 'Pending image not found')

				// Approving a taken name overwrites the live map for good, so it has to be
				// asked for explicitly — this is what keeps a bulk approval from silently
				// replacing existing maps.
				if (!replace && (await objectExists(dest))) return error(409, 'Map already exists')

				// Approve = copy to the bucket root as {name}.webp, then drop the pending object.
				await copyObject(src, dest)
				await DeleteR2File(src)

				return true
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Approve a pending image (pass replace to overwrite an existing map)',
			},
			body: t.Object({
				name: t.String(),
				replace: t.Optional(t.Boolean()),
			}),
			params: t.Object({
				image: t.String(),
			}),
		},
	)
	.delete(
		'/:image',
		async ({ params: { image }, error }) => {
			try {
				await DeleteR2File(`${PENDING_PREFIX}${image}`)
				return true
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Delete a pending image',
			},
			params: t.Object({
				image: t.String(),
			}),
		},
	)

export default AdminRoutes
