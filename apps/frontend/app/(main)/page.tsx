'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
	ActionIcon,
	Autocomplete,
	Badge,
	Button,
	CopyButton,
	Loader,
	NumberInput,
	Table,
	Tabs,
	Tooltip,
} from '@mantine/core'
import { AiOutlineCloudUpload, AiOutlineSetting } from 'react-icons/ai'
import { BsCheck2, BsClipboard, BsImages } from 'react-icons/bs'
import useMaps from './Hooks/useMaps'

const API = (process.env.API || '').replace(/\/$/, '')
const MAX_WIDTH = 2000

const Home = () => {
	const { data: maps, isLoading } = useMaps()

	const mapNames = useMemo(() => (maps ?? []).map(m => m.name).sort((a, b) => a.localeCompare(b)), [maps])
	const exampleMap = mapNames[0] ?? 'de_dust2'

	const [mapName, setMapName] = useState('')
	const [width, setWidth] = useState<number | string>(400)

	const activeMap = (mapName.trim() || exampleMap).replace(/\.webp$/i, '')
	const previewUrl = useMemo(() => {
		const base = `${API}/maps/${encodeURIComponent(activeMap)}`
		return width ? `${base}?width=${width}` : base
	}, [activeMap, width])

	return (
		<div className="flex flex-col gap-6 w-full my-20">
			{/* Hero */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-row justify-between items-start gap-4">
					<div className="flex flex-col gap-3">
						<Badge color="indigo" variant="light" size="lg" radius="sm">
							Maps Image API
						</Badge>
						<h1 className="text-3xl md:text-4xl font-bold leading-tight">
							Serve map images on your site with a single URL
						</h1>
						<p className="text-gray-300 max-w-2xl">
							A free, fast image CDN for game maps. Point an <code className="text-pink-300">&lt;img&gt;</code>{' '}
							at our endpoint, pass a map name, and get back an optimized WebP — resized on the fly to any size
							you ask for.
						</p>
					</div>
					<Tooltip label="Admin">
						<Link href="/login" passHref>
							<ActionIcon variant="subtle" color="gray">
								<AiOutlineSetting />
							</ActionIcon>
						</Link>
					</Tooltip>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-1 border border-white/10">
						<BsImages className="text-indigo-300" />
						<span className="font-semibold text-lg tabular-nums">
							{isLoading && !maps ? <Loader size="xs" /> : mapNames.length}
						</span>
						<span className="text-gray-400 text-sm">maps available</span>
					</div>
					<Link href="/upload" passHref>
						<Button color="indigo" leftSection={<AiOutlineCloudUpload size={18} />}>
							Contribute by uploading maps
						</Button>
					</Link>
					<Link href="/maps" passHref>
						<Button variant="default" leftSection={<BsImages size={15} />}>
							Browse all maps
						</Button>
					</Link>
				</div>
			</section>

			{/* Interactive builder */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Try it</h2>
					<p className="text-gray-400 text-sm">
						Pick or type a map name, choose a width, and copy the ready-to-use URL.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
					<Autocomplete
						label="Map name"
						placeholder={exampleMap}
						value={mapName}
						onChange={setMapName}
						data={mapNames}
						limit={8}
						description="Suggestions come from maps already on the server"
					/>
					<NumberInput
						label="Width (px)"
						placeholder="auto"
						value={width}
						onChange={setWidth}
						min={16}
						max={MAX_WIDTH}
						clampBehavior="strict"
						description={`Max ${MAX_WIDTH}px`}
					/>
				</div>

				{/* Quick-pick chips */}
				{mapNames.length > 0 && (
					<div className="flex flex-wrap gap-2">
						<span className="text-xs text-gray-500 self-center">Examples:</span>
						{mapNames.slice(0, 6).map(name => (
							<button
								key={name}
								type="button"
								onClick={() => setMapName(name)}
								className={`text-xs rounded-full px-3 py-1 border duration-200 ${
									activeMap === name
										? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
										: 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'
								}`}
							>
								{name}
							</button>
						))}
					</div>
				)}

				{/* Generated URL */}
				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium text-gray-300">Your image URL</span>
					<div className="flex gap-2 items-center">
						<code className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-emerald-300">
							{previewUrl}
						</code>
						<CopyUrlButton value={previewUrl} />
					</div>
				</div>

				{/* Live preview */}
				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium text-gray-300">Live result</span>
					<PreviewImage key={previewUrl} url={previewUrl} alt={activeMap} />
				</div>
			</section>

			{/* Usage examples */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Drop it into your project</h2>
					<p className="text-gray-400 text-sm">
						The URL above is a plain image — use it anywhere you'd use an image source.
					</p>
				</div>

				<Tabs defaultValue="html" variant="pills" color="indigo">
					<Tabs.List>
						<Tabs.Tab value="html">HTML</Tabs.Tab>
						<Tabs.Tab value="react">React / Next.js</Tabs.Tab>
						<Tabs.Tab value="markdown">Markdown</Tabs.Tab>
						<Tabs.Tab value="css">CSS</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="html" pt="md">
						<CodeBlock code={`<img src="${previewUrl}" alt="${activeMap}" />`} />
					</Tabs.Panel>
					<Tabs.Panel value="react" pt="md">
						<CodeBlock
							code={`<img\n  src="${previewUrl}"\n  alt="${activeMap}"\n  loading="lazy"\n/>`}
						/>
					</Tabs.Panel>
					<Tabs.Panel value="markdown" pt="md">
						<CodeBlock code={`![${activeMap}](${previewUrl})`} />
					</Tabs.Panel>
					<Tabs.Panel value="css" pt="md">
						<CodeBlock code={`.map {\n  background-image: url("${previewUrl}");\n  background-size: cover;\n}`} />
					</Tabs.Panel>
				</Tabs>
			</section>

			{/* Reference */}
			<section className="flex flex-col gap-5 bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Endpoint reference</h2>
					<p className="text-gray-400 text-sm">
						<code className="text-emerald-300">GET</code>{' '}
						<code className="text-gray-200">{`${API}/maps/{name}`}</code>
					</p>
				</div>

				<div className="overflow-x-auto">
					<Table withColumnBorders verticalSpacing="sm" striped>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Parameter</Table.Th>
								<Table.Th>Type</Table.Th>
								<Table.Th>Description</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							<Table.Tr>
								<Table.Td>
									<code className="text-pink-300">name</code>{' '}
									<span className="text-xs text-gray-500">(path)</span>
								</Table.Td>
								<Table.Td>string</Table.Td>
								<Table.Td>The map name, e.g. <code className="text-gray-300">{exampleMap}</code>. Case-insensitive.</Table.Td>
							</Table.Tr>
							<Table.Tr>
								<Table.Td>
									<code className="text-pink-300">width</code>
								</Table.Td>
								<Table.Td>number</Table.Td>
								<Table.Td>
									Resize to this width, keeping aspect ratio. Defaults to 400 when no size is given. Clamped to{' '}
									{MAX_WIDTH}px.
								</Table.Td>
							</Table.Tr>
							<Table.Tr>
								<Table.Td>
									<code className="text-pink-300">height</code>
								</Table.Td>
								<Table.Td>number</Table.Td>
								<Table.Td>Resize to this height, keeping aspect ratio. Clamped to {MAX_WIDTH}px.</Table.Td>
							</Table.Tr>
							<Table.Tr>
								<Table.Td>
									<code className="text-pink-300">fallback</code>
								</Table.Td>
								<Table.Td>string</Table.Td>
								<Table.Td>A map name to serve instead if the requested map doesn't exist.</Table.Td>
							</Table.Tr>
						</Table.Tbody>
					</Table>
				</div>

				<div className="flex flex-col gap-1 text-sm text-gray-400">
					<p>
						<span className="text-gray-200 font-medium">Output:</span> optimized WebP, never upscaled past the
						stored image.
					</p>
					<p>
						<span className="text-gray-200 font-medium">Caching:</span> responses are cached for 24h and support{' '}
						<code className="text-gray-300">ETag</code> revalidation, so they're cheap to hotlink.
					</p>
					<p>
						<span className="text-gray-200 font-medium">List maps:</span>{' '}
						<code className="text-emerald-300">GET</code> <code className="text-gray-200">{`${API}/maps`}</code>{' '}
						returns every available map name as JSON.
					</p>
				</div>
			</section>

			{/* CTA footer */}
			<section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/20 to-pink-500/20 border border-white/10 rounded-xl p-6 md:p-8">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold">Missing a map?</h2>
					<p className="text-gray-300 text-sm">Upload it and help everyone — submissions are reviewed before going live.</p>
				</div>
				<Link href="/upload" passHref>
					<Button size="md" color="indigo" leftSection={<AiOutlineCloudUpload size={18} />}>
						Contribute by uploading maps
					</Button>
				</Link>
			</section>
		</div>
	)
}

/** Copy-to-clipboard button used next to the generated URL. */
const CopyUrlButton = ({ value }: { value: string }) => (
	<CopyButton value={value} timeout={1500}>
		{({ copied, copy }) => (
			<Tooltip label={copied ? 'Copied!' : 'Copy URL'} withArrow>
				<Button color={copied ? 'teal' : 'indigo'} onClick={copy} className="shrink-0">
					{copied ? <BsCheck2 size={18} /> : <BsClipboard size={16} />}
				</Button>
			</Tooltip>
		)}
	</CopyButton>
)

/** A code snippet with a copy button in the corner. */
const CodeBlock = ({ code }: { code: string }) => (
	<div className="relative group">
		<pre className="overflow-x-auto bg-black/40 border border-white/10 rounded-lg p-4 text-sm text-gray-200">
			<code>{code}</code>
		</pre>
		<div className="absolute top-2 right-2">
			<CopyButton value={code} timeout={1500}>
				{({ copied, copy }) => (
					<Tooltip label={copied ? 'Copied!' : 'Copy'} withArrow>
						<ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
							{copied ? <BsCheck2 size={16} /> : <BsClipboard size={14} />}
						</ActionIcon>
					</Tooltip>
				)}
			</CopyButton>
		</div>
	</div>
)

/** Live preview of a generated URL, with loading and not-found states. */
const PreviewImage = ({ url, alt }: { url: string; alt: string }) => {
	const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

	return (
		<div className="relative flex items-center justify-center min-h-[180px] rounded-lg border border-white/10 bg-black/30 p-4">
			{status === 'error' ? (
				<div className="flex flex-col items-center gap-1 text-center text-gray-400 py-8">
					<BsImages size={28} />
					<span className="text-sm font-medium">Map not found</span>
					<span className="text-xs">No map named "{alt}" — try one of the examples above.</span>
				</div>
			) : (
				<>
					{status === 'loading' && <Loader className="absolute" />}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={url}
						alt={alt}
						onLoad={() => setStatus('loaded')}
						onError={() => setStatus('error')}
						className={`max-h-[420px] max-w-full rounded shadow-lg duration-300 ${
							status === 'loaded' ? 'opacity-100' : 'opacity-0'
						}`}
					/>
				</>
			)}
		</div>
	)
}

export default Home
