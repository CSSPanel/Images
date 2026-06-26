import eden from '@/utils/eden'
import useSWR from 'swr'

/**
 * Check whether the current session is authenticated as the admin.
 * Returns `true` when logged in, `false` when not. While `isLoading` is
 * true the status is still unknown, so callers should wait before redirecting.
 */
const useAuth = () =>
	useSWR('auth-me', async () => {
		const { data, error } = await eden.auth.me.get()
		if (error) return false
		return data ?? false
	})

export default useAuth
