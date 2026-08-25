import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
    process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const attemptsCache = new Map();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = attemptsCache.get(ip);

    if (!entry || now > entry.resetAt) {
        attemptsCache.set(ip, {
            count: 1,
            resetAt: now + WINDOW_MS,
        });

        return true;
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return false;
    }

    entry.count += 1;
    return true;
}

function getRedis() {
    if (!REDIS_URL) {
        return null;
    }

    if (!globalThis.__userfxVerifyRedis) {
        globalThis.__userfxVerifyRedis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            connectTimeout: 10000,
        });
    }

    return globalThis.__userfxVerifyRedis;
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Method not allowed.",
        });
    }

    const ip = String(
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        ""
    )
        .split(",")[0]
        .trim();

    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            ok: false,
            error: "Too many attempts. Please refresh the page.",
        });
    }

    try {
        const body =
            typeof req.body === "string"
                ? JSON.parse(req.body)
                : req.body || {};

        const safePrefix = String(body.prefix || "")
            .trim()
            .toUpperCase()
            .replace(/-+$/, "");

        const safeSuffix = String(body.suffix || "")
            .trim()
            .toUpperCase();

        if (!/^(FX01|AX01|VIPX)$/.test(safePrefix)) {
            return res.status(400).json({
                ok: false,
                error: "Invalid prefix.",
            });
        }

        if (!/^[A-HJ-NP-Z2-9]{4}$/.test(safeSuffix)) {
            return res.status(400).json({
                ok: false,
                error: "The suffix must be 4 valid characters.",
            });
        }

        const redis = getRedis();

        if (!redis) {
            return res.status(500).json({
                ok: false,
                error: "Missing REDIS_URL on server.",
            });
        }

        const fullCode = `${safePrefix}-${safeSuffix}`;
        const redisKey =
            `${CODE_ENGINE_NAMESPACE}:code:${fullCode}`;

        const rawRecord = await redis.get(redisKey);

        if (!rawRecord) {
            return res.status(401).json({
                ok: false,
                error: "Invalid code.",
            });
        }

        let record;

        try {
            record = JSON.parse(rawRecord);
        } catch {
            return res.status(500).json({
                ok: false,
                error: "Invalid access record.",
            });
        }

        if (record.status !== "active") {
            return res.status(403).json({
                ok: false,
                error: "This code is no longer active.",
            });
        }

        return res.status(200).json({
            ok: true,
            code: fullCode,
            planId: record.planId,
            plan: record.plan,
            days: record.days,
        });
    } catch (error) {
        console.error("VERIFY CODE ERROR", error);

        return res.status(500).json({
            ok: false,
            error: "Server connection error.",
        });
    }
}