# Restore USER FX on Windows

This repository contains the website, Telegram bot source and tracked public assets. Files that were only on the old laptop and never committed are not included. Private albums and service credentials are stored separately.

## Download and run the website

Install Git and Node.js LTS if they are missing, then open a new PowerShell window. Use an empty destination folder:

```powershell
New-Item -ItemType Directory -Force C:\Projects | Out-Null
Set-Location C:\Projects
git clone https://github.com/usuario18fx/userfx-web.git userfx-web
if ($LASTEXITCODE -ne 0) { throw "Clone failed. Stop here and check GitHub access." }
Set-Location C:\Projects\userfx-web
npm ci
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173. This runs the frontend. Protected sessions, payments, the bot and private albums require their server services; Vite does not grant a test membership.

## Restore the Vercel connection

In a second PowerShell window:

```powershell
Set-Location C:\Projects\userfx-web
npx vercel login
npx vercel link
npx vercel env pull .env.local --environment=development
```

When linking, select the existing project that owns user18fx.com. Do not create a replacement project. Environment variables must exist for Development in that project to be downloaded. Never commit .env.local or paste its contents into a message.

For local serverless API development, stop Vite and use `npx vercel dev`. Telegram webhook delivery still requires a publicly reachable HTTPS URL; a local frontend is not a running public bot.

## Save future changes

```powershell
git status
git add components public index.html lib api
git diff --cached --stat
git commit -m "Update USER FX website"
git push origin main
```

Review the staged files before committing. To download subsequent changes on a clean checkout, run `git pull --ff-only origin main`.

## Build and publish

```powershell
npm run build
if ($LASTEXITCODE -eq 0) { npx vercel --prod }
```
