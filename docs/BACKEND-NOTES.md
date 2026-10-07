# Riwayat backend architecture

## Verification status

See the root `VERIFICATION.md` for the final check results. This document describes the backend; the complete source package also includes the public frontend and admin forms. No lockfile is fabricated; generate and commit one after installation.

## Setup

1. Use Node.js 22.18 or newer. The full package includes the frontend, Tailwind stylesheet, backend and setup scripts.
2. Copy `.env.example` to `.env.local`. Supply an Atlas/replica-set URI, database name, canonical APP_URL origin and Cloudinary credentials. Set APP_URL to the origin actually used by the browser, such as your local origin during development; production requires HTTPS. There are no default passwords or copied secrets.
3. Run `npm install`, then `npm run setup:db`. Setup creates indexes, the transaction guard and empty content/settings without replacing existing documents. Standalone MongoDB is deliberately rejected.
4. Set ADMIN_EMAIL and a unique 12–128-character ADMIN_PASSWORD, then run `npm run bootstrap:admin -- --create`. Existing accounts are never overwritten. Remove ADMIN_PASSWORD afterward. This is the production bootstrap path; it does not seed demo catalog records.
5. Run `npm run test`, `npm run typecheck`, `npm run build`, then `npm start`. Inspect and resolve actual results before deployment. Run `npm run dev` for local development.

Database and Cloudinary environment variables are server-only. Never create NEXT_PUBLIC variants of these credentials. Do not commit `.env.local`. Provision least-privilege database credentials and backups separately. The database user needs the index/setup permissions during setup and transaction/read/write permissions during operation.

## Frontend integration

Server-only exports in `src/lib/store.ts`: `getContent()`, `getSettings()`, `getCategories()`, `getProducts(query?: Record<string,string>)`, and `getProduct(slug: string)`. Missing products return null. These readers opt into request-time execution. `requireAdmin(): Promise<{email:string}>` is exported by `src/lib/auth.ts`; use it in protected server layouts/actions as well. Import client-safe types from `src/types.ts`, never server modules into client components.

All API routes are implemented by one Node-runtime catch-all with exact path dispatch. Async route params and async cookies are used. Responses are directly the record, array or specified object; there is no `data` wrapper. Errors are `{error:{code,message}}`. All API responses are no-store. Every admin leaf authorizes independently of the admin-page proxy.

| Endpoint | Methods and contract |
| --- | --- |
| `/api/auth/login` | POST `{email,password}` -> `{email}` and session cookie |
| `/api/auth/logout` | POST with same-origin header -> `{ok:true}`; idempotent when signed out |
| `/api/auth/me` | GET -> `{email}`, otherwise 401 |
| `/api/products` | GET -> `{items,total,page,pages}`; POST editable product fields -> created Product |
| `/api/products/[id-or-slug]` | GET public record; `?admin=1` allows drafts after authentication |
| `/api/products/[id]` | PUT all editable product fields plus current `version`; DELETE JSON `{version}` |
| `/api/products/[id]/duplicate` | POST no body, `{}`, or `{version}` -> independent draft with fresh UUIDs, slug and SKUs |
| `/api/categories` | GET array, `?admin=1` for inactive too; POST editable fields |
| `/api/categories/[id-or-slug]` | GET active category, or authenticated `?admin=1` |
| `/api/categories/[id]` | PUT editable fields plus `version`; DELETE `{version}` |
| `/api/content` | GET SiteContent; `?admin=1` returns unsanitized references to admins; PUT SiteContent with current version |
| `/api/settings` | GET SiteSettings; PUT SiteSettings with current version |
| `/api/upload` | POST FormData `file`, optional `alt` -> ImageAsset; DELETE `{cloudinaryPublicId}` |
| `/api/dashboard` | Authenticated GET `{total,active,outOfStock,lowStock,categories,featured,recent}` |

Product list query parameters: `q`, `category` (UUID or slug), `status=active|draft|all`, `stock=low|out|in|all`, `sort=newest|price-asc|price-desc|name`, `page`, `limit` (1–20), `admin=1`. Default page is 1, limit 12, newest first. Empty results report pages=1. Low stock is 1–5; in stock is any positive stock. Price sorting uses regular price, not discounted price. Search uses an escaped literal substring across names, parent/variant SKUs, tags and matching category names. Category matches are capped at 1,000 and catalog queries have a five-second limit; adopt Atlas Search before growing beyond a local-shop catalogue. Admin mode defaults to all statuses. Public mode only returns active products joined to active categories; requesting draft status without admin access is rejected. Unknown, repeated or invalid parameters are rejected.

