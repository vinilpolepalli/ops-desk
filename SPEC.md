# Ops Desk — SPEC

Independent demo inspired by the problem space of Async (YC S26). NOT affiliated. Fictional business: "Demo Pet Supply Co" (2 locations).

## Honesty requirements
- Header badge "Sample data - demo"; intro copy: every item/email/draft is synthetic; state machine is a local illustration; nothing is sent or received.
- Every draft labeled "agent draft - synthetic, requires human approval".
- Footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Async."
- No runtime external calls (no fonts/CDN/fetch).

## State machine (local, in-memory)
DRAFTED --Request approval--> NEEDS APPROVAL --Approve--> APPROVED --Simulate send--> SENT
NEEDS APPROVAL --Reject--> DRAFTED (agent revises). Every transition appends to the activity log.
Demo clock: starts 14:30, advances 2 min per action (deterministic, not real time).

## Slices
1. Scaffold: Next.js static export (output:'export'), TS, dark theme, teal #14b8a6.
2. Synthetic data (~10 items: type, source, status, draft, received/responded minutes).
3. Status filter chips with counts + item list.
4. Item detail with labeled draft + Approve/Reject (+ Request approval / Simulate send).
5. Activity log panel with demo-clock timestamps.
6. Stats strip (handled, awaiting approval, avg response) labeled sample stats; derived from state.
7. Responsive: desktop two-pane; at 390px stacked, detail shown below/over list, no horizontal scroll.
8. `npm run build` passes.
