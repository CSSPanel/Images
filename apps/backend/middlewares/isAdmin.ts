import { Elysia } from 'elysia'
import { clearAuthCookie } from '../utils/lib/authCookie'
import jwtSetup from '../utils/lib/jwt'

/**
 * Gate for the admin routes.
 *
 * Two things here are load-bearing and easy to undo by accident:
 *
 * - `onBeforeHandle`, not `derive`. A `derive` return value is merged into the
 *   context, so returning `error(401)` from one just puts an error object in
 *   scope and lets the handler run anyway. Only a before-handle hook can
 *   short-circuit the request.
 * - `.as('plugin')`. Hooks are local to the instance that declares them by
 *   default, and this instance declares no routes — without propagating them
 *   one level up they never run against the routes that `use()` this plugin,
 *   which leaves every admin route open to the public.
 */
export const isAdmin = new Elysia({ name: 'isAdmin' })
	.use(jwtSetup)
	.onBeforeHandle(async ({ jwt, cookie: { auth }, error, request }) => {
		try {
			const token = auth.value
			if (!token) return error(401, 'Unauthorized')

			const isLoggedIn = await jwt.verify(token)
			if (!isLoggedIn) return error(401, 'Unauthorized')

			const { username, password } = isLoggedIn

			const envUsername = process.env.ADMIN_USERNAME
			const envPassword = process.env.ADMIN_PASSWORD

			if (username !== envUsername || password !== envPassword) {
				clearAuthCookie(auth, request)
				return error(401, 'Unauthorized')
			}
		} catch (e) {
			return error(401, 'Unauthorized')
		}
	})
	.as('plugin')

export default isAdmin
