import { useState, useEffect } from 'react';

export default function VisitorCounter() {
  const [stats, setStats] = useState<{ visitors: number; unique: number } | null>(null);
  const [showUnique, setShowUnique] = useState(false);

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
    <button
      type="button"
      className="vx-visitorCount"
      onClick={() => setShowUnique((v) => !v)}
      title={showUnique ? 'Unique visitors' : 'Total opens'}
    >
      {showUnique ? '👁️' : '👤'} {(showUnique ? stats.unique : stats.visitors).toLocaleString('es')}
    </button>
  );
}