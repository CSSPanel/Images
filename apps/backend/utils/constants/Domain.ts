/**
 * `WEBSITE_URL` reduced to a bare hostname: no scheme, no port, no path.
 *
 * `WEBSITE_URL` is written by hand and comes in every shape — `csspanel.dev`,
 * `https://csspanel.dev`, `localhost:3000` — so normalise it once here instead
 * of at each call site.
 */
export const WEBSITE_URL_WITHOUT_SSL =
	Bun.env.WEBSITE_URL?.trim()
		.replace(/^[a-z]+:\/\//i, '')
		.replace(/[/?#].*$/, '')
		.replace(/:\d+$/, '')
		.replace(/\.$/, '')
		.toLowerCase() || undefined
