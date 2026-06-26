'use client'

import { Badge, Button, Loader, Select, TextInput } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { mutate } from 'swr'
import useImages, { handleApproveImage, handleDeleteImage } from './Hooks/useImages'
import useMaps from '@/app/(main)/Hooks/useMaps'
import useAuth from '@/utils/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BsCheckAll, BsImages, BsSearch } from 'react-icons/bs'

type SortOption = 'name' | 'newest' | 'oldest'

const SORT_OPTIONS = [
	{ value: 'name', label: 'Name' },
	{ value: 'newest', label: 'Newest first' },
	{ value: 'oldest', label: 'Oldest first' },
]

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

	const nameOf = (fileName: string, fallback: string) => names[fileName] ?? fallback

	const pending = data ?? []

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

	const approveAll = async () => {
		if (!filtered.length || isApprovingAll) return
		if (!confirm(`Approve ${filtered.length} image${filtered.length > 1 ? 's' : ''}?`)) return

		setIsApprovingAll(true)
		try {
			await Promise.all(filtered.map(i => handleApproveImage(i.fileName, nameOf(i.fileName, i.name))))
		} catch (err) {
			console.error(err)
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
						disabled={filtered.length === 0}
						onClick={approveAll}
					>
						Approve all ({filtered.length})
					</Button>
				</div>
			</section>

			{/* Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 items-start">
				{isLoading && !data ? (
					<p className="col-span-full text-center py-10 text-gray-400">Loading…</p>
				) : filtered.length === 0 ? (
					<EmptyState query={query} hasPending={pending.length > 0} />
				) : (
					filtered.map(image => (
						<Image
							key={image.fileName}
							{...image}
							value={nameOf(image.fileName, image.name)}
							onNameChange={value => setNames(prev => ({ ...prev, [image.fileName]: value }))}
							disabled={isApprovingAll}
						/>
					))
				)}
			</div>
		</div>
	)
}

const Image = ({
	fileName,
	value,
	onNameChange,
	disabled,
}: {
	timestamp: number
	name: string
	fileName: string
	value: string
	onNameChange: (value: string) => void
	disabled: boolean
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
		<div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
			<Link href={path} target="_blank" passHref>
				<img
					src={path}
					alt={value}
					width={256}
					height={128}
					className="object-cover w-full h-32 rounded-md"
				/>
			</Link>

			<TextInput
				placeholder="Map name"
				size="compact-xs"
				onChange={e => onNameChange(e.currentTarget.value)}
				value={value}
				disabled={disabled || isLoading}
			/>
			<Button
				size="compact-xs"
				loading={isLoading}
				disabled={disabled}
				onClick={() => run(() => handleApproveImage(fileName, value))}
			>
				Approve
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
