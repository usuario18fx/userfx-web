// components/VisitorCounter.tsx
import { useEffect, useState } from 'react';

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/miniapp-stats')
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar el contador');
        return res.json();
      })
      .then((data) => {
        if (data.ok && typeof data.visitors === 'number') {
          setCount(data.visitors);
          return;
        }

        throw new Error('Respuesta inválida');
      })
      .catch((error) => {
        console.error('VisitorCounter:', error);
        setCount(0);
      });
  }, []);

  return (
    <span className="vx-visitorCount" title="Visitors">
      <img
        src="/assets/iconos/user.png"
        alt=""
        aria-hidden="true"
        className="vx-visitorIcon"
        draggable={false}
      />

      <span>{count === null ? '—' : count.toLocaleString('es-ES')}</span>
    </span>
  );
}