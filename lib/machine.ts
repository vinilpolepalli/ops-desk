// Pure approval state machine, demo clock and stats. No I/O, no randomness, no real time.
// DRAFTED -> NEEDS_APPROVAL -> APPROVED -> SENT (simulated). NEEDS_APPROVAL --reject--> DRAFTED.

export const STATUSES = ['DRAFTED', 'NEEDS_APPROVAL', 'APPROVED', 'SENT'] as const;
export type Status = (typeof STATUSES)[number];

export const ACTIONS = ['request-approval', 'approve', 'reject', 'simulate-send', 'revise'] as const;
export type ActionName = (typeof ACTIONS)[number];

export const CLOCK_START = 14 * 60 + 30;
export const CLOCK_STEP = 2;

/** The fields of an inbox item the machine reads and changes. */
export interface Workflow { status: Status; draft: string; respondedMin: number | null }
export interface Payload { reason?: string; draft?: string }

export interface TransitionEvent {
  action: ActionName;
  from: Status;
  to: Status;
  text: string;
}

export type Outcome =
  | { ok: true; item: Workflow; clockMin: number; event: TransitionEvent }
  | { ok: false; status: 409 | 400; reason: string };

/** action -> [required current status, resulting status] */
export const RULES: Record<ActionName, { from: Status; to: Status }> = {
  'request-approval': { from: 'DRAFTED', to: 'NEEDS_APPROVAL' },
  approve: { from: 'NEEDS_APPROVAL', to: 'APPROVED' },
  reject: { from: 'NEEDS_APPROVAL', to: 'DRAFTED' },
  'simulate-send': { from: 'APPROVED', to: 'SENT' },
  revise: { from: 'DRAFTED', to: 'DRAFTED' },
};

export const STATUS_LABEL: Record<Status, string> = {
  DRAFTED: 'Drafted',
  NEEDS_APPROVAL: 'Needs approval',
  APPROVED: 'Approved',
  SENT: 'Sent (simulated)',
};

/** Actions legal from a given status. */
export function legalActions(status: Status): ActionName[] {
  return ACTIONS.filter((a) => RULES[a].from === status);
}

export function formatClock(min: number): string {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function describe(action: ActionName, p: Payload): string {
  switch (action) {
    case 'request-approval': return 'submitted for approval';
    case 'approve': return 'approved';
    case 'reject': return `rejected, returned to DRAFTED for revision. Reason: ${p.reason ?? ''}`;
    case 'simulate-send': return 'simulated send recorded - nothing was sent';
    case 'revise': return 'draft revised, stays in DRAFTED';
  }
}

/**
 * Apply one action. Pure: returns the new workflow fields, the new clock and the log event,
 * or a refusal. Illegal transitions are 409 with the reason; a missing required payload is 400.
 * The clock only advances on success.
 */
export function applyAction(item: Workflow, action: ActionName, payload: Payload, clockMin: number): Outcome {
  const rule = RULES[action];
  if (!rule) return { ok: false, status: 400, reason: `unknown action ${String(action)}` };
  if (item.status !== rule.from) {
    return {
      ok: false, status: 409,
      reason: `cannot ${action} from ${item.status}: ${action} requires ${rule.from}`,
    };
  }
  if (action === 'reject' && !(payload.reason && payload.reason.trim())) {
    return { ok: false, status: 400, reason: 'reject requires a reason' };
  }
  if (action === 'revise' && !(payload.draft && payload.draft.trim())) {
    return { ok: false, status: 400, reason: 'revise requires draft text' };
  }
  const next = clockMin + CLOCK_STEP;
  const updated: Workflow = {
    status: rule.to,
    draft: action === 'revise' ? (payload.draft as string) : item.draft,
    respondedMin: action === 'simulate-send' ? next : item.respondedMin,
  };
  return {
    ok: true, item: updated, clockMin: next,
    event: { action, from: item.status, to: rule.to, text: describe(action, payload) },
  };
}

export interface StatsInput { status: Status; receivedMin: number; respondedMin: number | null }
export interface Stats {
  handled: number;
  awaitingApproval: number;
  /** Mean minutes from received to (simulated) send over handled items; null when none. */
  avgResponseMins: number | null;
}

export function computeStats(items: StatsInput[]): Stats {
  const sent = items.filter((i) => i.status === 'SENT' && i.respondedMin !== null);
  const total = sent.reduce((s, i) => s + ((i.respondedMin as number) - i.receivedMin), 0);
  return {
    handled: items.filter((i) => i.status === 'SENT').length,
    awaitingApproval: items.filter((i) => i.status === 'NEEDS_APPROVAL').length,
    avgResponseMins: sent.length ? Math.round((total / sent.length) * 10) / 10 : null,
  };
}

export function computeCounts(items: { status: Status }[]): Record<Status | 'ALL', number> {
  const c = { ALL: items.length, DRAFTED: 0, NEEDS_APPROVAL: 0, APPROVED: 0, SENT: 0 };
  for (const i of items) c[i.status]++;
  return c;
}