PUT is replacement of editable fields, not PATCH: send the complete form state and version, excluding `_id`, `createdAt` and `updatedAt`. Optional discount/variant price is omitted when absent; do not send null. Defaults are defined in Zod. Successful writes increment version. A stale write/delete returns 409 VERSION_CONFLICT; reload and ask the user to reconcile. IDs are UUID strings throughout, never ObjectIds. Category fields contain category UUIDs. Money uses major-unit numbers with at most two decimal places. Product stock must equal summed variant stock when variants exist. Parent and variant SKUs share one globally unique reservation collection.

Every mutation requires an Origin header exactly matching normalized APP_URL. Browsers provide this automatically on same-origin requests; command-line clients must set it explicitly. Requests use same-origin cookies. Login and logout are also origin-checked. Do not add permissive CORS. JSON requests must use application/json; do not manually set Content-Type for browser FormData.

## Security and consistency

Opaque 256-bit session tokens are stored only as SHA-256 hashes. Cookies are HTTP-only, SameSite=Strict, path=/ and secure under HTTPS. Sessions expire absolutely after eight hours; requests independently check expiresAt, active administrator status and sessionVersion. Mongo TTL only cleans up. Increment an administrator's sessionVersion or mark it inactive to revoke its sessions. Authentication fails closed if storage is unavailable.

Login has Mongo-backed fixed 15-minute counters: six attempts per normalized email, 300 globally, and optionally 30 per trusted client IP. TRUSTED_CLIENT_IP_HEADER must remain empty unless your reverse proxy overwrites that header and direct origin access is prevented. Forwarded headers are not trusted by default. Counters include successful attempts and expire via TTL. Missing-account password verification still performs scrypt work. Password hashes use scrypt with random salts and fixed bounded work parameters.

Catalog, global SKU and media-reference mutations use one guard document inside snapshot/majority transactions. All operations inside each transaction are sequential. Every writer, including scripts, must use this protocol; direct database edits bypass its guarantees. Category deletion rejects all product usage, including drafts, and featured-content references. Product deletion rejects featured references. Deactivating a category hides its products publicly without silently rewriting their status. Public content removes inactive featured references.

Uploads are bounded before multipart parsing: 4 MiB image bytes plus 64 KiB envelope; JSON is capped at 512 KiB. JPEG/PNG/WebP bytes are decoded, MIME-checked, pixel-limited, orientation-corrected, metadata-stripped by re-encoding and resized to at most 2000×2000 WebP. SVG, animation and unsafe dimensions are rejected. Also enforce transport/body limits and timeouts at the hosting proxy.

Image fields must exactly match active registry URLs/public IDs; arbitrary hosted URLs cannot be inserted. Alt text remains editable. Deletion checks product galleries, every variant gallery, categories, hero/artisans/banners/gallery and settings logo. The guard atomically marks an unreferenced asset deleting before the external Cloudinary call. New references to deleting images are rejected. Failed destruction remains retryable and blocked for reuse; repeat DELETE. Cloudinary success followed by database failure is also safely retryable. Failed upload-registration cleanup may leave a Cloudinary orphan requiring operator review. Local demo deletion unregisters the asset but does not remove a repository file. Product/category deletion does not automatically destroy images.

## Optional development-only demo

Supply these files in `public/demo-assets`: `hero.webp`, `category-1.webp` through `category-6.webp`, `product-1.webp` through `product-5.webp`, `artisan-1.webp` through `artisan-3.webp`, `style-1.webp` through `style-4.webp`, and `fabric.webp`. Screenshot-derived assets are included in the full project and must be replaced before launch.

On a POSIX shell, explicitly run:

`NODE_ENV=development ALLOW_DEMO_SEED=true npm run seed:demo -- --confirm-empty`

Add `--upload` to upload sanitized copies to Cloudinary instead of registering local demo URLs. Optional `--assets=directory` changes the source directory; local mode still expects those files to be served under `/demo-assets/`. The script checks emptiness before preparing assets and again inside the final transaction, rejects modified content/settings and never resets a database. Existing administrator accounts are allowed. Demo catalog writes are atomic; failed remote preparations attempt reference-safe cleanup. Six categories, five products and clearly illustrative content are created. No fake orders, customer records or payment provider are included.

## Required pre-release checks

In addition to unit tests, test against a disposable Atlas database: session expiry/revocation; untrusted Origins; anonymous admin leaves; inactive category and draft visibility; concurrent stale writes; parent-versus-variant SKU collisions; used-category deletion; every image reference location; concurrent image attachment/deletion; malformed multipart and pixel bombs; seed nonempty guards; and Cloudinary failure/retry behavior. Review demo text/assets, contact information and actual product data before publishing. Validate frontend return URLs as internal paths before using the login `next` parameter.

Implementation references: Next Proxy documentation at https://nextjs.org/docs/app/api-reference/file-conventions/proxy and MongoDB transaction documentation at https://www.mongodb.com/docs/drivers/node/v6.x/crud/transactions/ .

