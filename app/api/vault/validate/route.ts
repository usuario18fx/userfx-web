import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return Response.json(
        { ok: false, error: "missing_code" },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();

    const key = `fx:code:${cleanCode}`;
    const data = await redis.get(key);

    if (!data) {
      return Response.json({
        ok: false,
        valid: false,
        reason: "invalid_code",
      });
    }

    const record = JSON.parse(data);

    // expiración
    if (Date.now() > record.expiresAt) {
      return Response.json({
        ok: false,
        valid: false,
        reason: "expired",
      });
    }

    return Response.json({
      ok: true,
      valid: true,
      code: record.code,
      plan: record.plan,
      planName: record.planName,
      userId: record.userId,
      expiresAt: record.expiresAt,
    });
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: "server_error",
        details: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}