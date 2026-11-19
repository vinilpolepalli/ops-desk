# Implementation

## Architecture
Next.js App Router (server runtime), TypeScript, Tailwind 3. Modeled on marengo-grid-plan: `lib/api.ts` route wrapper, `lib/db/{store,sqlite,pg}.ts`, `lib/validate.ts`.

- `lib/machine.ts` - pure core: transition table, `applyAction`, demo clock, stats, counts. No I/O, no randomness.
- `lib/seed.ts` - 10 synthetic items and seeded log entries.
- `lib/validate.ts` - ids, action names, payload shape and caps (draft <= 4000 chars, reject reason 1-280 chars, unknown fields refused).
- `lib/db/store.ts` - `Store` interface; `sqlite.ts` (drizzle + better-sqlite3), `pg.ts` (pg, same semantics).
- `lib/present.ts` - API shapes, labels and disclaimers.
- `components/` - Desk (two-pane inbox, stats, log), ItemDetail, StatusPill.

## State machine
| action | from | to |
|---|---|---|
| request-approval | DRAFTED | NEEDS_APPROVAL |
| approve | NEEDS_APPROVAL | APPROVED |
| reject (reason required) | NEEDS_APPROVAL | DRAFTED |
| simulate-send | APPROVED | SENT |
| revise (draft text) | DRAFTED | DRAFTED |

Anything else is 409 with the reason; payload problems are 400. The clock advances (+2 min) and a log entry is appended only on success. The store runs validate + mutate + log + clock in one transaction.

## Data model (per owner; all tables keyed by owner_id)
- `items(owner_id, id, type, source, from_addr, subject, body, draft_kind, draft, status, received_min, responded_min, updated_min)`
- `activity(owner_id, seq, clock_min, item_id, action, text, seeded)` - append-only; seeded rows flagged.
- `clocks(owner_id, clock_min)`
- `write_counts(owner_id, bucket, count)` - hourly buckets, persisted.

Owners are seeded lazily on first access. Item ids are looked up within the caller's owner namespace, so one owner can never read or change another's data.

## Endpoints
| method | path | notes |
|---|---|---|
| GET | /api/inbox | items, status counts, clock, stats |
| GET | /api/items/:id | item + its log; 404 unknown |
| POST | /api/items/:id/:action | request-approval, approve, reject, simulate-send, revise; returns item, log entry, clock |
| GET | /api/activity | full log, newest first |
| POST | /api/reset | restore seeded inbox/log/clock |

Writes: same-origin check (403), 20KB cap (413), 120 writes/hour/owner (429), invalid JSON 400. A write is counted before validation, so refused requests also consume quota.

## Stats
handled = SENT count; awaiting = NEEDS_APPROVAL count; avg response = mean of (simulated-send time - received time) over SENT items, so items sent in a live session count their full wait since receipt on the demo clock (the seeded average is 26.0 min and rises as later items are sent). Labeled "sample stats".

## Verification (run on this machine)
- `npm test`: 42 tests pass (machine transition matrix, payloads, stats, validators, sqlite store incl. persistence across reopen, owner isolation, reset, rate limit).
- `npm run build`: passes; `tsc --noEmit` clean.
- Live server (`next start`, curl): approve from DRAFTED -> 409; request-approval, approve, simulate-send walked on OPS-103 with clock 14:30 -> 14:36 and three log entries; reject without reason -> 400; reject with reason returns to DRAFTED and logs the reason (clock 14:38 after four successful actions); revise persisted and survived a server restart, as did item status and clock; a second cookie-less client saw an untouched inbox (isolation); 30KB body -> 413; cross-origin POST -> 403; 125 writes by one owner -> 120 handled (409s here) then 5 x 429; reset returned the clock to 14:30.
- Browser (system Chrome via Playwright): walked OPS-101 through approve and simulate send in the UI; no horizontal scroll at 390px. Screenshots: /tmp/od2-inbox.png, od2-detail.png, od2-log.png, od2-mobile.png.
- `python3 ~/unslop/devibe_scan.py .`: 0 findings; two inline `unslop-ignore` comments, both for the status pill / filter chip shapes the spec calls for.

## Not verified
- The Postgres store (`lib/db/pg.ts`) has not been run against a live Postgres.
- No deployment was done and nothing was committed.
