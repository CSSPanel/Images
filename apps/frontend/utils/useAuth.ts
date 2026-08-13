import eden from '@/utils/eden'
import useSWR from 'swr'

/**
 * Check whether the current session is authenticated as the admin.
 * Returns `true` when logged in, `false` when not. While `isLoading` is
 * true the status is still unknown, so callers should wait before redirecting.
 *
 * Only a 401 means "not logged in". Anything else — the API restarting, a 502
 * from the proxy, a dropped connection — says nothing about the session, so it
 * is rethrown: SWR then retries and keeps serving the last known answer instead
 * of reporting a logout that never happened. This runs on every window focus,
 * so treating a blip as `false` used to kick the admin out to /login mid-session.
 */
const useAuth = () =>
	useSWR('auth-me', async () => {
		const { data, error } = await eden.auth.me.get()

		if (error) {
			if (error.status === 401 || error.status === 403) return false
			throw error
		}

		return data ?? false
	})

export default useAuth
