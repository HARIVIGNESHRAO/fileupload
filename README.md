# Shared File Desk (TypeScript)

Same app as before, in TypeScript: drop a JPG or PDF, everyone who loads the
page sees the same shared list, because uploads are saved on the server.

## Files

- `app/page.tsx` — the page: dropzone + gallery, polls every 8s for new uploads
- `app/api/upload/route.ts` — receives the file, validates it, saves to `public/uploads/`, appends metadata to `data/files.json`
- `app/api/files/route.ts` — returns the current list from `data/files.json`
- `lib/types.ts` — shared `FileEntry` type used by the page and both routes

## Install into a project

1. `npx create-next-app@latest my-app --typescript` (choose App Router)
2. Copy `app/page.tsx`, `app/api/upload/`, `app/api/files/`, and `lib/types.ts` into your project, overwriting the starter `app/page.tsx`
3. Make sure `tsconfig.json` has the `@/*` path alias (create-next-app sets this up by default):
   ```json
   "paths": { "@/*": ["./*"] }
   ```
4. `npm run dev`

The `public/uploads/` and `data/` folders are created automatically on first upload.

## Notes

Same limits and caveats as the JS version:
- `.jpg`/`.jpeg` and `.pdf` only, 10 MB max — edit `ACCEPTED_TYPES` / `MAX_SIZE`
  in `page.tsx` and `upload/route.ts` to change
- `data/files.json` is a flat file, fine for a small tool or demo; move to a
  real database + blob storage (S3, R2) as you scale
- **Serverless caveat:** the filesystem is ephemeral/read-only on Vercel and
  similar platforms in production. This runs as-is on a normal Node server or
  locally — swap the `fs` calls for real storage before deploying serverless.