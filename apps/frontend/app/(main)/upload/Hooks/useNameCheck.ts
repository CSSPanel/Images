import type { IFile } from '@/app/UI/Dropzone'
import eden from '@/utils/eden'
import { normalizeMapName } from '@/utils/mapName'
import { useDebouncedValue } from '@mantine/hooks'
import { useMemo } from 'react'
import useSWR from 'swr'

type CheckResponse = NonNullable<Awaited<ReturnType<typeof eden.upload.check.post>>['data']>

export type NameCheck = CheckResponse[number]

/**
 * Ask the API which of the selected names are already taken, and by what, so the page
 * can show what a submission would replace before anything is sent.
 *
 * Debounced because names are edited by hand, and keyed by the payload itself so an
 * unchanged selection is served from cache.
 */
const useNameCheck = (files: IFile[]) => {
	const payload = useMemo(
		() => files.map(({ name, width, height }) => ({ name: normalizeMapName(name), width, height })),
		[files],
	)
	const [key] = useDebouncedValue(JSON.stringify(payload), 400)

	const { data, isLoading } = useSWR(
		key === '[]' ? null : ['name-check', key],
		async () => {
			const { data, error } = await eden.upload.check.post({ files: JSON.parse(key) })
			if (error) throw error
			return data
		},
		{
			keepPreviousData: true,
			revalidateOnFocus: false,
		},
	)

	// Keyed by the normalized map name — the same key the response comes back under.
	const checks = useMemo(() => new Map((data ?? []).map(check => [check.name, check])), [data])

	return { checks, isLoading }
}

export default useNameCheck
