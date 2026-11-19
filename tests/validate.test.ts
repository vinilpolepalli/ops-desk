import { describe, expect, it } from 'vitest';
import { HttpError, LIMITS, parseAction, parseItemId, parsePayload } from '../lib/validate';

const code = (f: () => unknown) => { try { f(); return 0; } catch (e) { return e instanceof HttpError ? e.status : -1; } };

describe('validate', () => {
  it('actions', () => {
    expect(parseAction('approve')).toBe('approve');
    expect(code(() => parseAction('delete'))).toBe(404);
  });
  it('item ids', () => {
    expect(parseItemId('OPS-101')).toBe('OPS-101');
    expect(code(() => parseItemId('../x'))).toBe(400);
    expect(code(() => parseItemId('A'.repeat(33)))).toBe(400);
  });
  it('reject reason required and capped', () => {
    expect(code(() => parsePayload('reject', undefined))).toBe(400);
    expect(code(() => parsePayload('reject', { reason: '   ' }))).toBe(400);
    expect(code(() => parsePayload('reject', { reason: 5 }))).toBe(400);
    expect(code(() => parsePayload('reject', { reason: 'x'.repeat(LIMITS.reasonMax + 1) }))).toBe(400);
    expect(parsePayload('reject', { reason: ' too long ' })).toEqual({ reason: 'too long' });
  });
  it('revise draft required and capped', () => {
    expect(code(() => parsePayload('revise', {}))).toBe(400);
    expect(code(() => parsePayload('revise', { draft: 'x'.repeat(LIMITS.draftMax + 1) }))).toBe(400);
    expect(parsePayload('revise', { draft: 'ok' })).toEqual({ draft: 'ok' });
  });
  it('rejects unknown fields and non-objects', () => {
    expect(code(() => parsePayload('approve', { x: 1 }))).toBe(400);
    expect(code(() => parsePayload('approve', []))).toBe(400);
    expect(parsePayload('approve', undefined)).toEqual({});
  });
});
