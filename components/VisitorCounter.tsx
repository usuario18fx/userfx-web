import { useEffect, useState } from "react";

type VisitorStats = {
  visitors: number;
  unique: number;
};

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
  const label = showUnique ? "Users" : "Views";

  return (
    <button type="button" className="vx-visitorCount" onClick={() => setShowUnique((current) => !current)} title={label} aria-label={`${label}: ${value ?? 0}`}>
      <img src="/assets/iconos/user.png" alt="" aria-hidden="true" className="vx-visitorIcon" draggable={false} />
      <span>
        {value === null ? "—" : value.toLocaleString("es-ES")}
      </span>
    </button>
  );
}
