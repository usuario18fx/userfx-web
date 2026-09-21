import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function localPrivateRoomSession() {
  return {
    name: "userfx-local-private-room-session",
    configureServer(server) {
      server.middlewares.use("/api/miniapp-track", (req,res,next) => {
        if (req.method !== "POST") return next();

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ok:true,local:true}));
      });

      server.middlewares.use("/api/access-session", (req,res,next) => {
        if (req.method !== "GET") return next();

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({
          authenticated: true,
          planId: "vip",
          accessMode: "telegram_identity",
          accessLabel: "SPCL",
          memberAccess: true,
          unlimitedAccess: true,
          remainingAccesses: null,
          expiresAt: "2099-12-31T23:59:59.000Z",
        }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(),localPrivateRoomSession()],
  resolve: {
    extensions: [".mjs", ".js", ".mts", ".ts", ".tsx", ".jsx", ".json"],
  },
});
