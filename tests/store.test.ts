import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteStore } from '../lib/db/sqlite';
import { CLOCK_START } from '../lib/machine';

const dirs: string[] = [];
const file = () => { const d = mkdtempSync(join(tmpdir(), 'od-')); dirs.push(d); return join(d, 't.db'); };
afterEach(() => { while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true }); });

describe('sqlite store', () => {
  it('seeds a fresh owner lazily', async () => {
    const s = createSqliteStore(file());
    const snap = await s.snapshot('a');
    expect(snap.clockMin).toBe(CLOCK_START);
    expect(snap.items.length).toBe(10);
    expect((await s.log('a')).every((l) => l.seeded)).toBe(true);
  });

  it('full legal path logs each step and advances the clock', async () => {
    const s = createSqliteStore(file());
    const id = 'OPS-103';
    let clock = CLOCK_START;
    for (const [a, to] of [['request-approval', 'NEEDS_APPROVAL'], ['approve', 'APPROVED'], ['simulate-send', 'SENT']] as const) {
      const r = await s.act('a', id, a, {});
      if (!r.ok) throw new Error(r.reason);
      clock += 2;
      expect(r.item.status).toBe(to);
      expect(r.clockMin).toBe(clock);
      expect(r.entry).toMatchObject({ clockMin: clock, seeded: false, action: a });
    }
    const log = await s.log('a');
    expect(log.filter((l) => !l.seeded)).toHaveLength(3);
    expect(log[0].action).toBe('simulate-send'); // newest first
    expect((await s.snapshot('a')).clockMin).toBe(CLOCK_START + 6);
  });

  it('illegal transitions return 409 and change nothing', async () => {
    const s = createSqliteStore(file());
    const r1 = await s.act('a', 'OPS-103', 'approve', {});
    const r2 = await s.act('a', 'OPS-101', 'simulate-send', {});
    const r3 = await s.act('a', 'OPS-108', 'request-approval', {});
    for (const r of [r1, r2, r3]) expect(r).toMatchObject({ ok: false, status: 409 });
    const snap = await s.snapshot('a');
    expect(snap.clockMin).toBe(CLOCK_START);
    expect((await s.log('a')).every((l) => l.seeded)).toBe(true);
  });

  it('unknown item is 404', async () => {
    expect(await createSqliteStore(file()).act('a', 'OPS-999', 'approve', {})).toMatchObject({ ok: false, status: 404 });
  });

  it('reject logs the reason and returns to DRAFTED; revise persists', async () => {
    const s = createSqliteStore(file());
    const r = await s.act('a', 'OPS-101', 'reject', { reason: 'wrong date' });
    expect(r.ok && r.item.status).toBe('DRAFTED');
    expect((await s.log('a', 'OPS-101'))[0].text).toContain('wrong date');
    await s.act('a', 'OPS-101', 'revise', { draft: 'Revised text' });
    expect((await s.getItem('a', 'OPS-101'))?.draft).toBe('Revised text');
    expect((await s.getItem('a', 'OPS-101'))?.status).toBe('DRAFTED');
  });

  it('persists across reopen', async () => {
    const f = file();
    await createSqliteStore(f).act('a', 'OPS-103', 'request-approval', {});
    const s2 = createSqliteStore(f);
    expect((await s2.getItem('a', 'OPS-103'))?.status).toBe('NEEDS_APPROVAL');
    expect((await s2.snapshot('a')).clockMin).toBe(CLOCK_START + 2);
  });

  it('isolates owners; reset restores only the caller', async () => {
    const s = createSqliteStore(file());
    await s.act('a', 'OPS-103', 'request-approval', {});
    await s.act('b', 'OPS-106', 'revise', { draft: 'b edit' });
    expect((await s.getItem('b', 'OPS-103'))?.status).toBe('DRAFTED');
    expect((await s.getItem('a', 'OPS-106'))?.draft).not.toBe('b edit');
    await s.reset('a');
    expect((await s.getItem('a', 'OPS-103'))?.status).toBe('DRAFTED');
    expect((await s.snapshot('a')).clockMin).toBe(CLOCK_START);
    expect((await s.log('a')).every((l) => l.seeded)).toBe(true);
    expect((await s.getItem('b', 'OPS-106'))?.draft).toBe('b edit');
  });

  it('rate limit: allows N writes per hour per owner, then refuses; new hour resets', async () => {
    const s = createSqliteStore(file());
    const now = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) expect(await s.allowWrite('a', 5, now)).toBe(true);
    expect(await s.allowWrite('a', 5, now)).toBe(false);
    expect(await s.allowWrite('b', 5, now)).toBe(true);
    expect(await s.allowWrite('a', 5, now + 3_600_000)).toBe(true);
  });
});
