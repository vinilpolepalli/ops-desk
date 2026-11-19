import { computeCounts, computeStats, formatClock, legalActions, STATUS_LABEL } from './machine';
import { BUSINESS } from './seed';
import type { ItemRow, LogRow } from './db/store';

export const DISCLAIMERS = {
  data: 'Sample data - demo. Every item, email and draft is synthetic; nothing is sent or received.',
  draft: 'agent draft - synthetic, requires human approval',
  sent: 'simulated send - nothing was sent',
};

export function presentItem(i: ItemRow) {
  return {
    ...i,
    statusLabel: STATUS_LABEL[i.status],
    receivedAt: formatClock(i.receivedMin),
    respondedAt: i.respondedMin === null ? null : formatClock(i.respondedMin),
    legalActions: legalActions(i.status),
    draftLabel: DISCLAIMERS.draft,
    ...(i.status === 'SENT' ? { sentLabel: DISCLAIMERS.sent } : {}),
  };
}
export const presentLog = (l: LogRow) => ({ ...l, clock: formatClock(l.clockMin), origin: l.seeded ? 'seeded' : 'session' });

export function presentInbox(clockMin: number, items: ItemRow[]) {
  return {
    business: BUSINESS,
    disclaimers: DISCLAIMERS,
    clock: { min: clockMin, display: formatClock(clockMin), label: 'demo clock' },
    counts: computeCounts(items),
    stats: { ...computeStats(items), label: 'sample stats' },
    items: items.map(presentItem),
  };
}
