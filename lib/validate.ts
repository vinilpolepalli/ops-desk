import { ACTIONS, type ActionName, type Payload } from './machine';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (m: string) => new HttpError(400, m);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const LIMITS = { draftMax: 4000, reasonMax: 280, idMax: 32 } as const;
const ID = /^[A-Za-z0-9-]{1,32}$/;

export function parseItemId(v: unknown): string {
  if (typeof v !== 'string' || !ID.test(v)) throw bad('invalid item id');
  return v;
}

export function parseAction(v: unknown): ActionName {
  if (typeof v !== 'string' || !(ACTIONS as readonly string[]).includes(v)) throw new HttpError(404, 'unknown action');
  return v as ActionName;
}

function exactKeys(o: Record<string, unknown>, allowed: readonly string[]) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw bad(`unknown field ${k}`);
}

/** Validate the request body for an action. Body is optional except where a field is required. */
export function parsePayload(action: ActionName, body: unknown): Payload {
  const o = body === undefined || body === null ? {} : body;
  if (!isObj(o)) throw bad('body must be a JSON object');
  if (action === 'reject') {
    exactKeys(o, ['reason']);
    if (typeof o.reason !== 'string') throw bad('reason is required and must be a string');
    const reason = o.reason.trim();
    if (!reason) throw bad('reason is required');
    if (reason.length > LIMITS.reasonMax) throw bad(`reason must be at most ${LIMITS.reasonMax} characters`);
    return { reason };
  }
  if (action === 'revise') {
    exactKeys(o, ['draft']);
    if (typeof o.draft !== 'string') throw bad('draft is required and must be a string');
    const draft = o.draft.trim();
    if (!draft) throw bad('draft must not be empty');
    if (draft.length > LIMITS.draftMax) throw bad(`draft must be at most ${LIMITS.draftMax} characters`);
    return { draft };
  }
  exactKeys(o, []);
  return {};
}
