'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import ItemDetail from './ItemDetail';
import StatusPill from './StatusPill';
import type { Inbox, LogEntry } from './types';
import { STATUSES, STATUS_LABEL, type ActionName, type Status } from '@/lib/machine';

const CHIP = 'num rounded-full border px-3 py-1 text-xs'; // unslop-ignore: status filter chips are the spec's pill use
type Filter = Status | 'ALL';

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(path, {
    method, headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json() };
}

export default function Desk() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const [i, l] = await Promise.all([call<Inbox>('/api/inbox'), call<{ log: LogEntry[] }>('/api/activity')]);
    if (i.ok) setInbox(i.data);
    if (l.ok) setLog(l.data.log);
    if (!i.ok) setError(i.data.error ?? 'could not load inbox');
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (action: ActionName, body?: Record<string, string>) => {
    if (!selected) return false;
    setBusy(true); setError(null);
    const r = await call(`/api/items/${selected}/${action}`, 'POST', body);
    if (!r.ok) setError(`${r.data.error ?? 'request failed'}`);
    await refresh();
    setBusy(false);
    return r.ok;
  };
  const reset = async () => {
    setBusy(true); setError(null);
    const r = await call('/api/reset', 'POST');
    if (!r.ok) setError(r.data.error ?? 'reset failed');
    setSelected(null); setFilter('ALL');
    await refresh();
    setBusy(false);
  };
  const pick = (id: string) => {
    setSelected(id); setError(null);
    if (window.matchMedia('(max-width: 1023px)').matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  if (!inbox) return <main className="p-6 text-sm text-muted">{error ?? 'Loading inbox...'}</main>;

  const visible = inbox.items.filter((i) => filter === 'ALL' || i.status === filter);
  const item = inbox.items.find((i) => i.id === selected) ?? null;
  const chips: { key: Filter; label: string }[] = [{ key: 'ALL', label: 'All' }, ...STATUSES.map((s) => ({ key: s as Filter, label: STATUS_LABEL[s] }))];
  const avg = inbox.stats.avgResponseMins;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hair pb-3">
        <div>
          <h1 className="text-xl font-semibold">Ops Desk</h1>
          <p className="text-sm text-muted">{inbox.business.name} / {inbox.business.locations.join(' and ')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-btn border border-gold px-2.5 py-0.5 text-xs font-medium text-gold">Sample data - demo</span>
          <span className="num font-mono text-sm" title="Deterministic; advances 2 minutes per action">
            <span className="label">{inbox.clock.label}</span> {inbox.clock.display}
          </span>
          <button className="rounded-btn border border-hair bg-white px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50" disabled={busy} onClick={reset}>
            Reset to demo
          </button>
        </div>
      </header>

      <p className="mt-3 text-sm text-muted">{inbox.disclaimers.data}</p>

      <dl aria-label="Sample stats" className="mt-3 grid grid-cols-3 divide-x divide-hair rounded-card border border-hair bg-white">
        {[
          ['Handled', String(inbox.stats.handled)],
          ['Awaiting approval', String(inbox.stats.awaitingApproval)],
          ['Avg response (min)', avg === null ? '-' : avg.toFixed(1)],
        ].map(([k, v]) => (
          <div key={k} className="px-3 py-2">
            <dt className="label">{k}</dt>
            <dd className="num font-mono text-lg">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-xs text-muted">Sample stats, computed server-side from the live inbox state.</p>

      {error && <p role="alert" className="mt-3 rounded-btn border border-gold bg-white p-3 text-sm text-gold">Server refused: {error}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-label="Inbox">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            {chips.map((c) => (
              <button
                key={c.key} onClick={() => setFilter(c.key)} aria-pressed={filter === c.key}
                className={`${CHIP} ${filter === c.key ? 'border-gold bg-gold text-white' : 'border-hair bg-white text-ink hover:border-ink'}`}
              >
                {c.label} {inbox.counts[c.key]}
              </button>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-hair rounded-card border border-hair bg-white">
            {visible.map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => pick(i.id)} aria-current={selected === i.id}
                  className={`block w-full px-3 py-2.5 text-left ${selected === i.id ? 'border-l-2 border-gold bg-ground' : 'border-l-2 border-transparent hover:bg-ground'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="label num">{i.id} / {i.type}</span>
                    <StatusPill status={i.status} />
                  </span>
                  <span className="mt-0.5 block text-sm font-medium">{i.subject}</span>
                  <span className="num block text-xs text-muted">{i.receivedAt} demo clock</span>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No items in this state.</li>}
          </ul>
        </section>

        <div ref={detailRef} className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
          {item ? <ItemDetail item={item} busy={busy} onAct={act} /> : (
            <p className="rounded-card border border-dashed border-hair p-6 text-sm text-muted">
              Select an item to see the inbound message, the agent draft and the actions valid for its current state.
            </p>
          )}
        </div>
      </div>

      <section aria-label="Activity log" className="mt-4 rounded-card border border-hair bg-white">
        <h2 className="label border-b border-hair px-3 py-2">Activity log (append-only, demo clock)</h2>
        <ul className="max-h-72 divide-y divide-hair overflow-y-auto">
          {log.map((l) => (
            <li key={l.seq} className="flex gap-3 px-3 py-1.5 text-sm">
              <span className="num font-mono text-muted">{l.clock}</span>
              <span className="flex-1">{l.text}</span>
              {l.seeded && <span className="label">seeded</span>}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-6 border-t border-hair pt-3 text-xs text-muted">
        Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Async.
      </footer>
    </div>
  );
}
