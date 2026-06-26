'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge, Button, Loader, Select, TextInput } from '@mantine/core'
import { AiOutlineCloudUpload } from 'react-icons/ai'
import { BsArrowLeft, BsImages, BsSearch } from 'react-icons/bs'
import useMaps from '../Hooks/useMaps'

const API = (process.env.API || '').replace(/\/$/, '')

type SortOption = 'name' | 'name-desc'

const SORT_OPTIONS = [
	{ value: 'name', label: 'Name (A → Z)' },
	{ value: 'name-desc', label: 'Name (Z → A)' },
]

// Stable keys for the loading skeletons (avoids index-as-key).
const SKELETONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8']

const Maps = () => {
	const { data, isLoading } = useMaps()
	const [query, setQuery] = useState('')
	const [sort, setSort] = useState<SortOption>('name')

	const maps = data ?? []
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase()
		const result = q ? maps.filter(m => m.name.toLowerCase().includes(q)) : [...maps]
		return result.sort((a, b) => {
			const compare = a.name.localeCompare(b.name)
			return sort === 'name-desc' ? -compare : compare
		})
	}, [maps, query, sort])

	const loading = isLoading && !data

	return (
		<div className="flex flex-col gap-6 w-full my-20">
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				{/* Header */}
				<div className="flex flex-row flex-wrap justify-between items-start gap-4">
					<div className="flex flex-col gap-2">
						<Link
							href="/"
							className="flex items-center gap-1 text-sm text-gray-400 hover:text-white duration-200 w-fit"
						>
							<BsArrowLeft /> Back to docs
						</Link>
						<div className="flex items-center gap-3">
							<h1 className="text-2xl md:text-3xl font-bold">Maps</h1>
							<Badge color="indigo" variant="light" size="lg" radius="sm">
								{loading ? <Loader size="xs" /> : `${maps.length} available`}
							</Badge>
						</div>
						<p className="text-gray-400 text-sm">
							Every map currently served by the API. Click one to open the full image.
						</p>
					</div>
					<Link href="/upload" passHref>
						<Button color="indigo" leftSection={<AiOutlineCloudUpload size={18} />}>
							Contribute
						</Button>
					</Link>
				</div>

				{/* Controls */}
				<div className="flex flex-col sm:flex-row gap-3">
					<TextInput
						className="flex-1"
						placeholder="Search maps…"
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
						className="sm:w-52"
					/>
				</div>
			</section>

			{/* Grid */}
			{loading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
					{SKELETONS.map(key => (
						<div key={key} className="aspect-video rounded-lg bg-white/5 animate-pulse" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<EmptyState query={query} hasMaps={maps.length > 0} />
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
					{filtered.map(map => (
						<MapCard key={map.name} name={map.name} />
					))}
				</div>
			)}
		</div>
	)
}

const MapCard = ({ name }: { name: string }) => {
	const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

	const thumb = `${API}/maps/${encodeURIComponent(name)}?width=400`
	const full = `${API}/maps/${encodeURIComponent(name)}?width=1600`

	return (
		<Link
			href={full}
			target="_blank"
			passHref
			className="group flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-2 hover:border-indigo-400/60 hover:bg-white/5 duration-200"
		>
			<div className="relative aspect-video overflow-hidden rounded-md bg-black/40">
				{status === 'error' ? (
					<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-500">
						<BsImages size={22} />
						<span className="text-xs">unavailable</span>
					</div>
				) : (
					<>
						{status === 'loading' && (
							<div className="absolute inset-0 flex items-center justify-center">
								<Loader size="sm" />
							</div>
						)}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={thumb}
							alt={name}
							loading="lazy"
							onLoad={() => setStatus('loaded')}
							onError={() => setStatus('error')}
							className={`h-full w-full object-cover duration-300 group-hover:scale-105 ${
								status === 'loaded' ? 'opacity-100' : 'opacity-0'
							}`}
						/>
					</>
				)}
			</div>
			<p className="truncate px-1 text-sm text-gray-200" title={name}>
				{name}
			</p>
		</Link>
	)
}

const EmptyState = ({ query, hasMaps }: { query: string; hasMaps: boolean }) => (
	<div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/20 py-16 text-center text-gray-400">
		<BsImages size={32} />
		{hasMaps ? (
			<>
				<p className="font-medium text-gray-300">No maps match “{query}”</p>
				<p className="text-sm">Try a different search term.</p>
			</>
		) : (
			<>
				<p className="font-medium text-gray-300">No maps yet</p>
				<p className="text-sm">Be the first to contribute one.</p>
				<Link href="/upload" passHref>
					<Button mt="sm" color="indigo" leftSection={<AiOutlineCloudUpload size={18} />}>
						Upload a map
					</Button>
				</Link>
			</>
		)}
	</div>
)

export default Maps
