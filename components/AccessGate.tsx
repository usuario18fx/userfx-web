import { useState, useEffect } from 'react';
import VaultHome from './VaultHome/VaultHome';

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
      <style>{GATE_CSS}</style>
      <form onSubmit={handleSubmit}>
        <img src="/assets/userfx-logo-sin.png" alt="USER FX" className="access-gate__logo" />
        <p className="access-gate__kicker">𝐔𝐒𝐄𝐑 🜲 𝓕𝐗 · PRIVATE VAULT</p>
        <div className="access-gate__inputs">
          <input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())}  placeholder="PREFIX"   maxLength={4}  autoCapitalize="characters"  autoComplete="off"  disabled={loading || attempts >= MAX_ATTEMPTS} />
          <input  value={suffix} onChange={(e) => setSuffix(e.target.value.toUpperCase())} placeholder="SUFFIX"  maxLength={4} autoCapitalize="characters" autoComplete="off" disabled={loading || attempts >= MAX_ATTEMPTS}/>
        </div>
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

const GATE_CSS = `
.access-gate{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:100dvh;
  padding:24px;
  background:#07060a;
  font-family:"JetBrains Mono", ui-monospace, monospace;
}
.access-gate form{
  width:100%;
  max-width:320px;
  padding:32px 24px;
  border:1px solid rgba(224,184,90,.24);
  background:linear-gradient(rgba(7,6,10,.64), rgba(7,6,10,.84));
  text-align:center;
}
.access-gate__logo{
  width:64px;
  height:64px;
  object-fit:contain;
  margin:0 auto 12px;
  display:block;
}
.access-gate__kicker{
  margin:0 0 24px;
  color:#e0b85a;
  font-size:10px;
  letter-spacing:.24em;
  text-transform:uppercase;
}
.access-gate__inputs{
  display:flex;
  gap:8px;
  margin-bottom:16px;
}
.access-gate input{
  flex:1;
  min-width:0;
  height:42px;
  padding:0 12px;
  border:1px solid rgba(236,229,216,.16);
  background:#0d0b12;
  color:#f4eee4;
  font-family:inherit;
  font-size:12px;
  letter-spacing:.12em;
  text-align:center;
  text-transform:uppercase;
}
.access-gate input::placeholder{
  color:#7a7286;
}
.access-gate input:focus{
  outline:none;
  border-color:#e0b85a;
}
.access-gate button{
  width:100%;
  height:44px;
  border:1px solid #d4a83a;
  background:linear-gradient(180deg, #2a2a2a, #111);
  color:#f6d77a;
  font-family:inherit;
  font-size:11px;
  font-weight:700;
  letter-spacing:.2em;
  text-transform:uppercase;
  cursor:pointer;
  transition:background .3s ease, color .3s ease;
}
.access-gate button:hover:not(:disabled){
  background:linear-gradient(180deg, #f6d77a, #b8861f);
  color:#1a0d05;
}
.access-gate button:disabled{
  opacity:.5;
  cursor:not-allowed;
}
.access-error{
  margin:14px 0 0;
  color:#b94a5c;
  font-size:10px;
  letter-spacing:.1em;
}
`;