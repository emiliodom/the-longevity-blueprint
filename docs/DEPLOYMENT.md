# Deployment — Hostinger Node.js Hosting

Hostinger's hPanel supports Node.js apps directly (Business/Cloud/VPS plans) plus a MySQL database service — no Docker or custom buildpack needed. This app is plain Node + Express + static files, so it maps onto that directly.

## 1. Create the MySQL database

In hPanel → **Databases → MySQL Databases**: create a database and a user, and note the four values (host is usually `localhost` from the app's perspective on shared hosting, but check hPanel's connection details — it may give you a specific host):

- Database name
- Database user
- Database password
- Database host

## 2. Create the Node.js application

In hPanel → **Advanced → Node.js**:

1. Create a new application, select a Node version **≥ 18** (repo's `package.json` requires ≥16, but recent `mysql2`/`openai` releases target modern Node — use the newest LTS Hostinger offers).
2. Set the **application root** to the folder you deploy this repo into.
3. Set the **application startup file** to `server.js`.
4. Set the **application URL** to your domain/subdomain.

## 3. Upload the code

Use Hostinger's Git integration (hPanel → Node.js app → "Git" tab) pointed at this repo, or upload via the File Manager / SFTP. Either way, `node_modules/`, `uploads/`, and `.env` should **not** be committed (already gitignored) — Hostinger installs dependencies itself.

## 4. Set environment variables

In the Node.js app's **Environment Variables** panel, set (do not commit these — see `.env.example` for the full list):

| Variable | Value |
|---|---|
| `PORT` | Whatever Hostinger's Node app expects to bind (check the app's assigned port in hPanel — Passenger/Node apps on Hostinger typically inject their own `PORT`; the app already reads `process.env.PORT`) |
| `SESSION_SECRET` | A long random string — generate one, don't reuse the repo default |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | From step 1 |
| `OPENAI_API_KEY` | Your OpenAI platform key |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` (leave unset to use that default) |

## 5. Install dependencies and create the schema

Via hPanel's Node.js app "Run NPM Install" button, or SSH into the account:

```bash
cd ~/path/to/app
npm install
npm run db:setup
```

`db:setup` is safe to re-run — it only ever does `CREATE DATABASE IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` (see `src/server/db/schema.sql`), so re-running it after a later deploy never touches existing data.

## 6. Persistent file storage

`uploads/` (avatars + tracker screenshots) is written to local disk by `multer` — Hostinger's Node app storage persists across restarts (unlike some containerized PaaS), but **does not** persist across a full app re-provision/migration. If you move to a new Hostinger plan/server later, copy `uploads/` over manually, or plan to move screenshot storage to an object store (S3-compatible) at that point — out of scope for the current setup.

## 7. Start the app

hPanel's Node.js app panel starts/restarts the app for you (it runs `npm start` → `node server.js` under the hood). Confirm `GET /api/health` returns `{"ok":true}` once it's running.

## Local development vs. production

The exact same code targets both — only `.env` changes:

| | Local dev | Hostinger |
|---|---|---|
| `DB_HOST`/`DB_PORT` | your local MySQL instance | Hostinger's MySQL host/port from hPanel |
| `SESSION_SECRET` | anything, doesn't matter | a real random secret |
| `OPENAI_API_KEY` | your key (optional while developing UI) | your key (required for the analyzer to work) |

Run `npm run db:setup` once against each target before first use.
