import swagger from '@elysiajs/swagger'

export default swagger({
	path: '/docs',
	documentation: {
		info: {
			title: Bun.env.NAME || 'Elysia',
			version: Bun.env.VERSION || '1.0.0',
		},
	},
})
