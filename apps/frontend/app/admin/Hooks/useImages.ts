import eden from '@/utils/eden'
import useSWR from 'swr'

type PendingResponse = NonNullable<Awaited<ReturnType<typeof eden.admin.pending.get>>['data']>

export type PendingImage = PendingResponse[number]

/**
 * Get all the of the pending images
 */
const useImages = () =>
	useSWR(
		'pending-images',
		async () => {
			const { data, error } = await eden.admin.pending.get()
			if (error) throw error
			return data
		},
		{
			keepPreviousData: true,
		},
	)

/**
 * Resolution + size of a pending upload next to the map it would overwrite.
 * `existing` is null when the name is still free.
 */
export const useCompare = (image?: string, name?: string) =>
	useSWR(image && name ? ['pending-compare', image, name] : null, async () => {
		const { data, error } = await eden
			.admin({ image: image as string })
			.compare.get({ query: { name: name as string } })
		if (error) throw error
		return data
	})

/**
 * Approve a pending upload. `replace` is required to overwrite a map that already
 * exists — without it the API answers 409 rather than silently replacing it.
 */
export const handleApproveImage = async (image: string, name: string, replace = false) => {
	const { error } = await eden.admin({ image }).post({ name, replace })
	if (error) throw error
}

/** True for the 409 the API answers when approving would overwrite an existing map. */
export const isConflictError = (err: unknown) => (err as { status?: number } | null)?.status === 409

export const handleDeleteImage = async (image: string) => {
	const { error } = await eden.admin({ image }).delete()
	if (error) throw error
}

export default useImages
