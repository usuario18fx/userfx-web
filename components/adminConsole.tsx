export default function AdminConsole({ data }: any) {
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
        {data.users.map((u: any) => (
      <div key={u.userId} className="p-3 border border-white/10 rounded-lg flex justify-between">
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
  ))}
      </Section>
{/* CODES */}
      <Section title="🔑 CODES">
        {data.codes.map((c: any) => (
          <div
            key={c.code}
            className="p-3 border border-white/10 rounded-lg">
            <div className="text-sm font-bold">
              {c.code}
            </div>
            <div className="text-xs text-white/60">
              Plan: {c.data?.plan} · Used: {String(c.data?.used)}
            </div>
          </div>
  ))}

      </Section>

    </div>
  );
  }
/* ---------------- UI HELPERS ---------------- */
function Card({ label, value, danger }: any) {
  return (
    <div className={`p-4 rounded-lg border ${
      danger ? "border-red-500/50" : "border-white/10"
  }`}>
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
  }
function Section({ title, children }: any) {
  return (
    <div>
      <h2 className="text-sm text-white/60 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
  }
function badge(plan: string) {
  switch (plan) {
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