import { describe, expect, it } from 'vitest';
import {
  ACTIONS, applyAction, CLOCK_START, computeCounts, computeStats, formatClock, legalActions, RULES, STATUSES,
  type ActionName, type Status, type Workflow,
} from '../lib/machine';
import { SEED_ITEMS, seedLog } from '../lib/seed';

const w = (status: Status): Workflow => ({ status, draft: 'orig', respondedMin: null });
const payload = { reason: 'tone too casual', draft: 'new text' };

describe('transition table', () => {
  for (const a of ACTIONS) for (const s of STATUSES) {
    const legal = RULES[a].from === s;
    it(`${a} from ${s} is ${legal ? 'legal' : '409'}`, () => {
      const r = applyAction(w(s), a, payload, CLOCK_START);
      if (legal) {
        expect(r.ok).toBe(true);
        if (r.ok) { expect(r.item.status).toBe(RULES[a].to); expect(r.clockMin).toBe(CLOCK_START + 2); }
      } else {
        expect(r).toMatchObject({ ok: false, status: 409 });
        if (!r.ok) expect(r.reason).toContain(s);
      }
    });
  }
});

describe('happy path', () => {
  it('walks DRAFTED to SENT, advancing the clock 2 min per action', () => {
    let item = w('DRAFTED'); let clock = CLOCK_START;
    const seen: string[] = [];
    for (const a of ['request-approval', 'approve', 'simulate-send'] as ActionName[]) {
      const r = applyAction(item, a, {}, clock);
      if (!r.ok) throw new Error(r.reason);
      item = r.item; clock = r.clockMin; seen.push(item.status);
    }
    expect(seen).toEqual(['NEEDS_APPROVAL', 'APPROVED', 'SENT']);
    expect(clock).toBe(CLOCK_START + 6);
    expect(item.respondedMin).toBe(CLOCK_START + 6);
  });
  it('SENT is terminal', () => {
    expect(legalActions('SENT')).toEqual([]);
  });
});

describe('payloads', () => {
  it('reject requires a reason, returns to DRAFTED and records it', () => {
    expect(applyAction(w('NEEDS_APPROVAL'), 'reject', {}, 0)).toMatchObject({ ok: false, status: 400 });
    expect(applyAction(w('NEEDS_APPROVAL'), 'reject', { reason: '  ' }, 0)).toMatchObject({ ok: false, status: 400 });
    const r = applyAction(w('NEEDS_APPROVAL'), 'reject', { reason: 'wrong price' }, 0);
    expect(r.ok && r.item.status).toBe('DRAFTED');
    expect(r.ok && r.event.text).toContain('wrong price');
  });
  it('revise replaces the draft and stays DRAFTED', () => {
    const r = applyAction(w('DRAFTED'), 'revise', { draft: 'better' }, 10);
    expect(r.ok && r.item).toMatchObject({ status: 'DRAFTED', draft: 'better' });
    expect(applyAction(w('DRAFTED'), 'revise', {}, 10)).toMatchObject({ ok: false, status: 400 });
  });
  it('refusals do not advance the clock or mutate input', () => {
    const item = w('DRAFTED');
    expect(applyAction(item, 'approve', {}, 5)).toMatchObject({ ok: false });
    expect(item).toEqual(w('DRAFTED'));
  });
  it('is deterministic', () => {
    expect(applyAction(w('DRAFTED'), 'request-approval', {}, 7)).toEqual(applyAction(w('DRAFTED'), 'request-approval', {}, 7));
  });
});

describe('clock, stats, seeds', () => {
  it('formats the demo clock', () => {
    expect(formatClock(CLOCK_START)).toBe('14:30');
    expect(formatClock(CLOCK_START + 2)).toBe('14:32');
    expect(formatClock(24 * 60 + 5)).toBe('00:05');
  });
  it('computes stats from state', () => {
    const s = computeStats([
      { status: 'SENT', receivedMin: 100, respondedMin: 130 },
      { status: 'SENT', receivedMin: 100, respondedMin: 125 },
      { status: 'NEEDS_APPROVAL', receivedMin: 100, respondedMin: null },
      { status: 'DRAFTED', receivedMin: 100, respondedMin: null },
    ]);
    expect(s).toEqual({ handled: 2, awaitingApproval: 1, avgResponseMins: 27.5 });
    expect(computeStats([]).avgResponseMins).toBeNull();
  });
  it('seed data: ~10 items, consistent counts, log not in the future', () => {
    expect(SEED_ITEMS.length).toBe(10);
    expect(computeCounts(SEED_ITEMS)).toMatchObject({ ALL: 10, DRAFTED: 3, NEEDS_APPROVAL: 4, APPROVED: 1, SENT: 2 });
    for (const l of seedLog()) expect(l.clockMin).toBeLessThanOrEqual(CLOCK_START);
    for (const i of SEED_ITEMS) expect(i.status === 'SENT').toBe(i.respondedMin !== null);
  });
});
