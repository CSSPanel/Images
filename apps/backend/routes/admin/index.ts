import Elysia, { t } from 'elysia'
import { IMAGE_SPLITER } from '../../utils/constants/Files'
import { unlink } from 'node:fs/promises'
import { Glob } from 'bun'
import isAdmin from '../../middlewares/isAdmin'
import sharp from 'sharp'

const AdminRoutes = new Elysia({
	detail: {
		tags: ['Admin'],
	},
})
	.use(isAdmin)
	.get(
		'/:image',
		async ({ params: { image }, error }) => {
			try {
				let decodedImage: string

				try {
					decodedImage = decodeURIComponent(image)
				} catch (uriError) {
					console.error('Failed to decode URI:', uriError, image)
					// Remove the file if it's invalid
					await unlink(`${Bun.env.FILES_PATH}/temp/${image}`)

					return new Response('Invalid image name', { status: 400 })
				}

				const PATH = `${Bun.env.FILES_PATH}/temp/${decodedImage}`
				const imageBuffer = await sharp(PATH).toBuffer()

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
			}),
		},
	)
	.post(
		'/:image',
		async ({ params: { image }, body: { name }, error }) => {
			try {
				// Approve the image by moving it to the '/uploads' folder
				let decodedImage: string

				try {
					decodedImage = decodeURIComponent(image)
				} catch (uriError) {
					console.error('Failed to decode URI:', uriError, image)
					return new Response('Invalid image name', { status: 400 })
				}

				const PATH = `${Bun.env.FILES_PATH}/temp/${decodedImage}`
				const file = Bun.file(PATH)

				// Remove the current file if there is a file with the same name
				await unlink(`${Bun.env.FILES_PATH}/${name}.webp`)

				// Move the file to the '/uploads' folder
				await Bun.write(`${Bun.env.FILES_PATH}/${name}.webp`, file)

				// Remove the original file
				await unlink(PATH)

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
				// Approve the image by moving it to the '/uploads' folder
				let decodedImage: string

				try {
					decodedImage = decodeURIComponent(image)
				} catch (uriError) {
					console.error('Failed to decode URI:', uriError, image)
					return new Response('Invalid image name', { status: 400 })
				}

				const PATH = `${Bun.env.FILES_PATH}/temp/${decodedImage}`
				console.log({ PATH })
				await unlink(PATH)

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
	.get(
		'/pending',
		async ({ error }) => {
			try {
				// Get all the pending images from '/uploads/temp'
				const glob = new Glob(`${Bun.env.FILES_PATH}/temp/*.webp`)
				const files: { timestamp: number; name: string; fileName: string; fileNameWithoutLeading: string }[] = []

				for await (const file of glob.scan('.')) {
					const [timeStr, name] = file.split(IMAGE_SPLITER)
					if (!timeStr || !name) continue

					// Get only the timestamp from the string (uploads/temp/1730563395222)
					const timestamp = Number.parseInt(timeStr.split('/').pop() || '0')

					/* {
					[0]   timeStr: "/apps/backend/uploads/temp/1730661050955",
					[0]   name: "asdasd.webp",
					[0]   timestamp: NaN,
					[0]   newName: "asdasd",
					[0]   fileName: "/apps/backend/uploads/temp/1730661050955-----asdasd.webp",
					[0] } */

					const newName = name.replace('.webp', '')
					const fileName = file.split('/').pop() || ''
					const fileNameWithoutLeading = fileName.replace(Bun.env.FILES_PATH as string, '')

					console.log({
						timeStr,
						name,
						timestamp,
						newName: name.replace('.webp', ''),
						fileName,
						fileNameWithoutLeading,
					})

					files.push({ timestamp, name: newName, fileName, fileNameWithoutLeading })
				}

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

export default AdminRoutes
