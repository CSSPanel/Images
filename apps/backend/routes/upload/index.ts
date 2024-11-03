import Elysia, { t } from 'elysia'
import { IMAGE_SPLITER } from '~/utils/constants/Files'
import sharp from 'sharp'

const UploadRoutes = new Elysia({
	detail: {
		tags: ['Upload'],
	},
}).post(
	'/',
	async ({ body, error }) => {
		try {
			// Move the files to the /uploads/temp folder, with this format: "{time}-<filename>.webp"
			const currentTime = Date.now()

			for await (const { file, name } of body.files) {
				const decoded = Buffer.from(file, 'base64')
				const newFile = await sharp(decoded).webp().resize(800).toBuffer()

				await Bun.write(`uploads/temp/${currentTime}${IMAGE_SPLITER}${name}.webp`, newFile)
			}

			return true
		} catch (err) {
			console.error(err)
			return error(500, err instanceof Error ? err.message : 'An error occurred')
		}
	},
	{
		detail: {
			summary: 'Upload files',
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
