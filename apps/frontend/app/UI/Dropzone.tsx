'use client'

import { readImageSize } from '@/utils/imageSize'
import { Loader } from '@mantine/core'
import bytes from 'bytes'
import { useState } from 'react'
import { type FileRejection, useDropzone } from 'react-dropzone'
import { AiOutlineCloudUpload } from 'react-icons/ai'

const Dropzone = ({ uploadedFiles, setUploadedFiles, isUploading, progress }: Props) => {
	const [error, setError] = useState<string | null>(null)

	const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
		accept: { 'image/*': [] },
		// No file-count limit (react-dropzone treats the absent option as unlimited).
		maxSize: bytes(process.env.NEXT_PUBLIC_MAXSIZE || '5MB'),
		disabled: isUploading,
		async onDrop(acceptedFiles: File[], fileRejections: FileRejection[]) {
			if (acceptedFiles.length === 0) {
				// Surface the real reason instead of a generic message.
				const firstReason = fileRejections[0]?.errors[0]?.message
				return setError(firstReason || 'No files were uploaded')
			}

			setError(null)

			const newFiles = await Promise.all(
				acceptedFiles
					.filter(file => {
						// Check for duplicates
						const duplicate = uploadedFiles.find(f => f.name === file.name)
						return !duplicate
					})
					.map(async file => {
						const nameWithoutExt = file.name.split('.').slice(0, -1).join('.')
						// Measured up front so the page can compare it against the stored map.
						const size = await readImageSize(file)

						return {
							name: nameWithoutExt,
							originalName: file.name,
							file,
							width: size?.width,
							height: size?.height,
						}
					}),
			)

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
					<p className="text-base font-medium">
						{progress ? `Uploading ${progress.done} of ${progress.total}...` : 'Uploading files...'}
					</p>
					<p className="text-sm">Please wait...</p>
				</>
			) : (
				<>
					<AiOutlineCloudUpload size="35" className="mb-2" />
					<p className="text-base font-medium">{uploadedFiles.length > 0 ? 'Upload more files' : 'Upload files'}</p>
					<p className="text-sm">
						{uploadedFiles.length > 0 ? 'Drop as many as you like' : 'Drag and drop files here'}
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
	/** Files sent so far — a large selection is uploaded in several requests. */
	progress?: { done: number; total: number } | null
}

export interface IFile {
	name: string
	originalName: string
	file: File
	/** Pixel dimensions of the local file; absent when the browser couldn't decode it. */
	width?: number
	height?: number
}

export default Dropzone
