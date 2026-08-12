'use client'

import useMaps from '@/app/(main)/Hooks/useMaps'
import { normalizeMapName } from '@/utils/mapName'
import useAuth from '@/utils/useAuth'
import { Alert, Anchor, Badge, Button, Loader, Modal, Select, TextInput } from '@mantine/core'
import bytes from 'bytes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BsCheckAll, BsExclamationTriangle, BsImages, BsSearch } from 'react-icons/bs'
import { mutate } from 'swr'
import useImages, {
	handleApproveImage,
	handleDeleteImage,
	isConflictError,
	useCompare,
	type PendingImage,
} from './Hooks/useImages'

type SortOption = 'name' | 'newest' | 'oldest'

const SORT_OPTIONS = [
	{ value: 'name', label: 'Name' },
	{ value: 'newest', label: 'Newest first' },
	{ value: 'oldest', label: 'Oldest first' },
]

type Conflict = {
	/** `approved` overwrites a live map, `duplicate` collides with another upload in the queue. */
	kind: 'approved' | 'duplicate'
	name: string
}

type Review = {
	fileName: string
	name: string
	conflict: Conflict
}

const weight = (size: number) => bytes(size) ?? `${size} B`

// Refresh both the pending queue and the approved-maps counter.
const refresh = () => Promise.all([mutate('pending-images'), mutate('maps-list')])

