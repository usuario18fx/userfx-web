import { randomBytes } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessCodes, orders, unlocks } from "@/db/schema";
import { getPlan } from "@/lib/plans";

export const SESSION_COOKIE = "vault_session";
export const SESSION_HOURS = 72;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* CODE HELPERS ─────────────────────────── */
export function normalizeCode(raw: string) {
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function roll(len = 4) {
  const buf = randomBytes(len);

  let out = "";

  for (let i = 0; i < len; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }

  return out;
}

/* ─────────────────────────────────────────────
   GENERATE UNIQUE CODE
───────────────────────────────────────────── */

export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = roll(4);

    const existing = await db
      .select({
        id: accessCodes.id,
      })
      .from(accessCodes)
      .where(eq(accessCodes.code, code))
      .limit(1);

    if (existing.length === 0) {
      return code;
    }
  }

  throw new Error("No se pudo generar un código único");
}

/* ─────────────────────────────────────────────
   CREATE ORDER
───────────────────────────────────────────── */

export async function createOrder(planId: string) {
  const plan = getPlan(planId);

  if (!plan) {
    throw new Error(`Plan no encontrado: ${planId}`);
  }

  const payload =
    `${plan.id}-` +
    `${Date.now().toString(36).toUpperCase()}` +
    `${roll(2)}`;

  const [order] = await db
    .insert(orders)
    .values({
      payload,
      planId: plan.id,
      stars: plan.stars,
    })
    .returning();

  return order;
}

/* ─────────────────────────────────────────────
   GET ORDER
───────────────────────────────────────────── */

export async function getOrderByPayload(payload: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.payload, payload))
    .limit(1);

  return order ?? null;
}

/* ─────────────────────────────────────────────
   MARK ORDER PAID
───────────────────────────────────────────── */

/**
 * Idempotente:
 * si la orden ya fue pagada,
 * devuelve el código existente.
 */
export async function markOrderPaid(
  payload: string,
  chatId?: string,
) {
  const order = await getOrderByPayload(payload);

  if (!order) {
    return {
      error: "not_found" as const,
    };
  }

  /* ── Ya pagada ── */

  if (order.status === "paid") {
    const [existing] = await db
      .select()
      .from(accessCodes)
      .where(eq(accessCodes.orderId, order.id))
      .limit(1);

    return {
      order,
      code: existing?.code ?? null,
    };
  }

  /* ── Marcar orden como pagada ── */

  await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      chatId: chatId ?? null,
    })
    .where(eq(orders.id, order.id));

  /* ── Obtener plan ── */

  const plan = getPlan(order.planId);

  if (!plan) {
    throw new Error(
      `Plan no encontrado para la orden: ${order.planId}`,
    );
    }
  /* ── Generar código ── */
  const raw = await generateUniqueCode();
  const fullCode = `${plan.tab}${raw}`;
  /* ── Guardar código ── */
  await db.insert(accessCodes).values({
    code: fullCode,
    planId: order.planId,
    orderId: order.id,
    note:
      chatId === "SIM-CHAT"
        ? "pago simulado (demo)"
        : null,
  });
  return {
    order: {
      ...order,
      status: "paid" as const,
    },
    code: fullCode,
  };
}

/* ─────────────────────────────────────────────
   CONSUME RESULT
───────────────────────────────────────────── */

export type ConsumeResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      planId: string;
    }
  | {
      ok: false;
      reason: "invalid" | "used" | "revoked";
    };

/* ─────────────────────────────────────────────
   CONSUME CODE
───────────────────────────────────────────── */

export async function consumeCode(
  raw: string,
  fingerprint: string | null,
): Promise<ConsumeResult> {
  /*
   * IMPORTANTE:
   *
   * NO usamos .slice(-4)
   *
   * porque accessCodes.code guarda el código completo:
   *
   * PREFIX + 4 caracteres
   *
   * Ejemplo:
   * BA7K2
   * PR7K2
   * VP7K2
   */

  const clean = normalizeCode(raw);

  if (clean.length < 5) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  /* ── Buscar código exacto ── */

  const [row] = await db
    .select()
    .from(accessCodes)
    .where(eq(accessCodes.code, clean))
    .limit(1);

  if (!row) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  /* ── Código revocado ── */

  if (row.status === "revoked") {
    return {
      ok: false,
      reason: "revoked",
    };
  }

  /* ── Código ya utilizado ── */

  if (row.status === "used") {
    return {
      ok: false,
      reason: "used",
    };
  }

  /* ── Marcar como usado ── */

  const updated = await db
    .update(accessCodes)
    .set({
      status: "used",
      usedAt: new Date(),
    })
    .where(
      and(
        eq(accessCodes.id, row.id),
        eq(accessCodes.status, "active"),
      ),
    )
    .returning({
      id: accessCodes.id,
    });

  /*
   * Si no se actualizó ninguna fila,
   * otro proceso pudo consumir el código
   * al mismo tiempo.
   */
  if (updated.length === 0) {
    return {
      ok: false,
      reason: "used",
    };
  }

  /* ── Crear sesión ── */

  const token = randomBytes(24).toString("hex");

  const expiresAt = new Date(
    Date.now() + SESSION_HOURS * 3_600_000,
  );

  await db.insert(unlocks).values({
    token,
    codeId: row.id,
    fingerprint,
    expiresAt,
  });

  return {
    ok: true,
    token,
    expiresAt,
    planId: row.planId,
  };
}

/* ─────────────────────────────────────────────
   VERIFY SESSION
───────────────────────────────────────────── */

export async function verifySession(
  token: string | undefined | null,
) {
  if (!token) {
    return null;
  }

  const [u] = await db
    .select()
    .from(unlocks)
    .where(eq(unlocks.token, token))
    .limit(1);

  if (!u) {
    return null;
  }

  if (u.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return u;
}

/* ─────────────────────────────────────────────
   ADMIN
───────────────────────────────────────────── */

export async function adminStats() {
  const [revenue] = await db
    .select({
      v: sql<string>`
        coalesce(
          sum(${orders.stars})
          filter (
            where ${orders.status} = 'paid'
          ),
          0
        )
      `,
    })
    .from(orders);

  const [paidOrders] = await db
    .select({
      v: sql<string>`
        count(*)
        filter (
          where ${orders.status} = 'paid'
        )
      `,
    })
    .from(orders);

  const [activeCodes] = await db
    .select({
      v: sql<string>`
        count(*)
        filter (
          where ${accessCodes.status} = 'active'
        )
      `,
    })
    .from(accessCodes);

  const [unlockCount] = await db
    .select({
      v: sql<string>`count(*)`,
    })
    .from(unlocks);

  return {
    revenue: Number(revenue?.v ?? 0),
    paidOrders: Number(paidOrders?.v ?? 0),
    activeCodes: Number(activeCodes?.v ?? 0),
    unlocks: Number(unlockCount?.v ?? 0),
  };
}

/* ─────────────────────────────────────────────
   ADMIN ORDERS
───────────────────────────────────────────── */

export async function adminOrders() {
  return db
    .select({
      id: orders.id,
      payload: orders.payload,
      planId: orders.planId,
      stars: orders.stars,
      status: orders.status,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      code: accessCodes.code,
    })
    .from(orders)
    .leftJoin(
      accessCodes,
      eq(accessCodes.orderId, orders.id),
    )
    .orderBy(desc(orders.id))
    .limit(40);
}

/* ─────────────────────────────────────────────
   ADMIN CODES
───────────────────────────────────────────── */

export async function adminCodes() {
  return db
    .select()
    .from(accessCodes)
    .orderBy(desc(accessCodes.id))
    .limit(50);
}