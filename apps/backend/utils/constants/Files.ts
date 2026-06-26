// This will be used to split the image name with the time it was uploaded
export const IMAGE_SPLITER = '-----'

// R2 layout: approved maps live at the bucket root (e.g. "de_dust2.webp");
// uploads awaiting approval live under this prefix.
export const PENDING_PREFIX = 'pending/'

// Upload validation / normalization
export const MIN_DIMENSION = 400 // reject uploads under this on the longest side
export const MASTER_MAX_DIMENSION = 2000 // downscale the stored map to this on the longest side
export const MASTER_WEBP_QUALITY = 90 // quality of the stored map
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // per-file decoded size cap

// Serving
export const MAX_SERVE_DIMENSION = 2000 // clamp requested width/height to this
export const DEFAULT_WIDTH = 400 // used when neither width nor height is provided
export const SERVE_WEBP_QUALITY = 82 // quality of the on-the-fly resized output
