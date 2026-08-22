import { useState, useEffect } from 'react';
import VaultHome from './VaultHome';

const STORAGE_KEY = 'vault_unlocked';
const MAX_ATTEMPTS = 5;

export default function AccessGate() {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Revisa sesión previa + dispara tracking de apertura del Mini App (una sola vez)
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setUnlocked(true);
    setChecking(false);

    fetch('/api/miniapp-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram?.WebApp?.initData || '',
      }),
    }).catch(() => {}); // un fallo de tracking no debe bloquear el acceso
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setError('Demasiados intentos. Recarga la página.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, suffix }),
      });
      const data = await res.json();

      if (data.ok) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setUnlocked(true);
      } else {
        setAttempts((n) => n + 1);
        setError(data.error || 'Código inválido');
        setSuffix('');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null; // evita flash del form antes de leer sessionStorage

  if (unlocked) return <VaultHome />;

  return (
    <div className="access-gate">
      <form onSubmit={handleSubmit}>
        <input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          placeholder="PREFIX"
          maxLength={4}
          autoCapitalize="characters"
          autoComplete="off"
          disabled={loading || attempts >= MAX_ATTEMPTS}
        />
        <input
          value={suffix}
          onChange={(e) => setSuffix(e.target.value.toUpperCase())}
          placeholder="SUFFIX"
          maxLength={4}
          autoCapitalize="characters"
          autoComplete="off"
          disabled={loading || attempts >= MAX_ATTEMPTS}
        />
        <button type="submit" disabled={loading || attempts >= MAX_ATTEMPTS}>
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
        {error && (
          <p role="alert" className="access-error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}