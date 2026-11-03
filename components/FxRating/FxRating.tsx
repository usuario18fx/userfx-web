"use client";
import { Fragment, useEffect, useId, useState } from 'react';
import './FxRating.css';
const crown = 'M2 6l5.5 4.5L12 3l4.5 7.5L22 6l-2.5 11h-15z M4.5 18.5h15V21h-15z';
type Result = { count: number; average: number; mine: number | null; canVote: boolean };
export default function FxRating() {
  const id = useId();
  const [token, setToken] = useState('');
  const [data, setData] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    const personal = url.searchParams.get('fx_rating') || sessionStorage.getItem('fx_rating') || '';
    if (personal) sessionStorage.setItem('fx_rating', personal);
    url.searchParams.delete('fx_rating');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    setToken(personal);
    const controller = new AbortController();
    fetch('/api/fx-rating', { headers: personal ? { 'x-fx-rating-token': personal } : {}, signal: controller.signal })
      .then(async r => { const value = await r.json(); if (!r.ok) throw new Error(value.error); setData(value); })
      .catch(e => { if (e.name !== 'AbortError') setError('Ratings are temporarily unavailable.'); });
    return () => controller.abort();
  }, []);
  async function vote(value: number) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/fx-rating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="fx-community-rating" id="fx-community-rating" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Crowned by the community</h2>
    <div className="fx-rating-average" role="img" aria-label={data?.count ? `${data.average.toFixed(1)} out of 5 crowns, ${data.count} ratings` : 'No ratings yet'}>
      {[1,2,3,4,5].map(n => <span key={n}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={crown}/></svg><span style={{ width: `${Math.max(0, Math.min(1, (data?.average || 0) - n + 1)) * 100}%` }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={crown}/></svg></span></span>)}
    </div>
    <p>{data ? data.count ? `${data.average.toFixed(1)} / 5 · ${data.count} ${data.count === 1 ? 'rating' : 'ratings'}` : 'Be the first to leave a crown.' : 'Loading ratings…'}</p>
    {data?.canVote && <fieldset disabled={busy} className="fx-rating"><legend>Your rating</legend>{[1,2,3,4,5].map(n => <Fragment key={n}>
      <input type="radio" id={`${id}-${n}`} name={`${id}-rating`} value={n} checked={data.mine === n} onChange={() => void vote(n)} aria-label={`${n} out of 5 crowns`}/>
      <label htmlFor={`${id}-${n}`} title={`${n} ${n === 1 ? 'crown' : 'crowns'}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={crown}/></svg></label>
    </Fragment>)}</fieldset>}
    <p role="status" aria-live="polite">{error || (busy ? 'Saving…' : data?.mine ? 'Your rating is saved. You can change it anytime.' : '')}</p>
  </section>;
}
