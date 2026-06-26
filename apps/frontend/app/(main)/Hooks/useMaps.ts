import eden from '@/utils/eden'
import useSWR from 'swr'

/**
 * Get the list of approved maps that are currently served by the API.
 * Used on the landing page for the live counter and URL-builder suggestions.
 */
const useMaps = () =>
	useSWR(
		'maps-list',
		async () => {
			const { data, error } = await eden.maps.index.get()
			if (error) throw error
			return data
		},
		{
			keepPreviousData: true,
		},
	)

export default useMaps
