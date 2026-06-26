import { DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { chalk } from 'logestic'
import { r2 } from '.'

const { R2_BUCKET_NAME } = Bun.env

// Normalize input: accept either a full https URL or a raw key.
// Strips leading slashes and decodes URL-encoded paths.
const toKey = (keyOrUrl: string): string => {
	if (/^https?:\/\//i.test(keyOrUrl)) {
		const u = new URL(keyOrUrl)
		return decodeURIComponent(u.pathname.replace(/^\/+/, ''))
	}
	return keyOrUrl.replace(/^\/+/, '')
}

/** Delete a single object (idempotent — succeeds even if it doesn't exist). */
export const DeleteR2File = async (keyOrUrl: string) => {
	const Key = toKey(keyOrUrl)
	console.log(`${chalk.yellow('[Cloudflare R2]')} Deleting: ${Key}`)
	await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME!, Key }))
	console.log(`${chalk.green('[Cloudflare R2]')} Deleted: ${Key}`)
}

/** Delete many objects (keys or URLs). Chunks to S3 limit of 1000 per request. */
export const DeleteManyR2Files = async (keysOrUrls: string[]) => {
	const all = keysOrUrls.map(toKey)
	let total = 0

	for (let i = 0; i < all.length; i += 1000) {
		const chunk = all.slice(i, i + 1000).map(Key => ({ Key }))
		console.log(`${chalk.yellow('[Cloudflare R2]')} Deleting batch of ${chunk.length}`)
		await r2.send(
			new DeleteObjectsCommand({
				Bucket: R2_BUCKET_NAME!,
				Delete: { Objects: chunk, Quiet: true },
			}),
		)
		total += chunk.length
	}

	console.log(`${chalk.green('[Cloudflare R2]')} Deleted ${total} objects total`)
	return total
}

/** Delete everything under a prefix (folder-like). */
export const DeleteR2FilesByPrefix = async (prefix: string) => {
	const Prefix = prefix.replace(/^\/+/, '')
	let ContinuationToken: string | undefined
	let total = 0

	do {
		const listed = await r2.send(
			new ListObjectsV2Command({
				Bucket: R2_BUCKET_NAME!,
				Prefix,
				ContinuationToken,
			}),
		)

		const keys = (listed.Contents ?? []).map(o => ({ Key: o.Key! }))
		if (keys.length) {
			console.log(`${chalk.yellow('[Cloudflare R2]')} Deleting ${keys.length} under ${Prefix}`)
			await r2.send(
				new DeleteObjectsCommand({
					Bucket: R2_BUCKET_NAME!,
					Delete: { Objects: keys, Quiet: true },
				}),
			)
			total += keys.length
		}

		ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
	} while (ContinuationToken)

	console.log(`${chalk.green('[Cloudflare R2]')} Deleted ${total} objects under ${Prefix}`)
	return total
}
