import chalk from 'chalk'

export const log = async (message?: unknown, ...optionalParams: unknown[]) => {
	console.log(chalk.cyanBright('[LOG] ') + message, ...optionalParams)
}

// biome-ignore lint/suspicious/noExplicitAny:
export const logDebug = async (message?: any, ...optionalParams: any[]) => {
	const shouldDebug = Bun.env.DEBUG_MODE === 'true'
	if (!shouldDebug) return

	console.debug(`${chalk.bgYellowBright('[DEBUG]')} ${message}`, ...optionalParams)
}

export const logError = async (message?: unknown, ...optionalParams: unknown[]) => {
	console.error(`${chalk.bgRedBright('[ERROR]')} ${message}`, ...optionalParams)
}

// biome-ignore lint/suspicious/noExplicitAny:
export const warn = async (message?: any, ...optionalParams: any[]) => {
	console.warn(`${chalk.bgYellowBright('[WARN]')} ${message}`, ...optionalParams)
}
