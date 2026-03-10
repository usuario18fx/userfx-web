// src/bot/menus/plans.ts
import { InlineKeyboard } from "grammy";

export function getPlansMenu() {
  return new InlineKeyboard()
    .text("☁️ Cloud Básico - 5 USD", "buy_plan_basic")
    .row()
    .text("👑 Cloud VIP Pro - 15 USD", "buy_plan_premium")
    .row()
    .text("⬅️ Volver al Panel", "back_to_main");
}
