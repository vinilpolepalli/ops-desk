import { route } from '@/lib/api';
import { formatClock } from '@/lib/machine';
import { presentItem, presentLog } from '@/lib/present';
import { HttpError, parseAction, parseItemId, parsePayload } from '@/lib/validate';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string; action: string }> };

/** POST /api/items/:id/:action  (request-approval | approve | reject | simulate-send | revise) */
export const POST = async (req: NextRequest, p: P) => {
  const { id, action } = await p.params;
  return route(true, async ({ owner, store, body }) => {
    const itemId = parseItemId(id);
    const act = parseAction(action);
    const payload = parsePayload(act, body());
    const r = await store.act(owner, itemId, act, payload);
    if (!r.ok) throw new HttpError(r.status, r.reason);
    return {
      item: presentItem(r.item),
      entry: presentLog(r.entry),
      clock: { min: r.clockMin, display: formatClock(r.clockMin), label: 'demo clock' },
    };
  })(req);
};
