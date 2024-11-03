import { Lato } from 'next/font/google'
import { MantineProvider, DirectionProvider } from '@mantine/core'

import './globals.scss'
import '@kirklin/reset-css/kirklin.css'
import '@mantine/core/styles.css'

const lato = Lato({ subsets: ['latin'], weight: ['100', '300', '400', '700', '900'] })

export const metadata = {
	title: process.env.WEBSITE_NAME || 'Image uploads',
	description: 'Upload images to the server',
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en" dir="ltr">
			<body className={`${lato.className} bg-slate-900`}>
				<DirectionProvider initialDirection="ltr">
					<MantineProvider defaultColorScheme="dark">
						<div className="min-h-screen flex flex-col justify-center items-center">
							<main className="container">
								<div className="absolute left-52 top-4 h-4/5 w-4/5 blur-[120px] opacity-[0.30] bg-gradient-to-r rounded-full from-indigo-500 to-pink-500 -z-10" />
								{children}
							</main>
						</div>
					</MantineProvider>
				</DirectionProvider>
			</body>
		</html>
	)
}

export default RootLayout
