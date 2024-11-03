'use client'

import eden from '@/utils/eden'
import { Button, TextInput } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const AdminPage = () => {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const router = useRouter()

	const handleSubmit = async () => {
		if (isLoading) return
		setIsLoading(true)

		try {
			const { data, error } = await eden.auth.login.post({ username, password })
			if (error) {
				throw new Error(error.value)
			}

			if (data) {
				router.push('/admin')
			}
		} catch (err) {
			if (err instanceof Error) {
				console.error(err.message)
			}
		}

		setIsLoading(false)
	}

	return (
		<div className="flex flex-col bg-black/20 backdrop-blur-3xl shadow-lg shadow-slate-800/10 rounded-lg p-4 gap-4 w-full my-20">
			<TextInput placeholder="Username" onChange={e => setUsername(e.currentTarget.value)} value={username} autoFocus />
			<TextInput
				placeholder="Password"
				onChange={e => setPassword(e.currentTarget.value)}
				value={password}
				type="password"
			/>
			<Button onClick={handleSubmit} loading={isLoading} disabled={!username || !password}>
				Login
			</Button>
		</div>
	)
}

export default AdminPage
