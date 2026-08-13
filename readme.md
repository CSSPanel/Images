# CSS-Panel Images — a map image CDN for Counter-Strike websites

A free, self-hostable image API for **CS 1.6 / CS:S / CS2 map images**.

Point an `<img>` at one URL, pass a map name, and get back an optimized WebP resized on the
fly to whatever size you asked for. It exists so game-server websites, stats pages and
[CSS-Panel](https://csspanel.dev) installations stop hotlinking map thumbnails from random
third-party CDNs, dead image hosts and 2008-era forum attachments — and stop shipping a
`maps/` folder of 200 unoptimized JPEGs with every install.

- 🌐 **Hosted platform (recommended):** https://upload.csspanel.dev
- 🔗 **API base URL:** `https://i.csspanel.dev`
- 🗺️ **Maps available right now:** ~100 and growing (community-contributed, admin-reviewed)

---

## Quick start

No API key, no signup, no SDK. It's just an image URL:

```html
<img src="https://i.csspanel.dev/maps/de_dust2?width=400" alt="de_dust2" />
```

That's the whole integration. The response is a WebP, cached for 24h, with `ETag`
revalidation — cheap to hotlink directly from your site.

Browse what's available, build URLs interactively, and preview results at
**https://upload.csspanel.dev**.

### More examples

```html
<!-- Exact width, aspect ratio preserved -->
<img src="https://i.csspanel.dev/maps/de_inferno?width=800" />

<!-- Fit inside a height instead -->
<img src="https://i.csspanel.dev/maps/cs_office?height=200" />

<!-- Unknown map? Serve a placeholder instead of a 404 -->
<img src="https://i.csspanel.dev/maps/some_custom_map?width=400&fallback=de_dust2" />
```

```css
.map-banner {
	background-image: url('https://i.csspanel.dev/maps/de_nuke?width=1200');
	background-size: cover;
}
```

```jsx
// React / Next.js
<img src={`https://i.csspanel.dev/maps/${map}?width=400`} alt={map} loading="lazy" />
```

```php
<?php
// PHP (CSS-Panel and friends) — safe for any map name coming out of your server logs
function map_image(string $map, int $width = 400, string $fallback = 'de_dust2'): string {
    return 'https://i.csspanel.dev/maps/' . rawurlencode($map)
         . '?width=' . $width . '&fallback=' . $fallback;
}
?>
<img src="<?= map_image($server['map'], 400) ?>" alt="<?= htmlspecialchars($server['map']) ?>">
```

Because a missing map returns `404`, the `fallback` parameter is the important one for
live server lists: players load custom maps you've never heard of, and you still want a
picture in that card.

---

## API reference

Base URL: `https://i.csspanel.dev` (or your own host if you self-host).

### `GET /maps/{name}`

Returns the map image as `image/webp`.

| Parameter  | Type   | Description                                                                                     |
| ---------- | ------ | ----------------------------------------------------------------------------------------------- |
| `name`     | path   | Map name, e.g. `de_dust2`. Case-insensitive; a trailing `.webp` is accepted and ignored.         |
| `width`    | query  | Resize to this width, aspect ratio preserved. Clamped to `2000`.                                 |
| `height`   | query  | Resize to this height, aspect ratio preserved. Clamped to `2000`.                                |
| `fallback` | query  | Map name to serve instead when `name` doesn't exist. Still `404`s if the fallback is missing too.|

Behaviour worth knowing:

- If neither `width` nor `height` is given, the image is served at **400px wide**.
- Images are **never upscaled** past the stored master (max 2000px on the longest side).
- Names are normalized to `[a-z0-9_-]`, so `De_Dust2`, `de_dust2` and `de_dust2.webp` all
  resolve to the same image.
- `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` plus an `ETag`
  keyed on the source image **and** the requested size, so `If-None-Match` gets you a `304`.
- CORS is open, so `<canvas>`/`fetch` usage from your own domain works.

**Status codes:** `200` image · `304` not modified · `400` invalid name · `404` map not found.

### `GET /maps`

Returns every available map as JSON:

```json
[
	{ "name": "de_dust2", "fileName": "de_dust2.webp" },
	{ "name": "cs_office", "fileName": "cs_office.webp" }
]
```

Useful for building a map picker, or for pre-caching the list of maps you can rely on.

---

## Contributing maps

Missing a map? Upload it at **https://upload.csspanel.dev/upload** — drag in one or many
images, rename them to the exact map name (`de_dust2`, `zm_dust_arena`, …), and submit.

Every upload goes into a **pending review queue**; an admin approves it before it becomes
publicly available. Uploads are validated on arrival:

| Rule                | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| Files per batch     | unlimited — sent in several requests behind the scenes  |
| Max file size       | 10 MB decoded, per file (the web UI caps at 5 MB)       |
| Minimum resolution  | 400px on the longest side — smaller is rejected        |
| Duplicates          | flagged, not silently dropped — see below              |
| Stored format       | WebP, quality 90, downscaled to max 2000px             |

**Maps that already exist.** Before anything is sent, the page checks each name against
the maps already served and the ones already in the queue, and tells you what you're up
against — the current resolution and file size, with a link to open the current image. If
your version has more pixels it's submitted as a replacement by default (you're improving
a lower quality map). If it's the same or worse, it's held back with the reason spelled
out — tick the box on the card and it goes in anyway, lower resolution and all. Nothing
you upload can overwrite a live map on its own: a replacement is queued for review like
any other upload, and only an admin approving it does the overwriting.

