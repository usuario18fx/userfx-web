// Shared validity for website, invoices and newly issued bot codes.
export const PLAN_DAYS = Object.freeze({ basic: 3, pro: 14, vip: 30 });
export const PLAN_STARS = Object.freeze({ basic: 350, pro: 750, vip: 1500 });
export const PLAN_SESSION_SECONDS = Object.freeze({ basic: 12 * 60 * 60, pro: 24 * 60 * 60, vip: 7 * 24 * 60 * 60 });
export const PLAN_SESSION_LABELS = Object.freeze({ basic: "12-hour session", pro: "24-hour session", vip: "7-day session" });