const AdminPage = () => {
	const router = useRouter()

	// Bounce to /login if the session isn't authenticated.
	const { data: isLoggedIn, isLoading: isAuthLoading } = useAuth()
	useEffect(() => {
		if (!isAuthLoading && isLoggedIn === false) router.replace('/login')
	}, [isLoggedIn, isAuthLoading, router])

	const { data, isLoading } = useImages()
	const { data: maps } = useMaps()

	const [sort, setSort] = useState<SortOption>('name')
	const [query, setQuery] = useState('')
	// Edited names, keyed by fileName. Falls back to the original name when absent.
	const [names, setNames] = useState<Record<string, string>>({})
	const [isApprovingAll, setIsApprovingAll] = useState(false)
	const [bulkResult, setBulkResult] = useState<string | null>(null)
	// The upload whose replacement is being confirmed.
	const [review, setReview] = useState<Review | null>(null)

	const nameOf = (fileName: string, fallback: string) => names[fileName] ?? fallback
	// The name an upload would actually be stored under, edits included.
	const targetName = (image: PendingImage) => normalizeMapName(nameOf(image.fileName, image.name))

	const pending = data ?? []

	const approvedNames = useMemo(() => new Set((maps ?? []).map(m => m.name)), [maps])

	// Names more than one upload in the queue wants: approving both silently leaves
	// whichever went last, so they need a decision too.
	const duplicateNames = useMemo(() => {
		const counts = new Map<string, number>()
		for (const image of pending) {
			const name = targetName(image)
			if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
		}

		return new Set(
			Array.from(counts)
				.filter(([, count]) => count > 1)
				.map(([name]) => name),
		)
	}, [pending, names])

	const conflictOf = (image: PendingImage): Conflict | null => {
		const name = targetName(image)
		if (!name) return null
		if (approvedNames.has(name)) return { kind: 'approved', name }
		if (duplicateNames.has(name)) return { kind: 'duplicate', name }
		return null
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		const result = q ? pending.filter(i => i.name.toLowerCase().includes(q)) : [...pending]

		return result.sort((a, b) => {
			switch (sort) {
				case 'newest':
					return b.timestamp - a.timestamp
				case 'oldest':
					return a.timestamp - b.timestamp
				default:
					return a.name.localeCompare(b.name)
			}
		})
	}, [pending, query, sort])

	// Everything a bulk approval is allowed to touch — conflicts are left for a human.
	const approvable = useMemo(
		() => filtered.filter(image => !conflictOf(image)),
		[filtered, approvedNames, duplicateNames, names],
	)

	const approveAll = async () => {
		if (isApprovingAll || !maps) return

		const skipped = filtered.length - approvable.length

		if (!approvable.length) {
			return setBulkResult(
				`Nothing to approve in bulk — all ${filtered.length} of these already exist and need a look each.`,
			)
		}

		const question = [
			`Approve ${approvable.length} image${approvable.length > 1 ? 's' : ''}?`,
			skipped > 0 &&
				`${skipped} already exist${skipped > 1 ? '' : 's'} and will be skipped — approve those one by one.`,
		]
			.filter(Boolean)
			.join('\n\n')

		if (!confirm(question)) return

		setIsApprovingAll(true)
		setBulkResult(null)

		try {
			// allSettled: one failure shouldn't hide the rest of the batch.
			const settled = await Promise.allSettled(
				approvable.map(image => handleApproveImage(image.fileName, nameOf(image.fileName, image.name))),
			)

			let approved = 0
			// Names taken between listing the queue and approving it (the API answers 409
			// rather than overwriting, so nothing was lost).
			let raced = 0
			let failed = 0

			for (const result of settled) {
				if (result.status === 'fulfilled') approved++
				else if (isConflictError(result.reason)) raced++
				else failed++
			}

			setBulkResult(
				[
					`Approved ${approved}`,
					skipped + raced > 0 && `skipped ${skipped + raced} that already exist`,
					failed > 0 && `${failed} failed`,
				]
					.filter(Boolean)
					.join(' · '),
			)
		} finally {
			await refresh()
			setIsApprovingAll(false)
		}
	}

	return (
		<div className="flex flex-col gap-6 w-full my-20">
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				{/* Header + stats */}
				<div className="flex flex-row flex-wrap justify-between items-start gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl md:text-3xl font-bold">Approvals</h1>
						<p className="text-gray-400 text-sm">Review, rename and approve uploaded maps.</p>
					</div>
					<div className="flex items-center gap-2">
						<Badge color="orange" variant="light" size="lg" radius="sm">
							{isLoading && !data ? <Loader size="xs" /> : `${pending.length} pending`}
						</Badge>
						{filtered.length > approvable.length && (
							<Badge color="red" variant="light" size="lg" radius="sm">
								{filtered.length - approvable.length} already exist
							</Badge>
						)}
						<Badge color="teal" variant="light" size="lg" radius="sm">
							{maps ? `${maps.length} approved` : <Loader size="xs" />}
						</Badge>
					</div>
				</div>

				{/* Controls */}
				<div className="flex flex-col sm:flex-row gap-3">
					<TextInput
						className="flex-1"
						placeholder="Search pending maps…"
						value={query}
						onChange={e => setQuery(e.currentTarget.value)}
						leftSection={<BsSearch />}
						size="md"
					/>
					<Select
						aria-label="Sort by"
						data={SORT_OPTIONS}
						value={sort}
						onChange={value => setSort((value as SortOption) ?? 'name')}
						allowDeselect={false}
						size="md"
						className="sm:w-44"
					/>
					<Button
						color="teal"
						size="md"
						leftSection={<BsCheckAll size={20} />}
						loading={isApprovingAll}
						disabled={!maps || approvable.length === 0}
						onClick={approveAll}
					>
						Approve all ({approvable.length})
					</Button>
				</div>

				{filtered.length > approvable.length && (
					<Alert color="orange" variant="light" icon={<BsExclamationTriangle />}>
						{filtered.length - approvable.length} of these maps already exist. Bulk approval skips them — approve each
						one yourself to replace the current image.
					</Alert>
				)}

				{bulkResult && (
					<Alert color="blue" variant="light" withCloseButton onClose={() => setBulkResult(null)}>
						{bulkResult}
					</Alert>
				)}
			</section>

			{/* Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 items-start">
				{isLoading && !data ? (
					<p className="col-span-full text-center py-10 text-gray-400">Loading…</p>
				) : filtered.length === 0 ? (
					<EmptyState query={query} hasPending={pending.length > 0} />
				) : (
					filtered.map(image => {
						const conflict = conflictOf(image)

						return (
							<Image
								key={image.fileName}
								{...image}
								value={nameOf(image.fileName, image.name)}
								onNameChange={value => setNames(prev => ({ ...prev, [image.fileName]: value }))}
								disabled={isApprovingAll}
								conflict={conflict}
								onReview={() => conflict && setReview({ fileName: image.fileName, name: conflict.name, conflict })}
							/>
						)
					})
				)}
			</div>

			<ReplaceModal
				review={review}
				onClose={() => setReview(null)}
				onApproved={async () => {
					setReview(null)
					await refresh()
				}}
			/>
		</div>
	)
}

const Image = ({
	fileName,
	value,
	onNameChange,
	disabled,
	conflict,
	onReview,
}: {
	timestamp: number
	name: string
	fileName: string
	value: string
	onNameChange: (value: string) => void
	disabled: boolean
	conflict: Conflict | null
	onReview: () => void
}) => {
	const path = `${process.env.API}/admin/${fileName}`
	const [isLoading, setIsLoading] = useState(false)

	const run = (action: () => Promise<void>) => {
		setIsLoading(true)
		action()
			.then(refresh)
			.catch(err => console.error(err))
			.finally(() => setIsLoading(false))
	}

	return (
		<div
			className={`flex flex-col gap-2 rounded-lg border p-2 ${
				conflict ? 'border-orange-400/40 bg-orange-500/5' : 'border-white/10 bg-black/30'
			}`}
		>
			<Link href={path} target="_blank" passHref>
				<img src={path} alt={value} width={256} height={128} className="object-cover w-full h-32 rounded-md" />
			</Link>

			{conflict && (
				<Badge color="orange" variant="light" size="sm" radius="sm" fullWidth>
					{conflict.kind === 'approved' ? 'Replaces existing map' : 'Duplicate in queue'}
				</Badge>
			)}

			<TextInput
				placeholder="Map name"
				size="compact-xs"
				onChange={e => onNameChange(e.currentTarget.value)}
				value={value}
				disabled={disabled || isLoading}
			/>
			<Button
				size="compact-xs"
				color={conflict ? 'orange' : 'blue'}
				loading={isLoading}
				disabled={disabled}
				onClick={() => (conflict ? onReview() : run(() => handleApproveImage(fileName, value)))}
			>
				{!conflict ? 'Approve' : conflict.kind === 'approved' ? 'Review & replace' : 'Review duplicate'}
			</Button>
			<Button
				size="compact-xs"
				color="red"
				loading={isLoading}
				disabled={disabled}
				onClick={() => run(() => handleDeleteImage(fileName))}
			>
				Delete
			</Button>
		</div>
	)
}

/** Side-by-side confirmation for an approval that overwrites a map. */
const ReplaceModal = ({
	review,
	onClose,
	onApproved,
}: {
	review: Review | null
	onClose: () => void
	onApproved: () => Promise<void>
}) => {
	const [isReplacing, setIsReplacing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const { data: compare, isLoading } = useCompare(review?.fileName, review?.name)

	const replace = () => {
		if (!review) return

		setIsReplacing(true)
		setError(null)

		handleApproveImage(review.fileName, review.name, true)
			.then(onApproved)
			.catch(err => setError(err instanceof Error ? err.message : 'Could not approve this image'))
			.finally(() => setIsReplacing(false))
	}

	const existingUrl = review ? `${process.env.API}/maps/${review.name}` : ''

	return (
		<Modal
			opened={!!review}
			onClose={onClose}
			title={review?.conflict.kind === 'duplicate' ? 'Duplicate name in the queue' : 'Approve a replacement'}
			size="lg"
			centered
		>
			{review && (
				<div className="flex flex-col gap-4">
					<p className="text-sm text-gray-400">
						{review.conflict.kind === 'approved' ? (
							<>
								Approving this upload overwrites the map served as <b>{review.name}</b>. The current image is gone for
								good.
							</>
						) : (
							<>
								Another upload in the queue is also called <b>{review.name}</b> — whichever you approve last is the one
								that stays.
							</>
						)}
					</p>

					<div className="grid grid-cols-2 gap-4">
						{compare?.existing ? (
							<Preview
								title="Current map"
								src={`${existingUrl}?width=600`}
								href={`${existingUrl}?width=2000`}
								meta={compare.existing}
							/>
						) : (
							<div className="flex items-center justify-center rounded-md border border-dashed border-white/15 text-xs text-gray-500 h-40">
								{isLoading ? <Loader size="xs" /> : 'No map with this name yet'}
							</div>
						)}
						<Preview
							title="New upload"
							src={`${process.env.API}/admin/${review.fileName}`}
							href={`${process.env.API}/admin/${review.fileName}`}
							meta={compare?.incoming}
						/>
					</div>

					{compare?.resolution === 'lower' && (
						<Alert color="red" variant="light" icon={<BsExclamationTriangle />}>
							The new upload is lower resolution than the current map — approving it replaces a better image with a
							worse one.
						</Alert>
					)}
					{compare?.resolution === 'higher' && (
						<Alert color="teal" variant="light">
							The new upload is higher resolution than the current map.
						</Alert>
					)}
					{compare?.resolution === 'same' && (
						<Alert color="blue" variant="light">
							Both images have the same resolution.
						</Alert>
					)}

					{error && (
						<Alert color="red" variant="filled">
							{error}
						</Alert>
					)}

					<div className="flex flex-row justify-end gap-2">
						<Button variant="default" onClick={onClose} disabled={isReplacing}>
							Cancel
						</Button>
						<Button color={compare?.existing ? 'red' : 'teal'} loading={isReplacing} onClick={replace}>
							{compare?.existing ? 'Replace the current map' : 'Approve anyway'}
						</Button>
					</div>
				</div>
			)}
		</Modal>
	)
}

const Preview = ({
	title,
	src,
	href,
	meta,
}: {
	title: string
	src: string
	href: string
	meta?: { width: number; height: number; bytes: number }
}) => (
	<div className="flex flex-col gap-2">
		<div className="flex flex-row items-center justify-between gap-2">
			<span className="text-xs font-semibold text-gray-300">{title}</span>
			<Anchor href={href} target="_blank" rel="noreferrer" className="!text-xs">
				Open
			</Anchor>
		</div>
		<Link href={href} target="_blank" passHref>
			<img src={src} alt={title} className="object-cover w-full h-40 rounded-md border border-white/10" />
		</Link>
		<span className="text-xs text-gray-400">
			{meta ? `${meta.width}×${meta.height} · ${weight(meta.bytes)}` : 'Measuring…'}
		</span>
	</div>
)

const EmptyState = ({ query, hasPending }: { query: string; hasPending: boolean }) => (
	<div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/20 py-16 text-center text-gray-400">
		<BsImages size={32} />
		{hasPending ? (
			<>
				<p className="font-medium text-gray-300">No pending maps match “{query}”</p>
				<p className="text-sm">Try a different search term.</p>
			</>
		) : (
			<p className="font-medium text-gray-300">Nothing waiting for approval 🎉</p>
		)}
	</div>
)

export default AdminPage
