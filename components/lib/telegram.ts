import { getPlan } from "./plans.js";
import type { orders } from "../../db/schema.js";

const API = "https://api.telegram.org";

export const botConfigured = () =>
  Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_USERNAME) ;
export const botUsername = () =>
  process.env.TELEGRAM_BOT_USERNAME ?? BOT_USERNAME;
export const botUrl = (payload: string) =>
  `https://t.me/${botUsername()}?start=${encodeURIComponent(payload)}`;
async function api<T = unknown>(
  method: string,
  body?: Record<string, unknown>
  ) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN no configurado");
  }
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  } ) ;
  return (await res.json()) as {
    ok: boolean;
    result?: T;
    description?: string;
  } ;
  }
type OrderRow = typeof orders.$inferSelect;
/** Usuario de Telegram del bot */
export const BOT_USERNAME = "User18Fx_bot";
/** Factura en Telegram Stars (XTR). */
export async function sendInvoice(
  chatId: string | number,
  order: OrderRow
  ) {
  const plan = getPlan(order.planId);
  if (!plan) {
    throw new Error(`Plan no encontrado: ${order.planId}`);
  }
  return api("sendInvoice", {
     chat_id: chatId,
    title: `Ŧχ🜲 · ${plan.name}`,
    description: `${plan.benefits.join(" · ")}. Acceso tras confirmar el pago.`,
    payload: order.payload,
    currency: "XTR",
    prices: [
    {label: `${plan.name} · ${plan.days} días`,amount: plan.stars, } ,
  ],});
  }