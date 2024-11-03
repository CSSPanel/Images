import { jwt } from '@elysiajs/jwt'

const jwtSetup = jwt({
	name: 'jwt',
	secret: Bun.env.SECRET || 'abcd',
})

export default jwtSetup
