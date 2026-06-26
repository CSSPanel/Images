import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { chalk } from 'logestic'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = Bun.env
const { R2_PUBLIC_URL } = Bun.env

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
	throw new Error('R2 credentials are required')
}

export const r2 = new S3Client({
	region: 'auto',
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
})

export const uploadFile = async (file: File, key: string, metadata = {}) => {
	const { type, name } = file

	// Extension
	const ext = name.split('.').pop()

	const buffer = Buffer.from(await file.arrayBuffer())
	if (!buffer) {
		throw new Error('Failed to convert file to buffer')
	}

	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: `${key}.${ext}`,
		Body: buffer,
		ContentType: type,
		Metadata: metadata,
	})

	await r2.send(command)

	return `https://${R2_PUBLIC_URL}/${key}.${ext}`
}

/**
 * Upload a raw buffer to an explicit key (the key must already include any extension, e.g. "de_dust2.webp").
 * Unlike `uploadFile`, this does not derive/append an extension from a filename.
 */
export const uploadBuffer = async (
	buffer: Buffer,
	key: string,
	contentType = 'image/webp',
	metadata: Record<string, string> = {},
) => {
	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: contentType,
		Metadata: metadata,
	})

	await r2.send(command)

	return `https://${R2_PUBLIC_URL}/${encodeURI(key)}`
}

// Check if the bucket exists
console.log(`${chalk.redBright('[Cloudflare R2]')} Connected`)
