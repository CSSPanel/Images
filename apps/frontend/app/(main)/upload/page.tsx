'use client'

import { toBase64 } from '@/utils/base64'
import eden from '@/utils/eden'
import { normalizeMapName } from '@/utils/mapName'
import { ActionIcon, Alert, Button, type DefaultMantineColor, Tooltip } from '@mantine/core'
import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import { AiOutlineSetting } from 'react-icons/ai'
import { BsArrowLeft, BsInfoCircle } from 'react-icons/bs'
import Dropzone, { type IFile } from '../../UI/Dropzone'
import UploadedFile from '../../UI/UploadedFile'
import useNameCheck from './Hooks/useNameCheck'

/** The array the upload endpoint accepts, and the file each entry came from. */
type Entry = { source: IFile; body: { file: string; name: string; replace: boolean } }
type UploadResults = NonNullable<Awaited<ReturnType<typeof eden.upload.index.post>>['data']>

/**
 * Base64 payload budget for a single request. Files are sent as base64 inside one JSON body,
 * so a large selection has to be split across several requests: a proxy in front of the API
 * will reject an oversized body (Cloudflare answers 413 past 100MB) before any per-file check
 * gets to run. Keeping requests small also means a failure costs one chunk, not the whole
 * selection.
 */
const BATCH_BASE64_BUDGET = 8 * 1024 * 1024

/**
 * Group entries into requests that stay under the budget. A single file larger than the
 * budget still goes out — alone in its own request — because rejecting it is the server's
 * call to make, per file, not something to silently drop here.
 */
const batchEntries = (entries: Entry[]): Entry[][] => {
	const batches: Entry[][] = []
	let current: Entry[] = []
	let size = 0

	for (const entry of entries) {
		const entrySize = entry.body.file.length

		if (current.length > 0 && size + entrySize > BATCH_BASE64_BUDGET) {
			batches.push(current)
			current = []
			size = 0
		}

		current.push(entry)
		size += entrySize
	}

	if (current.length > 0) batches.push(current)

	return batches
}