Anything you upload becomes available to everyone using the API — that's the point.

---

## Self-hosting

You don't have to use `i.csspanel.dev`. The whole thing is a Bun monorepo you can run on
your own box with your own bucket and your own review queue.

### Stack

| Part      | Tech                                                              |
| --------- | ----------------------------------------------------------------- |
| Backend   | [Bun](https://bun.sh) + [Elysia](https://elysiajs.com) + `sharp`  |
| Frontend  | Next.js 14 (App Router) + Mantine + Tailwind                      |
| Storage   | Cloudflare R2 (any S3-compatible bucket works via the AWS SDK)    |
| Type-safe client | Eden Treaty (`packages/backend-api`) shares backend types with the frontend |

### Prerequisites

- **Bun** ≥ 1.1.12 (this repo is Bun-only — npm/yarn/pnpm are blocked in `engines`)
- Node ≥ 20 (for `sharp` native builds)
- A Cloudflare R2 bucket with a public URL (or any S3-compatible storage + credentials)

### 1. Install

```bash
git clone <your-fork> images && cd images
bun install
```

### 2. Configure

`apps/backend/.env`:

```ini
WEBSITE_URL   = "localhost:3000"   # frontend origin; also where GET / redirects to
API_PORT      = 5555               # defaults to 6000 if unset
SECRET        = "change-me"        # JWT signing secret (defaults to "abcd" — don't ship that)

# Only if the frontend and the API are on different registrable domains.
# Defaults to "lax"; "none" forces Secure, so it needs HTTPS on both ends.
COOKIE_SAMESITE = "none"

ADMIN_USERNAME = "admin"           # the single admin account
ADMIN_PASSWORD = "admin"

# Cloudflare R2
R2_ACCOUNT_ID        = "..."
R2_ACCESS_KEY_ID     = "..."
R2_SECRET_ACCESS_KEY = "..."
R2_BUCKET_NAME       = "csspanel"
R2_PUBLIC_URL        = "r2.example.dev"   # public hostname of the bucket, no scheme
```

`apps/frontend/.env`:

```ini
WEBSITE_NAME        = "CSS-Panel | Images"
NEXT_PUBLIC_DOMAIN  = "http://localhost:3000"
NEXT_PUBLIC_MAXSIZE = "5MB"          # client-side upload cap shown in the dropzone
API                 = "http://localhost:5555"   # backend base URL
```

> ⚠️ `API` is **inlined at build time** (`next.config.js` → `env`). If you change it you
> must rebuild the frontend, not just restart it.

### 3. Run

```bash
bun dev             # backend + frontend together
bun frontend:dev    # just Next.js  → http://localhost:3000
bun backend:dev     # just Elysia   → http://localhost:5555
```

Production:

```bash
bun run build       # builds backend bundle + Next.js
bun start           # runs both
```

Other scripts: `bun typecheck`, `bun lint`, `bun lint:fix`, `bun format:fix` (Biome — tabs,
single quotes, no semicolons, 120 cols).

### 4. Approve uploads

1. Open `/login` on the frontend and sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. `/admin` lists the pending queue with previews. Rename, approve one by one, approve all,
   or delete.
3. Approving copies the object to the bucket root as `{name}.webp` and drops the pending copy.
4. Uploads whose name is already taken — by a live map, or by another upload in the queue —
   are marked **Replaces existing map** and left out of *Approve all*, so a bulk approval
   can never overwrite a map you didn't look at. Approving one opens the current image and
   the new one side by side with both resolutions, and says so plainly when the replacement
   is the *worse* of the two. `POST /admin/:image` enforces this server-side as well: it
   answers `409` unless the request explicitly passes `replace`.

### Bucket layout

There's no database — the bucket *is* the state:

```
your-bucket/
├── de_dust2.webp        ← approved, publicly servable
├── cs_office.webp
└── pending/
    └── 1735212345678-----zm_dust_arena.webp   ← awaiting review ({timestamp}-----{name}.webp)
```

Approved maps live at the root; the listing endpoint uses a `/` delimiter so `pending/`
never leaks into public results.

### Tuning

All the size/quality knobs are in
[apps/backend/utils/constants/Files.ts](apps/backend/utils/constants/Files.ts):

| Constant                | Default | Meaning                                       |
| ----------------------- | ------- | --------------------------------------------- |
| `MIN_DIMENSION`         | 400     | Reject uploads smaller than this              |
| `MASTER_MAX_DIMENSION`  | 2000    | Downscale the stored master to this           |
| `MASTER_WEBP_QUALITY`   | 90      | Quality of the stored master                  |
| `MAX_UPLOAD_BYTES`      | 10 MB   | Per-file decoded upload cap                   |
| `MAX_SERVE_DIMENSION`   | 2000    | Clamp for requested `width`/`height`          |
| `DEFAULT_WIDTH`         | 400     | Used when no size is requested                |
| `SERVE_WEBP_QUALITY`    | 82      | Quality of the on-the-fly resized output      |

### Deploying

Before you ship it: **[known-issues.md](known-issues.md)** collects the deployment traps and
runtime caveats — two-service setup, why `API` must be rebuilt rather than restarted, the
admin-cookie domain scope that causes `401`s in production, frozen lockfiles, `sharp` native
rebuilds, and where type errors actually surface. Reading it will save you a few confused
build failures.

### Project structure

```
apps/
├── backend/            Elysia API
│   ├── routes/
│   │   ├── maps/       public: list maps, serve resized images
│   │   ├── upload/     public: submit maps for review
│   │   ├── admin/      protected: pending queue, approve, delete
│   │   └── auth/       admin login + session check
│   ├── middlewares/    isAdmin (JWT cookie)
│   └── utils/lib/r2/   R2 get / upload / copy / delete helpers
└── frontend/           Next.js app
    └── app/
        ├── (main)/     docs + URL builder, /maps gallery, /upload, /login
        └── admin/      review queue
packages/
└── backend-api/        Eden Treaty client, shares backend types with the frontend
```

---

## License

Part of the [CSS-Panel](https://csspanel.dev) ecosystem. Map images are contributed by the
community and reviewed before publication; if you own an image and want it removed, open an
issue.
