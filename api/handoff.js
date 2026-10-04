          import crypto from "crypto";
          import Redis from "ioredis";

          const REDIS_URL = process.env.REDIS_URL;
          const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
          const SESSION_COOKIE = "userfx_vault_session";
          const HANDOFF_TTL_SECONDS = 5 * 60;
          const CANONICAL_ORIGIN = String(process.env.USERFX_CANONICAL_URL || "https://user18fx.com").replace(/\/$/, "");

          function getRedis() {
            if (!REDIS_URL) throw new Error("Missing REDIS_URL");

            if (!globalThis.__userfxRedis) {
              globalThis.__userfxRedis = new Redis(REDIS_URL, {
                lazyConnect: true,
                enableReadyCheck: false,
                maxRetriesPerRequest: 1,
                connectTimeout: 10000,
              });

              globalThis.__userfxRedis.on("error", (error) => {
                console.error("[handoff/redis]", error.message);
              });
            }

            return globalThis.__userfxRedis;
          }

          function hashValue(value) {
            return crypto.createHash("sha256").update(String(value)).digest("hex");
          }

          function parseCookies(header) {
            return String(header || "")
              .split(";")
              .reduce((cookies, part) => {
                const separator = part.indexOf("=");
                if (separator < 0) return cookies;

                const name = part.slice(0, separator).trim();
                const value = part.slice(separator + 1).trim();
                if (!name) return cookies;

                try {
                  cookies[name] = decodeURIComponent(value);
                } catch {
                  cookies[name] = value;
                }

                return cookies;
              }, {});
          }

          function getSessionToken(req) {
            const cookies = parseCookies(req.headers.cookie);
            const token = String(cookies[SESSION_COOKIE] || "");
            return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
          }

          function isSecureRequest(req) {
            const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
              .split(",")[0]
              .trim();
            return process.env.NODE_ENV === "production" || forwardedProto === "https";
          }

          function serializeSessionCookie(req, token, maxAge) {
            const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${Math.max(0, Math.floor(maxAge))}`];

  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function remainingSeconds(expiresAt) {
  const ms = Date.parse(String(expiresAt || "")) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
}

const MAX_VOICE_BASE64_LENGTH = 3_500_000;
const FX_VOICE_RATE_LIMIT = 40;
const FX_VOICE_RATE_WINDOW_SECONDS = 60 * 60;

function getVoiceOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload?.output || []) {
    if (item?.type !== "message") continue;

    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        const text = part.text.trim();
        if (text) return text;
      }
    }
  }

  return "";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

async function checkVoiceRateLimit(req) {
  try {
    const redis = getRedis();
    const ipHash = hashValue(getClientIp(req));
    const key = `${CODE_ENGINE_NAMESPACE}:fx-voice-rate:${ipHash}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, FX_VOICE_RATE_WINDOW_SECONDS);
    }

    return count <= FX_VOICE_RATE_LIMIT;
  } catch (error) {
    console.warn("[fx-voice/rate-limit]", error?.message || error);
    return true;
  }
}

