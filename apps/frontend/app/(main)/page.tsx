'use client'

import Dropzone, { type IFile } from '../UI/Dropzone'
import { ActionIcon, Alert, Button, Tooltip, type DefaultMantineColor } from '@mantine/core'
import { AiOutlineSetting } from 'react-icons/ai'
import { BsInfoCircle } from 'react-icons/bs'
import { toBase64 } from '@/utils/base64'
import { useState } from 'react'
import UploadedFile from '../UI/UploadedFile'
import eden from '@/utils/eden'
import Link from 'next/link'

const Home = () => {
	const [uploadedFiles, setUploadedFiles] = useState<IFile[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const [showAlert, setShowAlert] = useState<{
		message: string
		type: DefaultMantineColor
	} | null>(null)

	const handleUploadAll = async () => {
		if (isUploading) return
		setIsUploading(true)

		try {
			// Should be sent as { files: [{ name: string, file: File }] }
			const filesToUpload = await Promise.all(
				uploadedFiles.map(async ({ file, name }) => {
					const base64 = await toBase64(file)

					return {
						file: base64,
						name,
					}
				}),
			)

			// Should be sent as { files: [{ name: string, file: File }] }
			const { error } = await eden.upload.index.post({
				files: filesToUpload,
			})

			if (error) {
				return setShowAlert({ message: error.value, type: 'red' })
			}

			setUploadedFiles([])

			setShowAlert({
				message:
					'Images uploaded successfully, please wait for a confirmation form the admins in order to use the images',
				type: 'green',
			})
		} catch (err) {
			if (err instanceof Error) {
				console.error(err.message)
			}
		}

		setIsUploading(false)
	}

	return (
		<div className="flex flex-col bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-lg p-4 gap-4 w-full my-20">
			<div className="flex flex-row justify-between items-center">
				<span className="font-semibold text-lg">Upload images</span>
				<div className="flex items-center">
					<Tooltip label={<div>Up to {process.env.NEXT_PUBLIC_MAXSIZE || '5MB'}</div>}>
						<ActionIcon variant="transparent" color="pink">
							<BsInfoCircle />
						</ActionIcon>
					</Tooltip>
					<Tooltip label="Admin">
						<Link href="/login" passHref>
							<ActionIcon variant="transparent">
								<AiOutlineSetting />
							</ActionIcon>
						</Link>
					</Tooltip>
				</div>
			</div>
			<Dropzone uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} isUploading={isUploading} />
			{showAlert && (
				<Alert color={showAlert.type} variant="filled">
					{showAlert.message}
				</Alert>
			)}
			{uploadedFiles.length > 0 && (
				<>
					<div className="bg-white/10 rounded-lg h-0.5 w-full" />
					<div className="flex flex-col">
						<span className="font-medium text-sm">Selected Images</span>
						<div className="flex flex-col divide-y-2 divide-white/5">
							{uploadedFiles.map(file => (
								<UploadedFile
									onChangeName={name => {
										const newFiles = uploadedFiles.map(f => {
											if (f.originalName === file.originalName) {
												return { ...f, name }
											}
											return f
										})

										setUploadedFiles(newFiles)
									}}
									key={file.originalName}
									{...file}
								/>
							))}
						</div>
					</div>
				</>
			)}
			<Button disabled={uploadedFiles.length === 0} onClick={handleUploadAll} color="blue" loading={isUploading}>
				Upload
			</Button>
		</div>
	)
}

export default Home
