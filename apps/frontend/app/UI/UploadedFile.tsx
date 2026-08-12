'use client'

import { Anchor, Checkbox, Input } from '@mantine/core'
import bytes from 'bytes'
import Image from 'next/image'
import { BsBoxArrowUpRight } from 'react-icons/bs'
import type { NameCheck } from '../(main)/upload/Hooks/useNameCheck'
import type { IFile } from './Dropzone'

const px = (size: { width: number; height: number }) => `${size.width}×${size.height}`
const weight = (size: number) => bytes(size) ?? `${size} B`

/** Full-size view of the map that's already stored, for a side-by-side sanity check. */
const currentMapUrl = (name: string) => `${process.env.API}/maps/${name}?width=2000`

/**
 * What to tell the uploader about a name that's already taken. Nothing here blocks the
 * upload — a replacement is queued for review like any other file.
 */
const describe = (check: NameCheck) => {
	const current = check.existing ? `${px(check.existing)} · ${weight(check.existing.bytes)}` : 'unknown size'
	const mine = check.incoming ? px(check.incoming) : 'an unknown resolution'

	if (check.state === 'pending')
		return {
			color: 'text-sky-300',
			border: 'border-sky-400/30 bg-sky-500/5',
			headline: 'Already awaiting review',
			detail: `“${check.name}” has already been uploaded (${current}) and is waiting in the review queue. Yours is ${mine} — submit it anyway and an admin picks the better one.`,
			action: 'Submit mine anyway',
		}

	if (check.resolution === 'higher')
		return {
			color: 'text-teal-300',
			border: 'border-teal-400/30 bg-teal-500/5',
			headline: 'Higher resolution than the current map',
			detail: `“${check.name}” already exists at ${current}. Yours will be stored at ${mine}, so approving it replaces a lower quality image.`,
			action: 'Replace the current map',
		}

	if (check.resolution === 'lower')
		return {
			color: 'text-orange-300',
			border: 'border-orange-400/30 bg-orange-500/5',
			headline: 'Lower resolution than the current map',
			detail: `“${check.name}” already exists at ${current} — better than your ${mine}. Submit it anyway if the current image is wrong or outdated, and an admin decides.`,
			action: 'Request a replacement anyway',
		}

	return {
		color: 'text-orange-300',
		border: 'border-orange-400/30 bg-orange-500/5',
		headline: check.resolution === 'same' ? 'Same resolution as the current map' : `“${check.name}” already exists`,
		detail: `“${check.name}” already exists at ${current}${
			check.resolution === 'same' ? ', the same resolution as yours' : ''
		}. Submit it anyway if the current image is wrong or outdated, and an admin decides.`,
		action: 'Request a replacement anyway',
	}
}

const UploadedFile = ({ file, name, width, height, check, replace, onChangeName, onReplaceChange }: Props) => {
	const filePreview = file && URL.createObjectURL(file)
	const conflict = check && check.state !== 'free' ? describe(check) : null

	return (
		<div className="flex flex-row gap-4 items-center justify-between py-4">
			{file && (
				<div className="flex flex-col gap-1 items-center shrink-0">
					<Image
						src={filePreview}
						alt={name}
						className="rounded-md aspect-square object-cover w-64 h-32"
						width={256}
						height={128}
					/>
					{width && height && <span className="text-[11px] text-gray-500">{px({ width, height })}</span>}
				</div>
			)}
			<div className="flex flex-col gap-4 w-full">
				<Input.Wrapper label="File name" description="Should be the map name, for example 'de_dust2'">
					<Input
						size="sm"
						value={name}
						classNames={{ input: '!text-xs !bg-white/20' }}
						className="w-full "
						onChange={e => onChangeName(e.target.value.toLowerCase())}
					/>
				</Input.Wrapper>
				{conflict && check && (
					<div className={`flex flex-col gap-2 rounded-md border p-3 ${conflict.border}`}>
						<div className="flex flex-row flex-wrap items-center justify-between gap-2">
							<span className={`text-xs font-semibold ${conflict.color}`}>{conflict.headline}</span>
							{check.state === 'approved' && (
								<Anchor
									href={currentMapUrl(check.name)}
									target="_blank"
									rel="noreferrer"
									className="!text-xs !flex items-center gap-1"
								>
									View current map <BsBoxArrowUpRight />
								</Anchor>
							)}
						</div>
						<span className="text-xs text-gray-400">{conflict.detail}</span>
						<Checkbox
							size="xs"
							checked={replace}
							onChange={e => onReplaceChange(e.currentTarget.checked)}
							label={<span className="text-xs">{conflict.action}</span>}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

type Props = IFile & {
	onChangeName: (name: string) => void
	/** Whether this name is taken, and by what. Undefined while the check is in flight. */
	check?: NameCheck
	replace: boolean
	onReplaceChange: (replace: boolean) => void
}

export default UploadedFile
