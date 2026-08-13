import Elysia, { error, t } from 'elysia'
import { clearAuthCookie, setAuthCookie } from '../../utils/lib/authCookie'
import jtwSetup from '../../utils/lib/jwt'

const AuthRoutes = new Elysia({
	detail: {
		tags: ['Auth'],
	},
})
	.use(jtwSetup)
	.post(
		'/login',
		async ({ body: { username, password }, jwt, cookie: { auth }, request }) => {
			const envUsername = process.env.ADMIN_USERNAME
			const envPassword = process.env.ADMIN_PASSWORD

			if (username !== envUsername || password !== envPassword) return error(401, 'Unauthorized')

			setAuthCookie(auth, request, await jwt.sign({ username, password }))

			return true
		},
		{
			detail: {
				summary: 'Login with username and password',
			},
			body: t.Object({
				username: t.String(),
				password: t.String(),
			}),
		},
	)
	.get(
		'/me',
		async ({ jwt, cookie: { auth }, request }) => {
			const token = auth.value
			if (!token) return error(401, 'Unauthorized')

			const isLoggedIn = await jwt.verify(token)
			if (!isLoggedIn) return error(401, 'Unauthorized')

			const { username, password } = isLoggedIn

			if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
				clearAuthCookie(auth, request)
				return error(401, 'Unauthorized')
			}

			// The frontend polls this on every window focus, so it doubles as the
			// session refresh: an admin who keeps using the panel never ages out.
			setAuthCookie(auth, request, token)

			return true
		},
		{
			detail: {
				summary: 'Check whether the current session is authenticated',
			},
		},
	)

export default AuthRoutes
