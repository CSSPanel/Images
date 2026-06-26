import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { chalk } from 'logestic'
import { r2 } from '.'

const { R2_BUCKET_NAME, R2_PUBLIC_URL, R2_ACCOUNT_ID } = Bun.env
if (!R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is required')

/** Accept a full https URL or a key; normalize to a key without leading slash. */
const toKey = (keyOrUrl: string): string => {
	if (/^https?:\/\//i.test(keyOrUrl)) {
		const u = new URL(keyOrUrl)
		return decodeURIComponent(u.pathname.replace(/^\/+/, ''))
	}
	return keyOrUrl.replace(/^\/+/, '')
}

/** Unlimited (non-expiring) public URL. Requires that your bucket/object is publicly accessible via R2_PUBLIC_URL. */
export const getPublicUrl = (keyOrUrl: string): string => {
	const key = toKey(keyOrUrl)
	if (R2_PUBLIC_URL) {
		const url = `https://${R2_PUBLIC_URL}/${encodeURI(key)}`
		console.log(`${chalk.cyan('[Cloudflare R2]')} Public URL → ${url}`)
		return url
	}
	// Fallback to API endpoint path. NOTE: This is not public unless your bucket/object policy allows it.
	const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${encodeURI(key)}`
	console.warn(
		`${chalk.yellow('[Cloudflare R2]')} R2_PUBLIC_URL not set. Returning API endpoint URL (may not be publicly accessible): ${url}`,
	)
	return url
}

type SignedOpts = {
	/** Expiry in seconds (default 900 = 15min). Max 7 days (604800). */
	expiresIn?: number
	/** Force "Save as…" download name. If omitted and asAttachment=true, uses the key’s basename. */
	filename?: string
	/** If true, add content-disposition=attachment; filename=... */
	asAttachment?: boolean
	/** Hint a content-type override on the response (optional). */
	contentType?: string
	/** Set ResponseCacheControl (optional). */
	cacheControl?: string
}

/** Temporary signed download URL (works even for private objects). */
export const getSignedDownloadUrl = async (keyOrUrl: string, opts: SignedOpts = {}): Promise<string> => {
	const Key = toKey(keyOrUrl)

	const MAX = 7 * 24 * 3600 // AWS v4 signing hard limit
	const expiresIn = Math.min(Math.max(opts.expiresIn ?? 900, 1), MAX)

	// Build response header overrides
	let ResponseContentDisposition: string | undefined
	if (opts.asAttachment) {
		const base = opts.filename ?? Key.split('/').pop() ?? 'download'
		ResponseContentDisposition = `attachment; filename="${base}"`
	}

	const cmd = new GetObjectCommand({
		Bucket: R2_BUCKET_NAME!,
		Key,
		ResponseContentDisposition,
		ResponseContentType: opts.contentType,
		ResponseCacheControl: opts.cacheControl,
	})

	const url = await getSignedUrl(r2, cmd, { expiresIn })
	console.log(`${chalk.cyan('[Cloudflare R2]')} Signed URL → key="${Key}", expiresIn=${expiresIn}s`)
	return url
}

/** Batch helper for many keys (returns in same order). */
export const getSignedDownloadUrls = async (keysOrUrls: string[], opts: SignedOpts = {}): Promise<string[]> => {
	return Promise.all(keysOrUrls.map(k => getSignedDownloadUrl(k, opts)))
}

/**
import { getPublicUrl, getSignedDownloadUrl } from './r2-links'

// Unlimited (public) link
const url = getPublicUrl('backups/2025-08-15/site.tar.gz')

// 15-min signed link (default)
const signed = await getSignedDownloadUrl('private/report.pdf')

// 2-hour signed link forcing download with a nice filename
const dl = await getSignedDownloadUrl('invoices/12345.pdf', {
  expiresIn: 2 * 3600,
  asAttachment: true,
  filename: 'invoice-12345.pdf',
})
*/
