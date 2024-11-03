import eden from '@/utils/eden'
import useSWR from 'swr'

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

export const handleApproveImage = async (image: string, name: string) => {
	const { error } = await eden.admin({ image }).post({ name })
	if (error) throw error
}

export const handleDeleteImage = async (image: string, name: string) => {
	const { error } = await eden.admin({ image }).delete({ name })
	if (error) throw error
}

export default useImages
