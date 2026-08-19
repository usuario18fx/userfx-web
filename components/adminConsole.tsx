import { useState } from "react";

type User = {
  userId: string;
  plan: "vip" | "pro" | "basic" | string;
  expiresAt: string | number | Date;
  isExpired: boolean;
};

type Code = {
  code: string;
  data?: {
    plan?: "vip" | "pro" | "basic" | string;
    used?: boolean;
  };
};

type DashboardData = {
  totalUsers: number;
  active: number;
  expired: number;
  flagged: number;
  totalCodes: number;
  users: User[];
  codes: Code[];
};

export default function App() {
  const [data, setData] = useState<DashboardData>({
    totalUsers: 0,
    active: 0,
    expired: 0,
    flagged: 0,
    totalCodes: 0,
    users: [],
    codes: [],
  });

  return (
    <div className="space-y-8">
      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card label="Users" value={data.totalUsers} />
        <Card label="Active" value={data.active} />
        <Card label="Expired" value={data.expired} />
        <Card label="Codes" value={data.totalCodes} />
        <Card label="Fraud Flags" value={data.flagged} danger />
      </div>

      {/* USERS */}
      <Section title="👤 USERS">
        {data.users.length === 0 ? (
          <EmptyState text="No users found." />
        ) : (
          data.users.map((u) => (
            <div
              key={u.userId}
              className="p-3 border border-white/10 rounded-lg flex justify-between"
            >
              <div>
                <div className="text-sm font-bold">
                  ID: {u.userId}
                </div>

                <div className="text-xs text-white/60">
                  Plan: {badge(u.plan)} · Expires:{" "}
                  {new Date(u.expiresAt).toLocaleString()}
                </div>
              </div>

              <div>
                {u.isExpired ? (
                  <span className="text-red-500 text-xs">EXPIRED</span>
                ) : (
                  <span className="text-green-500 text-xs">ACTIVE</span>
                )}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* CODES */}
      <Section title="🔑 CODES">
        {data.codes.length === 0 ? (
          <EmptyState text="No codes found." />
        ) : (
          data.codes.map((c) => (
            <div
              key={c.code}
              className="p-3 border border-white/10 rounded-lg"
            >
              <div className="text-sm font-bold">{c.code}</div>

              <div className="text-xs text-white/60">
                Plan: {badge(c.data?.plan ?? "")} · Used:{" "}
                {c.data?.used ? "Yes" : "No"}
              </div>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

/* ---------------- UI HELPERS ---------------- */

function Card({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        danger ? "border-red-500/50" : "border-white/10"
      }`}
    >
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm text-white/60 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-3 text-sm text-white/40 border border-white/10 rounded-lg">
      {text}
    </div>
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
      return "—";
  }
}