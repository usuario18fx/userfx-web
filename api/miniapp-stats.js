import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  if (!globalThis.__userfxStatsSupabase) {
    globalThis.__userfxStatsSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis.__userfxStatsSupabase;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=59");

  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from("track_events")
      .select("*", { count: "exact", head: true })
      .eq("event", "miniapp_open");

    if (error) {
      console.error("[miniapp-stats/count]", error);
      return res.status(500).json({
        ok: false,
        error: "server_error",
      });
    }

    return res.status(200).json({
      ok: true,
      visitors: count ?? 0,
    });
  } catch (error) {
    console.error("[api/miniapp-stats]", error);
    return res.status(500).json({
      ok: false,
      error: "server_error",
    });
  }
}
