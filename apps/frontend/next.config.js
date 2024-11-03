/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
	},
	env: {
		API: process.env.API,
	},
}

module.exports = nextConfig
