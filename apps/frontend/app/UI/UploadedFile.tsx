'use client'

import type { IFile } from './Dropzone'
import { Input } from '@mantine/core'
import Image from 'next/image'

const UploadedFile = ({ file, name, onChangeName }: Props) => {
	const filePreview = file && URL.createObjectURL(file)

	return (
		<div className="flex flex-row gap-4 items-center justify-between py-4">
			{file && (
				<Image
					src={filePreview}
					alt={name}
					className="rounded-md aspect-square object-cover w-64 h-32"
					width={256}
					height={128}
				/>
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
			</div>
		</div>
	)
}

type Props = IFile & {
	onChangeName: (name: string) => void
}

export default UploadedFile
