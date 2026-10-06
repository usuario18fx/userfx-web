          import { defineConfig } from "vite";
          import react from "@vitejs/plugin-react";
import { roomFxApi } from "./scripts/roomfx-vite.mjs";

          function localMiniappTracking() {
            return {
              name: "userfx-local-miniapp-tracking",
              configureServer(server) {
                server.middlewares.use("/api/miniapp-track", (req, res, next) => {
                  if (req.method !== "POST") return next();

                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json; charset=utf-8");
                  res.setHeader("Cache-Control", "no-store");
                  res.end(JSON.stringify({ ok: true, local: true }));
                });
              },
            };
          }

          export default defineConfig({
            plugins: [react(), roomFxApi(), localMiniappTracking()],
            resolve: {
              extensions: [".mjs", ".js", ".mts", ".ts", ".tsx", ".jsx", ".json"],
            },
          });