const Upload = () => {
	const [uploadedFiles, setUploadedFiles] = useState<IFile[]>([])
	const [isUploading, setIsUploading] = useState(false)
	// Files sent so far, across all requests of the current upload.
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
	const [showAlert, setShowAlert] = useState<{
		message: ReactNode
		type: DefaultMantineColor
	} | null>(null)

	// Which of the selected names are already taken, and by what.
	const { checks } = useNameCheck(uploadedFiles)
	// Explicit "replace" answers, keyed by file. Absent = the default for that conflict.
	const [replaceChoices, setReplaceChoices] = useState<Record<string, boolean>>({})

	const checkOf = (file: IFile) => checks.get(normalizeMapName(file.name))

	/**
	 * A clearly better image replaces the old one without asking — that's the whole point
	 * of uploading it. Anything else (same/lower resolution, or a name already in the
	 * queue) is opt-in.
	 */
	const wantsReplace = (file: IFile) => {
		const check = checkOf(file)
		if (!check || check.state === 'free') return false

		return replaceChoices[file.originalName] ?? (check.state === 'approved' && check.resolution === 'higher')
	}

	const conflicts = uploadedFiles.filter(file => {
		const check = checkOf(file)
		return !!check && check.state !== 'free'
	})
	const replacing = conflicts.filter(wantsReplace).length

	const handleUploadAll = async () => {
		if (isUploading) return
		setIsUploading(true)

		try {
			// Should be sent as { files: [{ name: string, file: File, replace: boolean }] }
			const entries: Entry[] = await Promise.all(
				uploadedFiles.map(async source => ({
					source,
					body: {
						file: await toBase64(source.file),
						name: source.name,
						replace: wantsReplace(source),
					},
				})),
			)

			const batches = batchEntries(entries)
			setProgress({ done: 0, total: entries.length })

			const results: UploadResults = []
			// Files whose request never landed (network, proxy body limit, server error).
			// They stay selected so the upload can be retried without re-picking them.
			const failedByReason = new Map<string, number>()
			const failedFiles = new Set<string>()

			for (const batch of batches) {
				const { data, error } = await eden.upload.index.post({ files: batch.map(entry => entry.body) })

				if (error) {
					const reason =
						typeof error.value === 'string' && error.value ? error.value : `Upload failed (${error.status})`
					failedByReason.set(reason, (failedByReason.get(reason) ?? 0) + batch.length)
					for (const entry of batch) failedFiles.add(entry.source.originalName)
				} else if (data) {
					results.push(...data)
				}

				setProgress(prev => ({ done: (prev?.done ?? 0) + batch.length, total: entries.length }))
			}

			// Keep whatever failed on screen; clear the rest.
			setUploadedFiles(prev => prev.filter(file => failedFiles.has(file.originalName)))
			if (failedFiles.size === 0) setReplaceChoices({})

			const pending = results.filter(r => r.status === 'pending')
			const exists = results.filter(r => r.status === 'exists')
			const rejected = results.filter(r => r.status === 'rejected')
			const replacements = pending.filter(r => r.replaces).length

			// Group rejections by reason so identical messages collapse into a single
			// line with a count instead of repeating once per file.
			const rejectedByReason = new Map<string, number>()
			for (const r of rejected) {
				const reason = r.reason ?? 'Rejected'
				rejectedByReason.set(reason, (rejectedByReason.get(reason) ?? 0) + 1)
			}

			const lines: { key: string; text: string }[] = []
			if (pending.length)
				lines.push({
					key: 'pending',
					text: `✓ ${pending.length} submitted for review${
						replacements ? ` (${replacements} as ${replacements === 1 ? 'a replacement' : 'replacements'})` : ''
					}`,
				})
			if (exists.length) lines.push({ key: 'exists', text: `↷ ${exists.length} skipped (already exist)` })
			for (const [reason, count] of Array.from(rejectedByReason)) {
				lines.push({ key: `rejected-${reason}`, text: `✕ ${count} rejected — ${reason}` })
			}
			for (const [reason, count] of Array.from(failedByReason)) {
				lines.push({
					key: `failed-${reason}`,
					text: `⚠ ${count} didn't go through — ${reason}. Still selected, try again.`,
				})
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
				type: (rejected.length || failedFiles.size) && !pending.length ? 'red' : 'green',
			})
		} catch (err) {
			if (err instanceof Error) {
				console.error(err.message)
			}
		}

		setProgress(null)
		setIsUploading(false)
	}

	return (
		<div className="flex flex-col bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-lg p-4 gap-4 w-full my-20">
			<div className="flex flex-row justify-between items-center">
				<div className="flex flex-col gap-1">
					<span className="font-semibold text-lg">Contribute maps</span>
					<Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-white duration-200">
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
				Drop map images below. Each upload is reviewed by an admin before it becomes available through the public API.
			</p>
			<Dropzone
				uploadedFiles={uploadedFiles}
				setUploadedFiles={setUploadedFiles}
				isUploading={isUploading}
				progress={progress}
			/>
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
									check={checkOf(file)}
									replace={wantsReplace(file)}
									onReplaceChange={replace => setReplaceChoices(prev => ({ ...prev, [file.originalName]: replace }))}
								/>
							))}
						</div>
					</div>
				</>
			)}
			{conflicts.length > 0 && (
				<Alert color="orange" variant="light" title={`${conflicts.length} of these maps already exist`}>
					<div className="flex flex-col gap-1 text-xs">
						{replacing > 0 && (
							<span>
								{replacing} will be submitted as {replacing === 1 ? 'a replacement' : 'replacements'} — an admin reviews{' '}
								{replacing === 1 ? 'it' : 'them'} before the current {replacing === 1 ? 'image' : 'images'}{' '}
								{replacing === 1 ? 'is' : 'are'} overwritten.
							</span>
						)}
						{conflicts.length - replacing > 0 && (
							<span>
								{conflicts.length - replacing} will be skipped. Tick the box on a card to submit{' '}
								{conflicts.length - replacing === 1 ? 'it' : 'them'} anyway.
							</span>
						)}
					</div>
				</Alert>
			)}
			<Button disabled={uploadedFiles.length === 0} onClick={handleUploadAll} color="blue" loading={isUploading}>
				Upload{replacing > 0 ? ` (${replacing} ${replacing === 1 ? 'replacement' : 'replacements'})` : ''}
			</Button>
		</div>
	)
}

export default Upload
