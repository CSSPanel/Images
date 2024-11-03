export const toBase64 = (file: File): Promise<string> => {
	return new Promise((resolve, reject) => {
		const fileReader = new FileReader()

		fileReader.readAsDataURL(file)

		fileReader.onload = () => {
			const result = fileReader.result as string
			// Remove the data URL prefix
			const base64 = result.split(',')[1]
			resolve(base64)
		}

		fileReader.onerror = error => {
			reject(error)
		}
	})
}
