import { useEffect, useState } from "react";

type VisitorStats = {
  visitors: number;
  unique: number;
};

function formatCounterValue(value: number | null) {
  return String(Math.max(0, value ?? 0)).padStart(5, "0");
}

export default function VisitorCounter() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [showUnique, setShowUnique] = useState(false);

  useEffect(() => {
    fetch("/api/miniapp-stats")
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar el contador");
        return res.json();
      })
      .then((data) => {
        if (data.ok && typeof data.visitors === "number" && typeof data.unique === "number") {
          setStats({
            visitors: data.visitors,
            unique: data.unique,
          });
          return;
        }

        throw new Error("Respuesta inválida");
      })
      .catch((error) => {
        console.error("VisitorCounter:", error);
        setStats(null);
      });
  }, []);

  const value = stats ? (showUnique ? stats.unique : stats.visitors) : null;
  const label = showUnique ? "USER" : "VIEW";
  const icon = showUnique ? "/assets/iconos/user.png" : "/assets/iconos/view.png";
  const formattedValue = `${label}-${value === null ? "—" : formatCounterValue(value)}`;

  return (
    <button type="button" className="vx-visitorCount" onClick={() => setShowUnique((current) => !current)} title={showUnique ? "Unique users" : "Views"} aria-label={formattedValue}>
      <img src={icon} alt="" aria-hidden="true" className="vx-visitorIcon" draggable={false} />
      <span>
        {formattedValue}
      </span>
    </button>
  );
}
