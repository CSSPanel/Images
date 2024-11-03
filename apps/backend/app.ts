import { Elysia, redirect } from 'elysia'
import { Logestic } from 'logestic'
import compression from 'elysia-compress'
import jtwSetup from './utils/lib/jwt'
import swagger from './utils/swagger'
import cors from '@elysiajs/cors'

import routes from './routes'

// Tasks
import heartbeatTask from './tasks/heartbeat'

// App
const app = new Elysia()
	.use(Logestic.preset('fancy'))
	.use(swagger)
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
	.get('/', () => redirect('/docs'))
	.listen(Bun.env.PORT || 6000, () => {
		console.log(`🦊 Server is running on port ${Bun.env.PORT || 6000}`)
	})

if (Bun.env.NODE_ENV === 'production') {
	// Tasks
	app.use(heartbeatTask)
}

export type App = typeof app
