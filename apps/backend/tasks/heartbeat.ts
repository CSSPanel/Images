import cron, { Patterns } from '@elysiajs/cron'

const heartbeatTask = cron({
	name: 'heartbeat',
	pattern: Patterns.everyMinute(),
	run: async () => {
		console.info('🦊 Heartbeat ❤️')
	},
})

export default heartbeatTask
