import { CopyObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { r2 } from '.'

const { R2_BUCKET_NAME } = Bun.env
if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is required')

// Accept a full https URL or a raw key; normalize to a key without a leading slash.
const toKey = (keyOrUrl: string): string => {
	if (/^https?:\/\//i.test(keyOrUrl)) {
		const u = new URL(keyOrUrl)
		return decodeURIComponent(u.pathname.replace(/^\/+/, ''))
	}
	return keyOrUrl.replace(/^\/+/, '')
}

const isNotFound = (err: unknown): boolean => {
	const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
	return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404
}

export type R2Object = {
	body: Buffer
	etag?: string
	contentType?: string
}

/** Fetch an object's bytes. Returns null if the object does not exist. */
export const getObjectBuffer = async (keyOrUrl: string): Promise<R2Object | null> => {
	const Key = toKey(keyOrUrl)
	try {
		const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME!, Key }))
		if (!res.Body) return null

		const bytes = await res.Body.transformToByteArray()
		return {
			body: Buffer.from(bytes),
			etag: res.ETag?.replace(/"/g, ''),
			contentType: res.ContentType,
		}
	} catch (err) {
		if (isNotFound(err)) return null
		throw err
	}
}

/** True if an object exists (HeadObject). */
export const objectExists = async (keyOrUrl: string): Promise<boolean> => {
	const Key = toKey(keyOrUrl)
	try {
		await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME!, Key }))
		return true
	} catch (err) {
		if (isNotFound(err)) return false
		throw err
	}
}

export type R2ListItem = {
	key: string
	/** Basename of the key (last path segment). */
	name: string
	lastModified?: Date
	size?: number
}

/**
 * List objects under a prefix (paginated).
 * Pass `delimiter: '/'` with an empty prefix to list only root-level objects
 * (folders like `pending/` are then excluded).
 */
export const listKeys = async (prefix: string, opts: { delimiter?: string } = {}): Promise<R2ListItem[]> => {
	const Prefix = prefix.replace(/^\/+/, '')
	const items: R2ListItem[] = []
	let ContinuationToken: string | undefined

	do {
		const res = await r2.send(
			new ListObjectsV2Command({
				Bucket: R2_BUCKET_NAME!,
				Prefix,
				Delimiter: opts.delimiter,
				ContinuationToken,
			}),
		)

		for (const obj of res.Contents ?? []) {
			if (!obj.Key) continue
			items.push({
				key: obj.Key,
				name: obj.Key.split('/').pop() || obj.Key,
				lastModified: obj.LastModified,
				size: obj.Size,
			})
		}

		ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
	} while (ContinuationToken)

	return items
}

/** Server-side copy within the same bucket (no download/re-upload). */
export const copyObject = async (srcKey: string, destKey: string): Promise<void> => {
	const Source = toKey(srcKey)
	const Key = toKey(destKey)
	await r2.send(
		new CopyObjectCommand({
			Bucket: R2_BUCKET_NAME!,
			CopySource: `${R2_BUCKET_NAME}/${encodeURIComponent(Source).replace(/%2F/g, '/')}`,
			Key,
		}),
	)
}
