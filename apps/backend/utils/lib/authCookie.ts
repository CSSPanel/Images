import type { Cookie } from 'elysia'
import { WEBSITE_URL_WITHOUT_SSL } from '../constants/Domain'

/** How long a session lasts. Refreshed on every successful `/auth/me`. */
export const AUTH_COOKIE_MAX_AGE = 90 * 86400 // seconds

const isProduction = Bun.env.NODE_ENV === 'production'

/**
 * `lax` covers the normal setup, where the frontend and the API share a
 * registrable domain (`upload.example.dev` + `i.example.dev`). Set
 * `COOKIE_SAMESITE=none` when they don't — that also forces `Secure`, so it
 * only works over HTTPS.
 */
const sameSite = ((Bun.env.COOKIE_SAMESITE ?? 'lax').toLowerCase() as 'lax' | 'strict' | 'none') || 'lax'

// Browsers refuse Secure cookies from http:// origins, so a dev backend on
// plain http has to send the cookie without it or the login never sticks.
const secure = isProduction || sameSite === 'none'

const isIpAddress = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')

const hostOf = (request: Request) => {
	const header = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
	const host = header?.split(',')[0]?.trim() || new URL(request.url).hostname

	// Strip the port and normalise — Domain= matching is on hostname alone.
	return host.replace(/:\d+$/, '').replace(/\.$/, '').toLowerCase()
}

/**
 * The parent domain to scope the cookie to, or `undefined` for a host-only
 * cookie on whichever host served the request.
 *
 * A `Set-Cookie` whose `Domain` isn't the sending host or a parent of it is
 * dropped by the browser, and nothing in the response says so — the login just
 * silently doesn't stick and every following request comes back 401. That is
 * what used to happen with `WEBSITE_URL` unset (`Domain=.undefined`), on
 * `localhost` (single-label domains are rejected), and when `WEBSITE_URL`
 * pointed at the frontend subdomain rather than the shared parent.
 *
 * A host-only cookie is enough in all of those cases — the cookie only ever
 * travels back to the API that issued it — so fall back to one instead of
 * emitting a `Domain` the browser will throw away.
 */
const resolveDomain = (request: Request) => {
	const parent = WEBSITE_URL_WITHOUT_SSL
	if (!parent || !parent.includes('.') || isIpAddress(parent)) return undefined

	const host = hostOf(request)
	if (host !== parent && !host.endsWith(`.${parent}`)) return undefined

	return `.${parent}`
}

const options = (request: Request) => ({
	path: '/',
	domain: resolveDomain(request),
	// Nothing in the frontend reads the cookie, and the JWT carries the admin
	// credentials — keep it out of reach of page scripts.
	httpOnly: true,
	secure,
	sameSite,
})

type AuthCookie = Cookie<string | undefined>

/** Issue (or re-issue) the session cookie, sliding its expiry forward. */
export const setAuthCookie = (auth: AuthCookie, request: Request, value: string) =>
	auth.set({
		...options(request),
		value,
		maxAge: AUTH_COOKIE_MAX_AGE,
		expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE * 1000),
	})

/**
 * Expire the session cookie. The attributes have to match the ones it was set
 * with: a cookie is keyed by name *and* domain *and* path, so clearing without
 * them leaves the real cookie in place and the session unkillable.
 */
export const clearAuthCookie = (auth: AuthCookie, request: Request) =>
	auth.set({
		...options(request),
		value: '',
		maxAge: 0,
		expires: new Date(0),
	})
