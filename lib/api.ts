import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getStore, type Store } from './db/store';
import { HttpError } from './validate';

export const MAX_BODY_BYTES = 20 * 1024;
export const WRITES_PER_HOUR = 120;
const COOKIE = 'od_uid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface Ctx { owner: string; store: Store; body: () => unknown }

/** Wraps a route: owner cookie, same-origin check, size cap, rate limit (writes), JSON errors. */
export function route(write: boolean, fn: (ctx: Ctx, req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest, _p?: unknown) => {
    const existing = req.cookies.get(COOKIE)?.value;
    const owner = existing && UUID.test(existing) ? existing : randomUUID();
    let res: NextResponse;
    try {
      const store = await getStore();
      let parsed: unknown;
      if (write) {
        const origin = req.headers.get('origin');
        if (origin && new URL(origin).host !== req.headers.get('host')) throw new HttpError(403, 'cross-origin write refused');
        const declared = Number(req.headers.get('content-length') ?? 0);
        if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'request body exceeds 20KB');
        const text = await req.text();
        if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new HttpError(413, 'request body exceeds 20KB');
        if (!(await store.allowWrite(owner, WRITES_PER_HOUR))) throw new HttpError(429, 'write limit reached (120 per hour)');
        if (text.trim()) {
          try { parsed = JSON.parse(text); } catch { throw new HttpError(400, 'invalid JSON'); }
        }
      }
      res = NextResponse.json(await fn({ owner, store, body: () => parsed }, req));
    } catch (e) {
      if (e instanceof HttpError) res = NextResponse.json({ error: e.message }, { status: e.status });
      else { console.error(e); res = NextResponse.json({ error: 'internal error' }, { status: 500 }); }
    }
    if (existing !== owner) {
      res.cookies.set(COOKIE, owner, {
        httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
        secure: process.env.COOKIE_SECURE === '1',
      });
    }
    return res;
  };
}
