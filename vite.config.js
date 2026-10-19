          import { defineConfig } from "vite";
          import react from "@vitejs/plugin-react";

          function localPrivateRoomSession() {
            return {
              name: "userfx-local-private-room-session",
              configureServer(server) {
                server.middlewares.use("/api/miniapp-track", (req, res, next) => {
                  if (req.method !== "POST") return next();

                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.setHeader("Cache-Control", "no-store");
                  res.end(JSON.stringify({ ok: true, local: true }));
                });

                // Vite has no backend session validation: deny access instead of granting a test membership.
                server.middlewares.use("/api/access-session", (req, res, next) => {
                  if (req.method !== "GET") return next();
                  res.statusCode = 401;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.setHeader("Cache-Control", "no-store");
                  res.end(JSON.stringify({
                    authenticated: false,
                    features: { oncam: false, rec: false, chat: false, multimedia: false },
                  }));
                });
              },
            };
          }

          export default defineConfig({
            plugins: [react(), localPrivateRoomSession()],
            resolve: {
              extensions: [".mjs", ".js", ".mts", ".ts", ".tsx", ".jsx", ".json"],
            },
          });
