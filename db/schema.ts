import { integer, pgTable, serial, text, timestamp,} from "drizzle-orm/pg-core";
/* Órdenes de pago creadas antes de cobrar en Telegram (Stars).*/
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
/* Payload único que viaja en la factura de Telegram y vuelve en el webhook.*/
  payload: text("payload").notNull().unique(),
  planId: text("plan_id").notNull(),
/* Precio en Telegram Stars. 1 unidad = 1 ⭐*/
  stars: integer("stars").notNull(),
/* pending | paid | failed*/
  status: text("status").notNull().default("pending"),
  chatId: text("chat_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});
/** Códigos de 4 caracteres que desbloquean el álbum.*/
export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  planId: text("plan_id").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  /* active | used | revoked */
  status: text("status").notNull().default("active"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usedAt: timestamp("used_at"),
});
/* Sesiones de desbloqueo */
export const unlocks = pgTable("unlocks", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  codeId: integer("code_id").references(() => accessCodes.id),
  fingerprint: text("fingerprint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});