'use client'

import { AiOutlineCloudUpload } from 'react-icons/ai'
import { useDropzone } from 'react-dropzone'
import { Loader } from '@mantine/core'
import { useState } from 'react'
import bytes from 'bytes'

const Dropzone = ({ uploadedFiles, setUploadedFiles, isUploading }: Props) => {
	const [error, setError] = useState<string | null>(null)

	const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
		accept: { 'image/*': [] },
		maxFiles: 10,
		maxSize: bytes(process.env.NEXT_PUBLIC_MAXSIZE || '5MB'),
		disabled: isUploading,
		async onDrop(acceptedFiles: File[]) {
			if (acceptedFiles.length === 0) return setError('No files were uploaded')
			console.log({ acceptedFiles })

			const newFiles = [
				...acceptedFiles.filter(file => {
					// Check for duplicates
					const duplicate = uploadedFiles.find(f => f.name === file.name)
					return !duplicate
				}),
			].map(file => {
				const nameWithoutExt = file.name.split('.').slice(0, -1).join('.')

				return {
					name: nameWithoutExt,
					originalName: file.name,
					file,
					progress: 0,
				}
			})

			setUploadedFiles(prev => [...prev, ...newFiles])
		},
	})

	return (
		<div
			className={`p-10 px-28 h-44 justify-center rounded-lg border-2 flex flex-col items-center duration-200 ${
				isDragReject || error ? 'border-red-500 !bg-red-500/20' : ''
			} ${
				isDragAccept ? 'text-blue-600 border-blue-500 !bg-blue-500/10' : 'border-dashed border-gray-400 bg-gray-400/10'
			} text-center cursor-pointer`}
			{...getRootProps({ isfocused: isFocused, isdragaccept: isDragAccept, isdragreject: isDragReject })}
		>
			<input {...getInputProps()} />
			{error ? (
				<>{error}</>
			) : isUploading ? (
				<>
					<Loader size={30} className="mb-2" />
					<p className="text-base font-medium">Uplaoding files...</p>
					<p className="text-sm">Please wait...</p>
				</>
			) : (
				<>
					<AiOutlineCloudUpload size="35" className="mb-2" />
					<p className="text-base font-medium">{uploadedFiles.length > 0 ? 'Upload more files' : 'Upload files'}</p>
					<p className="text-sm">
						{uploadedFiles.length > 0 ? 'You can upload up to 10 files' : 'Drag and drop files here'}
					</p>
				</>
			)}
		</div>
	)
}

interface Props {
	uploadedFiles: IFile[]
	setUploadedFiles: React.Dispatch<React.SetStateAction<IFile[]>>
	isUploading: boolean
}

export interface IFile {
	name: string
	originalName: string
	file: File
}

export default Dropzone