async function handleFxVoice(req, res, body) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      code: "OPENAI_API_KEY_MISSING",
      error: "FX voice backend is waiting for OPENAI_API_KEY.",
    });
  }

  const allowed = await checkVoiceRateLimit(req);

  if (!allowed) {
    return res.status(429).json({
      ok: false,
      error: "FX voice rate limit reached. Try again later.",
    });
  }

  const audioBase64 = String(body?.audioBase64 || "");
  const mimeType = String(body?.mimeType || "audio/mp4");
  const fileName = String(body?.fileName || "fx-voice.m4a");
  const language = String(body?.language || "").trim();

  if (!audioBase64) {
    return res.status(400).json({
      ok: false,
      error: "Audio is required.",
    });
  }

  if (audioBase64.length > MAX_VOICE_BASE64_LENGTH) {
    return res.status(413).json({
      ok: false,
      error: "Audio sample is too large.",
    });
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");

  if (!audioBuffer.length) {
    return res.status(400).json({
      ok: false,
      error: "Audio sample is empty.",
    });
  }

  const transcriptForm = new FormData();
  transcriptForm.append(
    "file",
    new Blob([audioBuffer], { type: mimeType }),
    fileName.includes(".") ? fileName : "fx-voice.m4a",
  );
  transcriptForm.append(
    "model",
    process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
  );

  if (language) {
    transcriptForm.append("language", language);
  }

  const transcriptionResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: transcriptForm,
    },
  );

  const transcriptionPayload = await transcriptionResponse.json().catch(() => ({}));

  if (!transcriptionResponse.ok) {
    console.error("[api/handoff/fx-voice] transcription", {
      status: transcriptionResponse.status,
      error: transcriptionPayload?.error?.message || "unknown",
    });

    return res.status(502).json({
      ok: false,
      stage: "transcription",
      error:
        transcriptionPayload?.error?.message ||
        "FX could not transcribe this audio.",
    });
  }

  const transcript = String(transcriptionPayload?.text || "").trim();

  if (!transcript) {
    return res.status(422).json({
      ok: false,
      stage: "transcription",
      error: "No speech was detected.",
    });
  }

  const responseRequest = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FX_MODEL || "gpt-6-luna",
      instructions:
        "You are FX, pronounced F-X, a personal mobile voice assistant. " +
        "Reply in the same language as the user. Be concise, natural and useful for spoken output. " +
        "Prefer 1 to 3 short sentences. Do not mention transcription, models, APIs or internal reasoning. " +
        "If the request is ambiguous, ask one brief clarifying question.",
      input: transcript,
      reasoning: {
        effort: "none",
      },
      text: {
        verbosity: "low",
      },
      max_output_tokens: 180,
      store: false,
    }),
  });

  const responsePayload = await responseRequest.json().catch(() => ({}));
  const reply = getVoiceOutputText(responsePayload);

  if (!responseRequest.ok || !reply) {
    console.error("[api/handoff/fx-voice] response", {
      status: responseRequest.status,
      error: responsePayload?.error?.message || "empty reply",
    });

    return res.status(200).json({
      ok: true,
      transcript,
      reply: `Te escuché: ${transcript}`,
      degraded: true,
    });
  }

  return res.status(200).json({
    ok: true,
    transcript,
    reply,
    transcriptionModel:
      process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
    responseModel: process.env.OPENAI_FX_MODEL || "gpt-6-luna",
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (!["POST", "GET"].includes(req.method)) {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (req.method === "POST" && body?.action === "fx_voice") {
      return await handleFxVoice(req, res, body);
    }

    const redis = getRedis();

    if (req.method === "POST") {
      const sourceToken = getSessionToken(req);
      if (!sourceToken) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION REQUIRED" });
      }

      const sourceKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(sourceToken)}`;
      const rawSession = await redis.get(sourceKey);
      if (!rawSession) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
      }

      let session;
      try {
        session = JSON.parse(rawSession);
      } catch {
        return res.status(401).json({ ok: false, error: "INVALID ACCESS SESSION" });
      }

      const ttl = remainingSeconds(session.expiresAt);
      if (ttl <= 0 || !/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
      }

      const handoffToken = crypto.randomBytes(32).toString("base64url");
      const handoffKey = `${CODE_ENGINE_NAMESPACE}:handoff:${hashValue(handoffToken)}`;
      const record = {
        purpose: "browser_handoff",
        session,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000).toISOString(),
      };

      await redis.set(handoffKey, JSON.stringify(record), "EX", Math.min(HANDOFF_TTL_SECONDS, ttl));

      return res.status(200).json({
        ok: true,
        url: `${CANONICAL_ORIGIN}/?handoff=${encodeURIComponent(handoffToken)}`,
        expiresIn: Math.min(HANDOFF_TTL_SECONDS, ttl),
      });
    }

    const handoffToken = String(req.query?.token || "").trim();
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(handoffToken)) {
      return res.status(400).json({ ok: false, error: "INVALID HANDOFF TOKEN" });
    }

    const handoffKey = `${CODE_ENGINE_NAMESPACE}:handoff:${hashValue(handoffToken)}`;

    const rawRecord = await redis.eval(
      `
                  local current = redis.call("GET", KEYS[1])
                  if not current then return false end
                  redis.call("DEL", KEYS[1])
                  return current
                `,
      1,
      handoffKey,
    );

    if (!rawRecord) {
      return res.status(401).json({ ok: false, error: "HANDOFF EXPIRED OR ALREADY USED" });
    }

    let record;
    try {
      record = JSON.parse(rawRecord);
    } catch {
      return res.status(401).json({ ok: false, error: "INVALID HANDOFF" });
    }

    if (record?.purpose !== "browser_handoff" || !record?.session) {
      return res.status(401).json({ ok: false, error: "INVALID HANDOFF" });
    }

    const session = record.session;
    const ttl = remainingSeconds(session.expiresAt);
    if (ttl <= 0 || !/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
      return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
    }

    const newToken = crypto.randomBytes(32).toString("base64url");
    const newSessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(newToken)}`;

    await redis.set(newSessionKey, JSON.stringify(session), "EX", ttl);
    res.setHeader("Set-Cookie", serializeSessionCookie(req, newToken, ttl));

    return res.status(200).json({
      ok: true,
      authenticated: true,
      planId: session.planId,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("[api/handoff]", error);
    return res.status(500).json({ ok: false, error: "HANDOFF SERVER ERROR" });
  }
}
