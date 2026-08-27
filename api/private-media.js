import { Readable } from "node:stream";
import { get } from "@vercel/blob";
import { readVaultSession } from "../lib/vault-session.js";

const PLAN_LEVEL = Object.freeze({
  basic: 1,
  pro: 2,
  vip: 3,
});

const PREFIX_TO_PLAN = Object.freeze({
  BSIC: "basic",
  PRX0: "pro",
  VIPX: "vip",
});

const PRIVATE_PATH_PATTERN =
  /^userfx-album\/(BSIC|PRX0|VIPX)\/(BSIC|PRX0|VIPX)-([0-9]{2})\.jpg$/;

function getRequestedPathname(req) {
  const origin = `https://${req.headers.host || "userfx.local"}`;
  const url = new URL(req.url || "/api/private-media", origin);

  return String(url.searchParams.get("pathname") || "").trim();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const pathname = getRequestedPathname(req);
    const pathMatch = pathname.match(PRIVATE_PATH_PATTERN);

    if (!pathMatch || pathMatch[1] !== pathMatch[2]) {
      return res.status(404).send("Not found");
    }

    const requestedPlan = PREFIX_TO_PLAN[pathMatch[1]];
    const session = await readVaultSession(req);

    if (!session) {
      return res.status(401).send("Unauthorized");
    }

    if (PLAN_LEVEL[session.planId] < PLAN_LEVEL[requestedPlan]) {
      return res.status(403).send("Forbidden");
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: req.headers["if-none-match"] || undefined,
    });

    if (!result) {
      return res.status(404).send("Not found");
    }

    res.setHeader("ETag", result.blob.etag);

    if (result.statusCode === 304) {
      return res.status(304).end();
    }

    if (result.statusCode !== 200 || !result.stream) {
      return res.status(404).send("Not found");
    }

    res.setHeader("Content-Type", result.blob.contentType || "image/jpeg");
    res.setHeader("Content-Disposition", "inline");

    return Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error("[api/private-media]", error);
    return res.status(500).send("Server connection error");
  }
}
