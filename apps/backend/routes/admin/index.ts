import Elysia, { t } from 'elysia'
import isAdmin from '../../middlewares/isAdmin'
import { IMAGE_SPLITER, PENDING_PREFIX } from '../../utils/constants/Files'
import { normalizeMapName } from '../../utils/lib/mapName'
import { DeleteR2File } from '../../utils/lib/r2/delete'
import { copyObject, getObjectBuffer, listKeys } from '../../utils/lib/r2/get'

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
		async ({ params: { image }, body: { name }, error }) => {
			try {
				const mapName = normalizeMapName(name)
				if (!mapName) return new Response('Invalid name', { status: 400 })

				const src = `${PENDING_PREFIX}${image}`

				// Make sure the pending object still exists before approving.
				const object = await getObjectBuffer(src)
				if (!object) return new Response('Pending image not found', { status: 404 })

				// Approve = copy to the bucket root as {name}.webp, then drop the pending object.
				await copyObject(src, `${mapName}.webp`)
				await DeleteR2File(src)

				return true
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Approve a pending image',
			},
			body: t.Object({
				name: t.String(),
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
