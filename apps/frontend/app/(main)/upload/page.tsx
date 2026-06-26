'use client'

import Dropzone, { type IFile } from '../../UI/Dropzone'
import { ActionIcon, Alert, Button, Tooltip, type DefaultMantineColor } from '@mantine/core'
import { AiOutlineSetting } from 'react-icons/ai'
import { BsArrowLeft, BsInfoCircle } from 'react-icons/bs'
import { toBase64 } from '@/utils/base64'
import { useState, type ReactNode } from 'react'
import UploadedFile from '../../UI/UploadedFile'
import eden from '@/utils/eden'
import Link from 'next/link'

const Upload = () => {
	const [uploadedFiles, setUploadedFiles] = useState<IFile[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const [showAlert, setShowAlert] = useState<{
		message: ReactNode
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
			const { data, error } = await eden.upload.index.post({
				files: filesToUpload,
			})

			if (error) {
				return setShowAlert({ message: error.value, type: 'red' })
			}

			setUploadedFiles([])

			const pending = data?.filter(r => r.status === 'pending') ?? []
			const skipped = data?.filter(r => r.status === 'skipped') ?? []
			const rejected = data?.filter(r => r.status === 'rejected') ?? []

			// Group rejections by reason so identical messages collapse into a single
			// line with a count instead of repeating once per file.
			const rejectedByReason = new Map<string, number>()
			for (const r of rejected) {
				const reason = r.reason ?? 'Rejected'
				rejectedByReason.set(reason, (rejectedByReason.get(reason) ?? 0) + 1)
			}

			const lines: { key: string; text: string }[] = []
			if (pending.length) lines.push({ key: 'pending', text: `✓ ${pending.length} submitted for review` })
			if (skipped.length) lines.push({ key: 'skipped', text: `↷ ${skipped.length} skipped (already exist)` })
			for (const [reason, count] of rejectedByReason) {
				lines.push({ key: `rejected-${reason}`, text: `✕ ${count} rejected — ${reason}` })
			}

			setShowAlert({
				message: lines.length ? (
					<div className="flex flex-col gap-1">
						{lines.map(line => (
							<span key={line.key}>{line.text}</span>
						))}
					</div>
				) : (
					'Images uploaded, please wait for a confirmation from the admins. Thank you!'
				),
				type: rejected.length && !pending.length ? 'red' : 'green',
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
				<div className="flex flex-col gap-1">
					<span className="font-semibold text-lg">Contribute maps</span>
					<Link
						href="/"
						className="flex items-center gap-1 text-sm text-gray-400 hover:text-white duration-200"
					>
						<BsArrowLeft /> Back to docs
					</Link>
				</div>
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
			<p className="text-sm text-gray-400">
				Drop map images below. Each upload is reviewed by an admin before it becomes available through the public
				API.
			</p>
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

export default Upload
