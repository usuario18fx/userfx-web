import type { Metadata } from "next";
import { getAdminMetrics } from "@/components/lib/admin-metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VIP ADMIN CONTROL · USER FX",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const data = await getAdminMetrics();

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 border-b border-white/10 pb-4">
          <h1 className="text-2xl font-bold tracking-widest">
            👑 VIP ADMIN CONTROL ROOM
          </h1>
          <p className="text-xs text-white/50">
            SYSTEM STATUS · REAL-TIME DASHBOARD
          </p>
        </div>


      </div>
    </main>
  );
}