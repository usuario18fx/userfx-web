import { useState, type ReactNode } from "react";

type Code = {
  id: number;
  code: string;
  planId: string;
  status: "active" | "used" | "revoked";
  createdAt: string | Date;
  usedAt: string | Date | null;
  orderId: number | null;
  note: string | null;
};

type AdminData = {
  revenue: number;
  paidOrders: number;
  activeCodes: number;
  unlocks: number;
  codes: Code[];
};

export default function App() {
  const [data] = useState<AdminData>({
    revenue: 0,
    paidOrders: 0,
    activeCodes: 0,
    unlocks: 0,
    codes: [],
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Revenue" value={data.revenue} />
        <Card label="Paid Orders" value={data.paidOrders} />
        <Card label="Active Codes" value={data.activeCodes} />
        <Card label="Unlocks" value={data.unlocks} />
      </div>

      <Section title="🔑 ACCESS CODES">
        {data.codes.length === 0 ? (
          <p className="text-sm text-white/50">No codes found.</p>
        ) : (
          data.codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center justify-between rounded-lg border border-white/10 p-3"
            >
              <div>
                <div className="font-bold">{code.code}</div>

                <div className="text-xs text-white/60">
                  Plan: {badge(code.planId)} · Created:{" "}
                  {new Date(code.createdAt).toLocaleString()}
                </div>
              </div>

              <span
                className={
                  code.status === "active"
                    ? "text-xs text-green-400"
                    : code.status === "used"
                      ? "text-xs text-yellow-400"
                      : "text-xs text-red-400"
                }
              >
                {code.status.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm text-white/60">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function badge(plan: string) {
  switch (plan.toLowerCase()) {
    case "vip":
      return "👑 VIP";
    case "pro":
      return "🔥 PRO";
    case "basic":
      return "⚡ BASIC";
    default:
      return plan || "—";
  }
}