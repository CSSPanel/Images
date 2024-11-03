import type { App } from '../../apps/backend'
import { treaty, edenFetch } from '@elysiajs/eden'

export const api = (url: string) =>
	treaty<App>(url, {
		fetch: {
			credentials: 'include',
		},
	})

export const fetch = (url: string) => edenFetch<App>(url, { credentials: 'include' })
