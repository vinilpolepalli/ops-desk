import { CLOCK_START, type ActionName, type Payload, type Status } from '../machine';
import { SEED_ITEMS, seedLog } from '../seed';

export interface ItemRow {
  id: string; type: string; source: string; fromAddr: string; subject: string; body: string;
  draftKind: string; draft: string; status: Status;
  receivedMin: number; respondedMin: number | null; updatedMin: number;
}
export interface LogRow {
  seq: number; clockMin: number; itemId: string | null; action: string | null; text: string; seeded: boolean;
}
export type ActResult =
  | { ok: true; item: ItemRow; clockMin: number; entry: LogRow }
  | { ok: false; status: 400 | 404 | 409; reason: string };

export interface Store {
  /** Seeds the owner's inbox on first use, then returns items and the demo clock. */
  snapshot(owner: string): Promise<{ clockMin: number; items: ItemRow[] }>;
  getItem(owner: string, id: string): Promise<ItemRow | null>;
  /** Append-only activity log, newest first; optionally for one item. */
  log(owner: string, itemId?: string): Promise<LogRow[]>;
  /** Atomically validate (via lib/machine), mutate, log and advance the clock. */
  act(owner: string, itemId: string, action: ActionName, payload: Payload): Promise<ActResult>;
  /** Restore the seeded inbox, log and clock for this owner. */
  reset(owner: string): Promise<void>;
  /** Count one write in the current hour; false when over the limit. */
  allowWrite(owner: string, limit: number, now?: number): Promise<boolean>;
}

export function seedItemRows(): ItemRow[] {
  return SEED_ITEMS.map((s) => ({
    id: s.id, type: s.type, source: s.source, fromAddr: s.fromAddr, subject: s.subject, body: s.body,
    draftKind: s.draftKind, draft: s.draft, status: s.status,
    receivedMin: s.receivedMin, respondedMin: s.respondedMin, updatedMin: s.respondedMin ?? s.draftedMin,
  }));
}
export function seedLogRows(): LogRow[] {
  return seedLog().map((l, i) => ({ seq: i + 1, clockMin: l.clockMin, itemId: l.itemId, action: null, text: l.text, seeded: true }));
}
export { CLOCK_START };

let instance: Promise<Store> | null = null;
export function getStore(): Promise<Store> {
  if (!instance) {
    instance = process.env.DATABASE_URL
      ? import('./pg').then((m) => m.createPgStore(process.env.DATABASE_URL as string))
      : import('./sqlite').then((m) => m.createSqliteStore(process.env.OPSDESK_DB || 'opsdesk.db'));
  }
  return instance;
}
