import Elysia, { t } from 'elysia'
import { Glob } from 'bun'
import sharp from 'sharp'

const FilesRoutes = new Elysia({
	detail: {
		tags: ['Files'],
	},
})
	.get(
		'/',
		async ({ error }) => {
			try {
				// Get all the pending images from '/uploads/temp'
				const glob = new Glob(`${Bun.env.FILES_PATH}/*.webp`)
				const files: { name: string; fileName: string }[] = []

				for await (const file of glob.scan('.')) {
					files.push({ name: file.replace('.webp', ''), fileName: file.split('\\').pop() || '' })
				}

				return files
			} catch (err) {
				console.error(err)
				return error(500, err)
			}
		},
		{
			detail: {
				summary: 'Get all images',
			},
		},
	)
	.get(
		'/:width/:image',
		async ({ params: { image, width }, error }) => {
			try {
				const w = Number.parseInt(width || '100')
				const selectedWidth = w > 1000 ? 1000 : w

				let decodedImage: string

				try {
					decodedImage = decodeURIComponent(image)
				} catch (uriError) {
					console.error('Failed to decode URI:', uriError, image)
					return new Response('Invalid image name', { status: 400 })
				}

				const PATH = `${Bun.env.FILES_PATH}/${decodedImage}`
				const imageBuffer = await sharp(PATH).resize({ width: selectedWidth }).toBuffer()

				return imageBuffer
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
				width: t.String(),
			}),
		},
	)

export default FilesRoutes
