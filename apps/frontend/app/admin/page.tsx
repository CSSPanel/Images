'use client'

import { Button, TextInput } from '@mantine/core'
import { useState } from 'react'
import { mutate } from 'swr'
import useImages, { handleApproveImage, handleDeleteImage } from './Hooks/useImages'
import Link from 'next/link'

const AdminPage = () => {
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
	name: oldName,
}: {
	timestamp: number
	name: string
	fileName: string
}) => {
	const path = `${process.env.API}/admin/${fileName}`
	const [isApproving, setIsApproving] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [name, setName] = useState(oldName)

	return (
		<div className="flex flex-col gap-2">
			<Link href={path} target="_blank" passHref>
				<img src={path} alt={name} width={256} height={128} className="object-cover w-64 h-32" />
			</Link>

			{isApproving ? (
				<TextInput
					placeholder="New name"
					size="compact-xs"
					onChange={e => setName(e.currentTarget.value)}
					value={name}
					autoFocus
				/>
			) : (
				<p>{name.slice(0, 20)}</p>
			)}
			<Button
				size="compact-xs"
				loading={isLoading}
				onClick={() => {
					if (!isApproving) return setIsApproving(true)
					setIsLoading(true)
					handleApproveImage(fileName, name)
						.then(() => {
							mutate('pending-images')
							setIsApproving(false)
							setIsLoading(false)
						})
						.catch(() => setIsLoading(false))
				}}
			>
				Approve
			</Button>
			<Button
				size="compact-xs"
				loading={isLoading}
				color="red"
				onClick={() => {
					setIsLoading(true)
					handleDeleteImage(name)
						.then(() => {
							mutate('pending-images')
							setIsApproving(false)
							setIsLoading(false)
						})
						.catch(() => setIsLoading(false))
				}}
			>
				Delete
			</Button>
		</div>
	)
}

export default AdminPage
