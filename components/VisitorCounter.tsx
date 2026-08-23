import { useState, useEffect } from 'react';

export default function VisitorCounter() {
  const [stats, setStats] = useState<{ visitors: number; unique: number } | null>(null);

  useEffect(() => {
    fetch('/api/miniapp-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStats({ visitors: data.visitors, unique: data.unique_visitors });
        }
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <span className="vx-visitorCount">
      👥 {stats.unique.toLocaleString('es')} únicos · {stats.visitors.toLocaleString('es')} visitas
    </span>
  );
}