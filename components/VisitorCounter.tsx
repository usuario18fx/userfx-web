// components/VisitorCounter.tsx
import { useState, useEffect } from 'react';
export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/miniapp-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setCount(data.visitors);
      })
      .catch(() => {});
  }, []);

  if (count === null) return null;

  return <span className="vx-visitorCount">👥 {count.toLocaleString('es')}</span>;
}