import type { Elysia } from 'elysia'
import jwtSetup from '../utils/lib/jwt'

export const isAdmin = (app: Elysia) =>
	app.use(jwtSetup).derive(async ({ jwt, cookie: { auth }, error }) => {
		try {
			const isLoggedIn = await jwt.verify(auth.value)
			if (!isLoggedIn) {
				return error(401, 'Unauthorized')
			}

			const { username, password } = isLoggedIn

			const envUsername = process.env.ADMIN_USERNAME
			const envPassword = process.env.ADMIN_PASSWORD

			if (username !== envUsername || password !== envPassword) {
				auth.set({ value: '', expires: new Date(0) })
				return error(401, 'Unauthorized')
			}

			return { jwt }
		} catch (e) {
			return error(401, 'Unauthorized')
		}
	})

export default isAdmin
