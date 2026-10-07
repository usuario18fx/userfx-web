import { loadEnv } from "vite";

// Vite does not execute Vercel API files. Reuse the real vault and room
// handlers locally so the access gate and RoomFX validate the same cookie.
export function roomFxApi() {
  return {
    name: "userfx-room-api",
    async configureServer(server) {
      const environment = loadEnv(server.config.mode, server.config.envDir, "");
      for (const name of ["REDIS_URL", "CODE_ENGINE_NAMESPACE", "ROOMFX_ICE_SERVERS", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_USER_ID", "USERFX_CANONICAL_URL", "BLOB_READ_WRITE_TOKEN"]) {
        const value = String(process.env[name] || environment[name] || "").trim();
        if (process.env[name] !== undefined || environment[name] !== undefined) process.env[name] = value;
      }
      const unavailable = ["REDIS_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((name) => {
        const value = String(process.env[name] || "");
        return !value || /^\[SENSITIVE\]$/i.test(value);
      });
      if (unavailable.length) {
        server.config.logger.warn(`[userfx-local-api] Missing local credentials: ${unavailable.join(", ")}. Check .env.local; a [SENSITIVE] placeholder is not a usable credential. SPCL requires all three variables.`);
      }
      const paths = ["account", "access-session", "verify", "identity", "telegram-eligibility", "handoff", "private-media", "admin-runtime"];
      const handlers = new Map(await Promise.all(paths.map(async (name) => [`/api/${name}`, (await import(`../api/${name}.js`)).default])));
      handlers.set("/api/room-live", handlers.get("/api/account"));
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const handler = handlers.get(url.pathname);
        if (!handler) return next();
        // A browser opened from another origin must not mutate local sessions.
        if (!["GET", "HEAD"].includes(req.method) && req.headers.origin) {
          let originHost;
          try { originHost = new URL(req.headers.origin).host; } catch {}
          if (originHost !== req.headers.host) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end('{"error":"Request origin is not allowed."}');
            return;
          }
        }
        req.query = Object.fromEntries(url.searchParams);
        if (url.pathname === "/api/room-live") req.query.roomfx = "1";
        if (["POST", "PATCH"].includes(req.method)) {
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 40000) {
              res.statusCode = 413;
              res.end('{"error":"Request too large."}');
              return;
            }
          }
          req.body = body;
        }
        res.status = (status) => {
          res.statusCode = status;
          return res;
        };
        res.send = (value) => res.end(value);
        res.json = (value) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(value));
        };
        try { await handler(req, res); }
        catch (error) {
          server.config.logger.error(`[userfx-local-api] ${error.message}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.json({ error: "The local API could not complete this request." });
          } else if (!res.writableEnded) res.end();
        }
      });
    },
  };
}
