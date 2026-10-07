# RIWAYAT — ethnic-wear catalogue & owner’s studio

A Next.js App Router / TypeScript application with MongoDB-native persistence, Zod validation, Cloudinary media services and an authenticated admin portal. The warm ivory, terracotta and teal design follows the supplied reference. A separate browser preview demonstrates the visual experience with browser-local sample data; it is not this backend and is not a secure admin portal.

## Honest delivery status

Source is provided, not a deployed or production-certified service. Strict TypeScript checking passed against manually staged package types; all 68 TypeScript source files passed syntax/local-import checks, and all 13 validation tests passed. Consult `VERIFICATION.md` for exact scope and limitations. A full npm-installed check, ESLint, Next production build, database integration, live Cloudinary and browser end-to-end tests must still pass in your deployment environment before launch. The authoring environment had Node and Chromium but no npm. No real account credentials were used, and no production database was changed.

**Rotate the database password and Cloudinary API secret pasted into the conversation before configuring this project.** Never paste replacement secrets into source files or a shared chat. Use your hosting provider’s encrypted environment settings.

## What is included

- Public home, shop, categories, product pages, about/contact, wishlist and enquiry bag; no customer login.
- Admin sign-in/out, overview counts, product search/filter/pagination, create/edit/delete/duplicate, optional variants, inventory warnings, media upload/reorder/thumbnail/deletion, categories, homepage and business settings.
- Server-side MongoDB services with UUID IDs, unique SKU reservation, indexes, transactions and optimistic version checks.
- HTTP-only opaque sessions, password hashing, database-backed login rate limits, same-origin mutation protection, strict server validation and reference-aware image deletion.
- Metadata, canonical product/category URLs, sitemap and robots; responsive screen layouts.
- Explicit safe demo seeding, validation tests and opt-in Playwright test suites.

This is a catalogue/enquiry business workflow. The bag does not charge payments, place orders or reserve stock. No payment gateway, shipping/tax engine, customer-account system, transactional email or order-management flow is configured. Those require separate provider/business decisions. Public display prices are major-unit decimals; transaction accounting is out of scope.

## Setup

Use Node.js 22.18+ and npm on your own machine or CI.

1. Copy `.env.example` to `.env.local`. Supply a **new** MongoDB URI, database name, Cloudinary cloud/key/secret and `APP_URL`. `APP_URL` must match the browser origin exactly (for example `http://localhost:3000` in development). Production requires HTTPS.
2. Run `npm install`. Review dependency advisories, generate the actual lockfile and commit it. No invented lockfile is included.
3. Run `npm run setup:db`. Atlas or another replica set is required; standalone MongoDB is rejected. Existing catalog records are not overwritten.
4. Supply `ADMIN_EMAIL` and a unique 12–128-character `ADMIN_PASSWORD`, then run `npm run bootstrap:admin -- --create`. Remove the password environment variable afterward. There is no default admin account or password.
5. Run `npm run dev`, open `/admin`, and populate categories/products/homepage/settings. Customers use `/` without login.

## Validate before deployment

Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Fix all reported issues before claiming a release. Then run `npm start` against a staging database and use `npx playwright install chromium` and `npm run test:e2e`.

Playwright expects a running application; it never auto-starts or provisions one. Set `E2E_BASE_URL` to the staging origin and keep APP_URL identical. Admin tests require `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`. Write tests additionally require `E2E_ALLOW_WRITES=true` and must only target a disposable database. Tests clean up records they create; never point them at production.

For a production-mode local server, APP_URL must use HTTPS; use local TLS or run browser tests against a development server. On Vercel, set the canonical HTTPS deployment origin and production secrets, allow the hosting environment in Atlas network access using an appropriate secured connection arrangement, and deploy only after the checks pass.

## Optional demo

Screenshot-derived crops are included under `public/demo-assets`. They are low resolution and are not launch-quality photography. Verify rights and replace them with original product photos before publishing. Demo labels/prices/stock are illustrative, not business facts.

After database setup, against an otherwise empty development catalog:

`NODE_ENV=development ALLOW_DEMO_SEED=true npm run seed:demo -- --confirm-empty`

Add `--upload` to upload the demo crops to Cloudinary. Local mode is explicitly for development; production-managed uploads always go through Cloudinary. The seed refuses nonempty catalogs and modified content/settings. It does not recreate, reset or overwrite an admin account.

## Owner workflow

1. **Categories:** add collections, upload an image, set display order and visibility.
2. **Products:** add details and SKU; optionally add size/colour variations. Blank variation SKUs are allowed. Variation stock is summed automatically by the form. Publish after adding a photo and selecting an active category.
3. **Homepage:** select featured categories/products and edit hero, artisan stories, banners and gallery. Destination links use local paths such as `/shop`.
4. **Settings:** set logo, contacts, opening hours, currency and SEO defaults. Currency selection does not convert stored prices.
5. **Photos:** upload or remove/reorder photos, then save the record. Removed photos can be permanently deleted using the unused-photo control while the editor remains open. Photos referenced elsewhere cannot be deleted. If you navigate away with orphaned uploads, an operator can safely clean registered assets through the authenticated deletion endpoint; a standalone searchable media-library screen is not included.

Category deletion is blocked while products or homepage references use it. Featured-product deletion is similarly blocked. A 409 version conflict means another administrator changed the record; reload and reconcile instead of overwriting.

## Architecture

`src/app/(store)` holds server-rendered public routes. `src/app/admin/(protected)` checks the session in its server layout. Every protected API operation separately authorizes access. `src/proxy.ts` is only an early navigation check, not the authorization boundary.

The exact REST paths are dispatched by `src/lib/router.ts` through a Node catch-all Route Handler; models/types, database connection, validation, auth, HTTP parsing, media and catalog services remain separate modules. `src/lib/api.ts` is a client fetch utility, not the server dispatcher. See `docs/BACKEND-NOTES.md` for operational details.

Mutation bodies are validated and bounded; JSON is 512 KiB, photos 4 MiB. Hosting request limits may be lower. Uploads accept only decoded JPEG/PNG/WebP and are re-encoded. CSRF checks require the configured Origin and same-origin HTTP-only session cookie. Public reads deliberately include catalogue SKUs, stock and display fields, not admin credentials, password hashes, sessions or environment variables.

## Remaining release responsibilities

Run the full checks and security review; verify live image upload/replace/delete; test concurrent inventory/category edits; confirm contact details and business content; replace reference crops; configure backups, monitoring, trusted-proxy/network restrictions and restore procedures. Review accessibility with keyboard/screen-reader users. No audit certification or uptime guarantee is implied by generated source.
