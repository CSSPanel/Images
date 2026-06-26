import { Elysia, redirect } from 'elysia'
import { Logestic } from 'logestic'
import compression from 'elysia-compress'
import jtwSetup from './utils/lib/jwt'
// import swagger from './utils/swagger'
import cors from '@elysiajs/cors'

import routes from './routes'

// Tasks
import heartbeatTask from './tasks/heartbeat'

// App
const app = new Elysia({
	// Coarse guard against oversized upload requests (per-file limits are enforced
	// in the upload route). Base64 inflates payloads by ~33%.
	serve: { maxRequestBodySize: 80 * 1024 * 1024 },
})
	.use(Logestic.preset('fancy'))
	// .use(swagger)
	.use(compression())
	.use(
		cors({
			origin: true,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}),
	)
	.use(jtwSetup)
	.use(routes)
	// .get('/', () => redirect('/docs'))
	.get('/', () => redirect(Bun.env.WEBSITE_URL || 'http://localhost:3000'))
	.listen(Bun.env.API_PORT || 6000, () => {
		console.log(`🦊 Server is running on port ${Bun.env.API_PORT || 6000}`)
	})

if (Bun.env.NODE_ENV === 'production') {
	// Tasks
	app.use(heartbeatTask)
}

export type App = typeof app
