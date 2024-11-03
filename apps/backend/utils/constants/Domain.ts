export const WEBSITE_URL_WITHOUT_SSL =
	Bun.env.WEBSITE_URL?.replace('https://', '').replace('http://', '').replace(':3000', '') || undefined
