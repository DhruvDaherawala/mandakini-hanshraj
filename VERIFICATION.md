# Riwayat — verification and release status

Assessment date: October 7, 2026 (Asia/Kolkata).

## Delivery status

This is a source implementation and a separate interactive visual preview. It is **not a deployed, fully integration-tested or production-certified platform**. Do not treat browser-local preview interactions as proof of database writes, authentication or Cloudinary integration.

## Checks actually executed

| Check | Observed result |
| --- | --- |
| Project assembly | 78 authored source/config/documentation files before this report, test transcript and demo images were added; no duplicate source paths |
| Strict TypeScript | `tsc --noEmit --pretty false` exited 0 |
| TypeScript syntax | 68 `.ts`/`.tsx` source files, zero syntax errors |
| Local imports | Zero unresolved relative or `@/` imports |
| Validation tests | 13 tests passed; zero failed or skipped |
| Environment example | All non-comment environment values are blank; no real credentials supplied |
| Source package JSON | Parsed successfully |
| Interactive preview visual review | Three rendered pages reviewed; final review reported no overlapping/clipped content or duplicate photograph captions/heart controls |

The exact compiler/test transcript is included in `docs/qa-results.txt`.

### How local checks were run

The isolated environment had Node.js v26.10.0 but no npm. Official package tarballs were downloaded and manually staged for TypeScript checking. This was **not** a complete npm installation, a generated lockfile, or a production Next build. TypeScript 5.9.3 checked the authored strict configuration with the real public types from Next 16.4.0, React 19 typings, Node 22 typings, MongoDB 6.20.0, Zod 4.0.0, Cloudinary 2.7.0, Sharp 0.34.3 and Playwright 1.55.0, plus supporting type packages. `skipLibCheck` follows the project configuration. Generated `.next` route types do not exist until Next is built.

The three authored validation/default/test TypeScript files were transpiled with TypeScript to CommonJS in a scratch directory. Node's test runner executed that JavaScript against the staged Zod runtime. No database, Cloudinary account or real user credentials were involved.

### What the tests cover

SKU normalization/defaults; strict rejection of unknown/server-controlled fields; finite nonnegative two-decimal money; whole-number stock; published-image/thumbnail requirements; valid discounts; variation stock totals/IDs/options/SKU uniqueness; optional blank variation SKUs; update versions; query bounds/enums; unsafe URL/image-host rejection; duplicate featured references; and category/attribute validation.

### Issues found and resolved

- Four initial MongoDB replacement-document TypeScript errors were corrected by leaving immutable `_id` out of content/settings replacement bodies. The re-run passed.
- The server API dispatcher was separated from the client fetch helper and the route import corrected.
- An anonymous `/admin` redirect loop was corrected. The proxy is only an early navigation check; protected layouts and API operations verify sessions independently.
- Empty admin filter values were aligned with the server's enum schema; category filtering and admin content reads were connected to their authenticated endpoints.
- Product/variation SKU handling and image-count limits were aligned between forms and server validation.
- A redundant newline-edit attempt was rejected because the source already contained the correct escaped newlines. Inspection confirmed no change was needed; no failed edit was included as completed work.

## Not executed — release gates

- Full `npm install`, lockfile generation and dependency/security audit.
- ESLint and `next build`; npm was unavailable and the QA dependency staging was intentionally incomplete.
- MongoDB connection, index creation, replica-set transactions, actual CRUD, concurrent-write conflicts, SKU reservations, session expiry/revocation or rate-limit persistence.
- Real Cloudinary upload, replacement, deletion, reference checks and retry/failure behavior.
- Playwright against the Next app: login/logout, CRUD, tablet/mobile/desktop layouts, keyboard behavior and actual browser-console errors.
- Production hosting, HTTPS origin configuration, network access, monitoring, backups and recovery.

The interactive preview's visual review does not replace responsive testing of the Next application. The Next implementation and the standalone preview are separate deliverables with different persistence mechanisms.

## Required launch procedure

1. Rotate the MongoDB password and Cloudinary secret exposed in the original conversation. Configure replacement secrets privately; never reuse the pasted values.
2. Install packages on Node.js 22.18+ and commit the real lockfile. Review dependency advisories.
3. Configure `.env.local` or hosting secrets from `.env.example`; set the exact `APP_URL` origin and a disposable replica-set database for staging.
4. Run setup and explicit administrator bootstrap as documented. There is no hard-coded login.
5. Execute tests, strict typecheck, lint and production build; fix every failure.
6. Start the app and run the supplied Playwright suites. Write tests require explicit `E2E_ALLOW_WRITES=true` and a disposable database.
7. Manually verify Cloudinary with new credentials, including removal from records before permanent deletion and failure/retry behavior.
8. Replace low-resolution screenshot crops, verify image rights, enter real business/product/contact information and review accessibility.
9. Configure production backups, monitoring, network restrictions and restore procedures; deploy only after the release gates pass.

## Product boundaries

The public bag is an enquiry aid, not checkout, payment, order creation or inventory reservation. The shop confirms final price and availability. Optional demo content is illustrative and isolated behind an explicit empty-database seed. Uploaded production images use Cloudinary; bundled local images are development-only seed assets. A standalone searchable media-library screen, order-management workflow and payment provider are not included.
