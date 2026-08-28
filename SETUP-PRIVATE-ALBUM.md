# USERFX private album setup

## 1. Copy the files into the project

Copy the contents of this package into the root of `userfx-web`.

Only this directory remains public:

```text
public/assets/album/PRVW
```

Do not place `BSIC`, `PRX0`, or `VIPX` inside `public`.

The photograph names follow the same prefix as their album:

```text
PRVW/PRVW-01.jpg ... PRVW-07.jpg
BSIC/BSIC-01.jpg ... BSIC-05.jpg
PRX0/PRX0-01.jpg ... PRX0-03.jpg
VIPX/VIPX-01.jpg ... VIPX-04.jpg
```

## 2. Protect the local source photographs

Add this line to `.gitignore` before using `git add`:

```gitignore
private-album-source/
```

The local source folder is used only once to upload the files. Never commit it.

## 3. Install Vercel Blob

```powershell
npm install "@vercel/blob@^2.3.0"
```

## 4. Create and connect a private Blob store

Run this from the linked project:

```powershell
npx vercel blob create-store userfx-private-album --access private
```

When prompted, connect the store to the current Vercel project and include the
development, preview, and production environments.

Pull the new OIDC token locally:

```powershell
npx vercel env pull .env.local --yes
```

New Blob stores use `VERCEL_OIDC_TOKEN` by default. A legacy store may instead
provide `BLOB_READ_WRITE_TOKEN`; the upload script accepts either method.

Confirm that `.env.local` is ignored:

```powershell
git check-ignore .env.local
```

## 5. Upload the 12 protected photographs

```powershell
node --env-file=.env.local .\scripts\upload-private-album.mjs .\private-album-source
```

Expected final message:

```text
Private album ready: 12 files uploaded.
```

## 6. Verify and build

```powershell
npx vercel blob list
npm run build
```

## 7. Commit only safe files

```powershell
git add package.json package-lock.json .gitignore
git add components/VaultHome.tsx
git add api/verify.js api/access-session.js api/private-media.js
git add lib/vault-session.js scripts/upload-private-album.mjs
git add public/assets/album/PRVW
git commit -m "feat: protect plan albums with private Blob storage"
git pull --rebase origin main
git push origin main
```

Verify that `private-album-source` is not staged before committing:

```powershell
git status
```

## Access hierarchy

```text
BSIC / BASIC -> basic only
PRX0 / PRO   -> basic + pro
VIPX / VIP   -> basic + pro + vip
```

Every request to `/api/private-media` validates the server-side Redis session
before Vercel Blob returns the image.
