import eden from '@/utils/eden'
import useSWR from 'swr'

/**
 * Get all the of the uploaded images
 */
const useImages = () =>
	useSWR(
		'uploaded-images',
		async () => {
			const { data, error } = await eden.files.index.get()
			if (error) throw error
			return data
		},
		{
			keepPreviousData: true,
		},
	)

export default useImages
