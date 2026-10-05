import { loadEnv } from "vite";

// Vite doesn't execute Vercel's /api directory. Load only the RoomFX endpoint
// here; production still uses the exported, authenticated Vercel handler.
export function roomFxApi() {
  return {
    name: "userfx-room-api",
    async configureServer(server) {
      const environment = loadEnv(server.config.mode, server.config.envDir, "");
      for (const name of ["REDIS_URL", "CODE_ENGINE_NAMESPACE", "ROOMFX_ICE_SERVERS"]) {
        if (environment[name] && !process.env[name]) process.env[name] = environment[name];
      }
      const { default: handler } = await import("../api/room-live.js");
      const { default: accountHandler } = await import("../api/account.js");
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        if (!["/api/room-live", "/api/account"].includes(url.pathname)) return next();
        req.query = Object.fromEntries(url.searchParams);
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
        res.json = (value) => {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(value));
        };
        await (url.pathname === "/api/account" ? accountHandler : handler)(req, res);
      });
    },
  };
}
