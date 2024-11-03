'use client'

import useImages from './Hooks/useImages'
import Link from 'next/link'

const Uploads = () => {
	const { data, isLoading } = useImages()

	return (
		<div className="flex flex-col bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-lg p-4 gap-4 w-full my-20">
			<div className="grid grid-cols-4 gap-4 items-center">
				{isLoading || !data ? 'Loading...' : data.map(image => <Image key={image.name} {...image} />)}
			</div>
		</div>
	)
}

const Image = ({
	fileName,
}: {
	fileName: string
}) => {
	const path = `${process.env.API}/files/400/${fileName}`

	return (
		<div className="flex flex-col gap-2">
			<Link href={path} target="_blank" passHref>
				<img src={path} alt={fileName} width={256} height={128} className="object-cover w-64 h-32" />
			</Link>
			<p>{fileName.slice(0, 20)}</p>
		</div>
	)
}

export default Uploads
