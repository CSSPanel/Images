import { api } from 'backend-api'

if (!process.env.API) throw new Error('API domain is not defined')
const eden = api(process.env.API)

export default eden
