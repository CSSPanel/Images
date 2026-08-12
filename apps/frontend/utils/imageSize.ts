/**
 * Read a local image's pixel dimensions. Used to tell the uploader whether their file
 * beats the map that's already stored, before anything gets sent.
 * Resolves null when the browser can't decode the file.
 */
export const readImageSize = (file: File): Promise<{ width: number; height: number } | null> =>
	new Promise(resolve => {
		const url = URL.createObjectURL(file)
		const image = new window.Image()

		image.onload = () => {
			resolve({ width: image.naturalWidth, height: image.naturalHeight })
			URL.revokeObjectURL(url)
		}

		image.onerror = () => {
			resolve(null)
			URL.revokeObjectURL(url)
		}

		image.src = url
	})
