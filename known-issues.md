# Known issues & deployment notes

Things that will bite you when you deploy or fork this project, and the reasons behind them.
Most of these were learned the hard way — if something works locally and breaks in
production, start here.

## Deployment

### It's two services, not one

The backend is a Bun process (Elysia); the frontend is a Next.js app. Deploy them separately
and point the frontend's `API` at the backend's public URL. Production runs
`upload.csspanel.dev` (frontend) + `i.csspanel.dev` (API).

### `API` is baked in at build time

`apps/frontend/next.config.js` exposes `API` through Next's `env` block, which **inlines the
value into the bundle at build time**. Changing the environment variable on a running
container does nothing — you have to rebuild the frontend.

### Admin login returns 401 in production

`POST /auth/login` sets a `secure` JWT cookie scoped to `.{WEBSITE_URL host}` (see
[apps/backend/utils/constants/Domain.ts](apps/backend/utils/constants/Domain.ts)). For the
browser to send that cookie to the API, the API must live on that domain or a subdomain of
it.

So set `WEBSITE_URL` to the **shared parent domain** (e.g. `csspanel.dev`), not the frontend
subdomain — with `WEBSITE_URL=upload.csspanel.dev` the cookie is scoped to
`.upload.csspanel.dev` and never reaches `i.csspanel.dev`, and every admin request comes back
`401`.

Related: the cookie is `secure`, so admin login only works over HTTPS (localhost is exempt,
being treated as a secure context by browsers).

### Pin your dependencies / use a frozen lockfile

Remote builders that re-resolve `^` ranges instead of honouring `bun.lockb` will drift the
Elysia family to a newer major with breaking changes — this repo already got bitten by
Elysia 1.3 renaming the context's `error` to `status`, which fails the build with type errors
that never appear locally. That's why `elysia` is pinned to an exact version in the root
`package.json`.

Use `bun install --frozen-lockfile` in your build phase. On Nixpacks:

```toml
# nixpacks.toml
[phases.install]
cmds = ["bun install --frozen-lockfile"]
```

There is currently **no** `nixpacks.toml` or `Dockerfile` in the repo — add one for your own
platform.

### `sharp` needs a native rebuild on the target platform

The backend's `postinstall` runs `npm rebuild sharp`, and `@img/sharp-linux-arm64` /
`@img/sharp-libvips-linux-arm64` are listed as optional dependencies for ARM Linux hosts. If
the API boots but every image request 500s, this is almost always the cause.

## Build & type-checking

### Backend type errors surface in the *frontend* build

`bun backend:build` is `bun build`, which does **no type-checking**. The frontend, on the
other hand, imports the backend's Elysia `App` type through the `backend-api` workspace
package (Eden Treaty, see [apps/frontend/utils/eden.ts](apps/frontend/utils/eden.ts)) — so a
type error in a backend file fails `frontend:build`, in a stack trace that points at the
frontend.

Local `dev` never type-checks either, which is why these only show up in CI/production
builds. To reproduce before pushing:

```bash
cd apps/backend  && bunx --bun tsc --noEmit --skipLibCheck
cd apps/frontend && bunx --bun tsc --noEmit --skipLibCheck
```

Ignore the TS5101/TS5107 deprecation notices about `baseUrl` / `downlevelIteration` /
`moduleResolution` — pre-existing and not build-blocking.

## Runtime limits & gotchas

### `413 Content Too Large` / `502` on a big upload batch — and why the client chunks

Uploads are sent as **base64 inside a JSON body**, which inflates the payload by ~33%. There
are two ceilings on the *request*, both hit before any per-file check runs, and neither of
them reports itself as a per-file problem. Measured against production:

| Request body | Response | Who rejected it                                            |
| ------------ | -------- | ---------------------------------------------------------- |
| ≤ 79 MB      | reaches the app | —                                                   |
| ~85 MB       | `502`    | Bun's `serve.maxRequestBodySize` (80 MB, [app.ts](apps/backend/app.ts)) drops the connection and the proxy reports a bad gateway |
| ≥ 99 MB      | `413`    | **Cloudflare** — 100 MB request cap on the free plan, the API is never reached |

So `413` is not something you can fix in this codebase: it's the CDN in front of it. That's
why the uploader **splits a selection into several requests** of ~8 MB of base64 each
(`BATCH_BASE64_BUDGET` in [apps/frontend/app/(main)/upload/page.tsx](apps/frontend/app/(main)/upload/page.tsx))
instead of sending one giant POST. Consequences worth knowing:

- A file larger than the budget is still sent, **alone in its own request** — whether it's too
  big is the server's per-file decision (`MAX_UPLOAD_BYTES`), not the batcher's.
- If one chunk fails, the others still go through. The files from the failed chunk stay
  selected in the UI so the upload can be retried without re-picking them.
- If you write your own client against `POST /upload`, you have to do your own chunking —
  the limits above are yours to respect.

### Per-file limits vs. what ends up in the bucket

Size enforcement is **per file**, not per batch, in two places: the dropzone rejects files
over `NEXT_PUBLIC_MAXSIZE` (5 MB) client-side, and the upload route rejects individual files
over `MAX_UPLOAD_BYTES` (10 MB decoded) with a reason while the rest of the batch continues.

Note that a large *upload* never becomes a large *object*: the route always re-encodes to WebP
at quality 90, capped at 2000px on the longest side, and stores only that. Real masters in the
production bucket run ~27 KB–400 KB regardless of what was uploaded. Tightening the upload cap
protects bandwidth and CPU, not storage.

### Uploads are processed sequentially

The upload route decodes, validates and re-encodes each image one at a time. A large batch
holds the request open for a while — that's expected, not a hang.

### Images must be returned as a typed `Blob`

Both `GET /maps/:map` and `GET /admin/:image` return `new Blob([buffer], { type: 'image/webp' })`
on purpose. `elysia-compress` detects `image/webp` as non-compressible and passes it through
untouched; returning a raw `Buffer` gets mis-detected as text and Brotli-compressed, which
mangles the `Content-Type`, and a bare `new Response` comes back empty. Don't "simplify" it.

### There's no database — the bucket is the state

Listings come from `ListObjectsV2` on every request. It's paginated and correct, but it means
the maps list gets slower as the bucket grows, and there's no metadata beyond the object keys
themselves. Put a CDN in front of the API (the 24h `Cache-Control` does the rest — the origin
only re-encodes on a cache miss).

### One admin, credentials in env

Auth is a single `ADMIN_USERNAME` / `ADMIN_PASSWORD` pair compared in plaintext, embedded in
the JWT payload, and re-checked against the env on every request. Changing either value
invalidates all existing sessions by design. There are no roles, no multiple users, and no
rate limiting on `/auth/login` — put it behind your own protection if that matters to you.

### Uploads are unauthenticated

Anyone who can reach `POST /upload` can queue images for review. The review queue is the only
gate. If you self-host publicly, expect to need rate limiting in front of it.
