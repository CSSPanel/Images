import Elysia from 'elysia'

// Routes
import AuthRoutes from './auth'
import UploadRoutes from './upload'
import AdminRoutes from './admin'
import MapsRoutes from './maps'

const routes = new Elysia()
	.group('/auth', app => app.use(AuthRoutes))
	.group('/upload', app => app.use(UploadRoutes))
	.group('/admin', app => app.use(AdminRoutes))
	.group('/maps', app => app.use(MapsRoutes))

export default routes
