import { Pool } from "pg";
/* Pool único de Postgres (usa `pg`, que ya tienes). Las tablas del chat se crean
 * solas la primera vez (CREATE TABLE IF NOT EXISTS): no necesitas drizzle-kit ni migraciones.*/
const globalForPool = globalThis as typeof globalThis & { __fxChatPool?: Pool; __fxChatReady?: Promise<void> };
function url() {
  const u = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!u) throw new Error("DATABASE_URL (o POSTGRES_URL) no está configurada");
  return u;
  }
export function pool(): Pool {
  if (!globalForPool.__fxChatPool) {
    globalForPool.__fxChatPool = new Pool({ connectionString: url(), max: 5 });
  }
  return globalForPool.__fxChatPool;
  }
const SCHEMA = `
CREATE TABLE IF NOT EXISTS fx_chat_sessions (
  id                SERIAL PRIMARY KEY,
  token             TEXT NOT NULL UNIQUE,
  link_code         TEXT NOT NULL UNIQUE,
  consent_version   TEXT NOT NULL,
  consent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  telegram_chat_id  TEXT,
  telegram_username TEXT,
  linked_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  );
CREATE INDEX IF NOT EXISTS fx_chat_sessions_tg ON fx_chat_sessions (telegram_chat_id);
CREATE TABLE IF NOT EXISTS fx_chat_messages (
  id           SERIAL PRIMARY KEY,
  session_id   INTEGER NOT NULL REFERENCES fx_chat_sessions(id),
  sender       TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'web',
  text         TEXT NOT NULL,
  admin_msg_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
CREATE INDEX IF NOT EXISTS fx_chat_messages_session ON fx_chat_messages (session_id, id);
CREATE INDEX IF NOT EXISTS fx_chat_messages_admin ON fx_chat_messages (admin_msg_id);
  `;
/** Garantiza que las tablas existen (una sola vez por instancia). */
export function ready(): Promise<void> {
  if (!globalForPool.__fxChatReady) {
    globalForPool.__fxChatReady = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        globalForPool.__fxChatReady = undefined;
        throw e;
  });
  }
  return globalForPool.__fxChatReady;
  }