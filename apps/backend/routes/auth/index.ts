import Elysia, { error, t } from 'elysia'
import { WEBSITE_URL_WITHOUT_SSL } from '../../utils/constants/Domain'
import jtwSetup from '../../utils/lib/jwt'

const AuthRoutes = new Elysia({
	detail: {
		tags: ['Auth'],
	},
})
	.use(jtwSetup)
	.post(
		'/login',
		async ({ body: { username, password }, jwt, cookie: { auth } }) => {
			const envUsername = process.env.ADMIN_USERNAME
			const envPassword = process.env.ADMIN_PASSWORD

			if (username !== envUsername || password !== envPassword) return error(401, 'Unauthorized')

			// Generate JWT token
			auth.set({
				value: await jwt.sign({ username, password }),
				path: '/',
				// sameSite: 'none',
				// httpOnly: false,
				// 90 days
				domain: `.${WEBSITE_URL_WITHOUT_SSL}`,
				expires: new Date(Date.now() + 30 * 86400 * 1000),
				maxAge: 90 * 86400,
				secure: true,
			})

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

export default AuthRoutes
