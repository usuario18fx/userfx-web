import crypto from "node:crypto";
import { Readable } from "node:stream";
import { get } from "@vercel/blob";
import sharp from "sharp";
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

const PLAN_TO_PREFIX = Object.freeze({
  basic: "BSIC",
  pro: "PRX0",
  vip: "VIPX",
});

const WATERMARK_PLANS = new Set(["pro", "vip"]);

const PRIVATE_PATH_PATTERN =
  /^userfx-album\/(BSIC|PRX0|VIPX)\/(BSIC|PRX0|VIPX)-([0-9]{2})\.jpg$/;

function getRequestedPathname(req) {
  const origin = `https://${req.headers.host || "userfx.local"}`;
  const url = new URL(req.url || "/api/private-media", origin);

  return String(url.searchParams.get("pathname") || "").trim();
}

function getWatermarkId(session) {
  const existing = String(session?.watermarkId || "")
    .trim()
    .toUpperCase();

  if (/^(PRX0|VIPX)-[A-F0-9]{8}$/.test(existing)) {
    return existing;
  }

  const prefix = PLAN_TO_PREFIX[session?.planId] || "USER";
  const codeHash = String(session?.codeHash || "")
    .replace(/[^a-f0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase();

  return `${prefix}-${codeHash || "PRIVATE"}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildWatermarkSvg(width, height, watermarkId) {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const label = escapeXml(`USERFX-${watermarkId}`);
  const fontSize = Math.max(18, Math.round(Math.min(safeWidth, safeHeight) * 0.025));
  const stepX = Math.max(230, Math.round(fontSize * 9.5));
  const stepY = Math.max(115, Math.round(fontSize * 4.8));
  let marks = "";
  let row = 0;

  for (let y = -stepY; y <= safeHeight + stepY; y += stepY) {
    const offset = row % 2 === 0 ? -Math.round(stepX * 0.4) : 0;

    for (let x = offset; x <= safeWidth + stepX; x += stepX) {
      marks += `<text x="${x}" y="${y}" transform="rotate(-12 ${x} ${y})">${label}</text>`;
    }

    row += 1;
  }

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
      <style>
        text {
          fill: rgba(18, 18, 18, 0.20);
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${fontSize}px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
      </style>
      ${marks}
    </svg>
  `);
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of Readable.fromWeb(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function applyWatermark(inputBuffer, watermarkId) {
  const image = sharp(inputBuffer, { failOn: "none" });
  const metadata = await image.metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);

  if (!width || !height) {
    throw new Error("Unable to read image dimensions");
  }

  const overlay = buildWatermarkSvg(width, height, watermarkId);

  return image
    .composite([
      {
        input: overlay,
        top: 0,
        left: 0,
      },
    ])
    .jpeg({
      quality: 92,
      mozjpeg: true,
    })
    .toBuffer();
}

function getBufferEtag(buffer) {
  const digest = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex")
    .slice(0, 32);

  return `"wm-${digest}"`;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Cookie");
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

    const shouldWatermark = WATERMARK_PLANS.has(String(session.planId));
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: shouldWatermark
        ? undefined
        : req.headers["if-none-match"] || undefined,
    });

    if (!result) {
      return res.status(404).send("Not found");
    }

    if (!shouldWatermark) {
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
    }

    if (result.statusCode !== 200 || !result.stream) {
      return res.status(404).send("Not found");
    }

    const original = await streamToBuffer(result.stream);
    const watermarkId = getWatermarkId(session);
    const watermarked = await applyWatermark(original, watermarkId);
    const etag = getBufferEtag(watermarked);

    res.setHeader("ETag", etag);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-UserFX-Watermark", watermarkId);

    if (String(req.headers["if-none-match"] || "") === etag) {
      return res.status(304).end();
    }

    return res.status(200).send(watermarked);
  } catch (error) {
    console.error("[api/private-media]", error);
    return res.status(500).send("Server connection error");
  }
}
