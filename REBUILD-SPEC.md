# Ops Desk v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Async (withasync.com, YC S26): AI agents that run small businesses - specialized agents deployed inside law firms, clinics, real-estate and childcare businesses to automate complex operational work. Ops Desk demonstrates the human-in-the-loop core: a persisted operations inbox where agent-drafted replies move through a real approval state machine (draft, needs approval, approved, simulated-send), with every transition enforced server-side and logged.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness (pure functions). NOTHING is ever actually sent - "send" is a simulated terminal state, labeled as such everywhere.

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export'). Model the architecture on ~/proj/marengo-grid-plan (lib/api.ts route helper, lib/db drizzle store, lib/validate.ts, owner cookie, rate limiting) - read it first.
- Drizzle ORM: SQLite (opsdesk.db) dev; Postgres via DATABASE_URL prod.
- The state machine (DRAFTED -> NEEDS_APPROVAL -> APPROVED -> SENT[simulated]; NEEDS_APPROVAL --reject--> DRAFTED) is the pure tested core, server-side, unit-tested (npm test). Illegal transitions return 409 with the reason.
- Demo clock: starts 14:30, advances 2 min per action; deterministic, labeled "demo clock" in UI. Clock state persists per owner.

## Product workflow (fitted to THIS product)
1. Home = the operations inbox for fictional "Demo Pet Supply Co" (2 locations): status filter chips with counts + item list; first useful action above the fold on mobile.
2. ~10 seeded synthetic items (type, source, subject, body, agent draft, received-at on the demo clock).
3. Item detail: the synthetic inbound message, the agent draft labeled "agent draft - synthetic, requires human approval", and the workflow actions valid for the current state only: Request approval (from DRAFTED), Approve / Reject (from NEEDS_APPROVAL), Simulate send (from APPROVED, labeled simulated), Revise draft (edits the draft text, stays in DRAFTED).
4. Every transition is a server mutation that validates the current state, appends to an append-only activity log with demo-clock timestamps, and advances the clock. Reject requires a reason (recorded in the log; draft returns to DRAFTED for revision).
5. Activity log panel: real actions taken through the API this session, plus seeded entries marked "seeded".
6. Stats strip computed server-side from live state, labeled sample stats: handled, awaiting approval, avg response minutes.
7. Reset-to-demo button restores the seeded inbox. Fresh visitors get the seeded inbox; edits are their own.

## Truthfulness bar
- Header badge "Sample data - demo"; every item/email/draft synthetic; nothing is sent or received; "SENT" state labeled "simulated send - nothing was sent".
- Every draft labeled "agent draft - synthetic, requires human approval".
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Async."

## Abuse and isolation controls
- Owner cookie (od_uid, httpOnly); all data owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner persisted in DB, 413 at 20KB; inputs validated (draft text length cap, reject reason required and capped).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono where it aids scanning. NOT the old dark/teal theme (teal is a sibling's accent).
- Brand accent: deep gold #a16207 (hover #854d0e). Deliberate: brass/ledger read for an operations desk; clearly gold-olive, distinct from sibling bronze #b45309 (orange-brown), olive #4d7c0f (green) and every other sibling accent; not the indigo/violet band, no amber-50 fills. Comment the rationale in tailwind.config.ts.
- Pills only for status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards.
- Layout fitted to a two-pane ops inbox (list left, detail right, log below), not a clone of sibling demos. Mobile: stacked, detail below list.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; walk one item through the full legal path (request approval, approve, simulate send) and verify each transition, the log entries, and the clock advancing 2 min per action; verify illegal transitions 409 (approve from DRAFTED, simulate send from NEEDS_APPROVAL, etc.); reject with reason returns to DRAFTED and logs the reason; revise draft persists; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: od2-inbox.png, od2-detail.png, od2-log.png, od2-mobile.png (390px) from the RUNNING app.
