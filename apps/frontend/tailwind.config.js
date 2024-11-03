/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
			},
		},
	},
	corePlugins: { preflight: false, container: false },
	plugins: [
		({ addComponents }) => {
			addComponents({
				'.container': {
					// 'maxWidth': '100%',
					// 'minWidth': '100%',
					'paddingLeft': '1rem',
					'paddingRight': '1rem',
					'@screen sm': {
						width: '600px',
					},
					'@screen md': {
						width: '600px',
					},
					'@screen lg': {
						width: '700px',
					},
					'@screen xl': {
						width: '950px',
					},
				},
			})
		},
	],
}
