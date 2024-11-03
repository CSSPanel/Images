import Elysia from 'elysia'

// Routes
import AuthRoutes from './auth'
import UploadRoutes from './upload'
import AdminRoutes from './admin'
import FilesRoutes from './files'

const routes = new Elysia()
	.group('/auth', app => app.use(AuthRoutes))
	.group('/upload', app => app.use(UploadRoutes))
	.group('/admin', app => app.use(AdminRoutes))
	.group('/files', app => app.use(FilesRoutes))

export default routes
