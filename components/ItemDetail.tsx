'use client';
import { useEffect, useState } from 'react';
import StatusPill from './StatusPill';
import type { Item } from './types';
import type { ActionName } from '@/lib/machine';

const BTN = 'rounded-btn px-3 py-2 text-sm font-medium disabled:opacity-50';
const PRIMARY = `${BTN} bg-gold text-white hover:bg-gold-hover`;
const SECONDARY = `${BTN} border border-hair bg-white text-ink hover:border-ink`;

export interface Props {
  item: Item;
  busy: boolean;
  onAct: (action: ActionName, body?: Record<string, string>) => Promise<boolean>;
}

export default function ItemDetail({ item, busy, onAct }: Props) {
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [draft, setDraft] = useState(item.draft);
  const can = (a: ActionName) => item.legalActions.includes(a);

  useEffect(() => { setDraft(item.draft); setReason(''); setRejecting(false); }, [item.id, item.draft, item.status]);

  return (
    <section aria-label="Item detail" className="rounded-card border border-hair bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label num">{item.id} / {item.type}</span>
        <StatusPill status={item.status} />
      </div>
      <h2 className="mt-1 text-lg font-semibold">{item.subject}</h2>
      <p className="num text-sm text-muted">
        {item.source} from <span className="font-mono">{item.fromAddr}</span>, received {item.receivedAt} (demo clock)
      </p>

      <h3 className="label mt-4">Inbound message (synthetic)</h3>
      <p className="mt-1 whitespace-pre-wrap rounded-btn border border-hair bg-ground p-3 text-sm">{item.body}</p>

      <h3 className="label mt-4">{item.draftKind}</h3>
      <p className="mt-0.5 text-xs font-medium text-gold">{item.draftLabel}</p>
      {can('revise') ? (
        <textarea
          aria-label="Draft text" value={draft} maxLength={4000} rows={7}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-1 w-full rounded-btn border border-hair bg-white p-3 font-mono text-sm"
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap rounded-btn border border-hair bg-white p-3 font-mono text-sm">{item.draft}</p>
      )}

      {item.status === 'SENT' && (
        <p className="mt-3 rounded-btn border border-hair bg-sunk p-3 text-sm">
          <strong>{item.sentLabel}.</strong> Simulated send recorded at {item.respondedAt} (demo clock).
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {can('request-approval') && <button className={PRIMARY} disabled={busy} onClick={() => onAct('request-approval')}>Request approval</button>}
        {can('revise') && (
          <button className={SECONDARY} disabled={busy || !draft.trim() || draft === item.draft} onClick={() => onAct('revise', { draft })}>
            Revise draft
          </button>
        )}
        {can('approve') && <button className={PRIMARY} disabled={busy} onClick={() => onAct('approve')}>Approve</button>}
        {can('reject') && !rejecting && <button className={SECONDARY} disabled={busy} onClick={() => setRejecting(true)}>Reject</button>}
        {can('simulate-send') && <button className={PRIMARY} disabled={busy} onClick={() => onAct('simulate-send')}>Simulate send (nothing is sent)</button>}
        {item.legalActions.length === 0 && <p className="text-sm text-muted">No further actions: this item is in its terminal simulated-send state.</p>}
      </div>

      {can('reject') && rejecting && (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={async (e) => { e.preventDefault(); await onAct('reject', { reason }); }}
        >
          <label className="label" htmlFor="reason">Reject reason (required, logged)</label>
          <input
            id="reason" value={reason} maxLength={280} onChange={(e) => setReason(e.target.value)}
            className="rounded-btn border border-hair bg-white px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" className={PRIMARY} disabled={busy || !reason.trim()}>Confirm reject</button>
            <button type="button" className={SECONDARY} onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
