import "dotenv/config";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const { Pool } = pg;

const db = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
    return;
  }

  try {
    const { code } = req.body ?? {};

    if (!code || typeof code !== "string") {
      res.status(400).json({
        ok: false,
        error: "Invalid access code",
      });
      return;
    }
const cleanCode = code.trim().toUpperCase();

const result = await db.query(
  `
  select user_id, code, code_suffix, plan, expires_at
  from access_codes
  where code_suffix = $1
  order by created_at desc
  limit 1
  `,
  [cleanCode]
);
    const cleanCode = code.trim().toUpperCase();

    const result = await db.query(
      `
      select
        user_id,
        code,
        plan,
        expires_at
      from access_codes
      where code = $1
      limit 1
      `,
      [cleanCode]
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        ok: false,
        error: "That code doesn't exist",
      });
      return;
    }

    const row = result.rows[0];
    const expiresAt = new Date(row.expires_at);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      res.status(403).json({
        ok: false,
        error: "This code has expired",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Access unlocked",
      plan: row.plan,
      expires_at: row.expires_at,
    });
  } catch (error) {
    console.error("UNLOCK ERROR:", error);

    res.status(500).json({
      ok: false,
      error: "Something went wrong",
    });
  }
}