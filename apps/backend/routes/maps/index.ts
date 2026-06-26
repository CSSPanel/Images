import Elysia, { t } from 'elysia'
import sharp from 'sharp'
import { DEFAULT_WIDTH, MAX_SERVE_DIMENSION, SERVE_WEBP_QUALITY } from '../../utils/constants/Files'
import { normalizeMapName } from '../../utils/lib/mapName'
import { getObjectBuffer, listKeys } from '../../utils/lib/r2/get'

// Parse a query dimension into a clamped integer, or undefined when absent/invalid.
const parseDimension = (value?: string): number | undefined => {
	if (!value) return undefined
	const n = Number.parseInt(value, 10)
	if (!Number.isFinite(n) || n <= 0) return undefined
	return Math.min(n, MAX_SERVE_DIMENSION)
}

const MapsRoutes = new Elysia({
	detail: {
		tags: ['Maps'],
	},
})
	.get(
		'/',
		async ({ error }) => {
			try {
				// Approved maps live at the bucket root; the delimiter keeps pending/ out.
				const objects = await listKeys('', { delimiter: '/' })

				return objects
					.filter(o => o.name.endsWith('.webp'))
					.map(o => ({ name: o.name.replace('.webp', ''), fileName: o.name }))
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Get all maps',
			},
		},
	)
	.get(
		'/:map',
		async ({ params: { map }, query, headers, set, error }) => {
			try {
				const name = normalizeMapName(map)
				if (!name) {
					set.status = 400
					return 'Invalid map name'
				}

				// Resolve the source map, falling back to ?fallback=<map> when missing.
				let object = await getObjectBuffer(`${name}.webp`)
				if (!object && query.fallback) {
					const fallback = normalizeMapName(query.fallback)
					if (fallback) object = await getObjectBuffer(`${fallback}.webp`)
				}
				if (!object) {
					set.status = 404
					return 'Map not found'
				}

				let width = parseDimension(query.width)
				const height = parseDimension(query.height)
				// Default to a width when neither dimension is requested (height stays auto).
				if (!width && !height) width = DEFAULT_WIDTH

				// Revalidation: a cheap ETag keyed by the source + requested size.
				const etag = `"${object.etag ?? 'na'}-w${width ?? 'auto'}-h${height ?? 'auto'}"`
				const cacheControl = 'public, max-age=86400, stale-while-revalidate=604800'

				if (headers['if-none-match'] === etag) {
					set.status = 304
					set.headers.ETag = etag
					set.headers['Cache-Control'] = cacheControl
					return ''
				}

				// `fit: inside` preserves the source aspect ratio within the box;
				// `withoutEnlargement` never upscales past the stored map.
				const buffer = await sharp(object.body)
					.resize({ width, height, fit: 'inside', withoutEnlargement: true })
					.webp({ quality: SERVE_WEBP_QUALITY })
					.toBuffer()

				set.headers['Cache-Control'] = cacheControl
				set.headers.ETag = etag

				// Return a typed Blob: elysia-compress detects image/webp as
				// non-compressible and passes it through untouched. Returning a raw
				// buffer instead gets mis-detected as text and Brotli-compressed,
				// which mangles the Content-Type; a bare `new Response` is emptied.
				return new Blob([buffer], { type: 'image/webp' })
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Get a map resized to width/height (aspect preserved), output webp',
			},
			params: t.Object({
				map: t.String(),
			}),
			query: t.Object({
				width: t.Optional(t.String()),
				height: t.Optional(t.String()),
				fallback: t.Optional(t.String()),
			}),
		},
	)

export default MapsRoutes
