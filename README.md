# Ops Desk (independent demo)

A persisted operations inbox for the fictional "Demo Pet Supply Co" (2 locations). Agent-drafted replies move through a server-enforced approval state machine: DRAFTED -> NEEDS_APPROVAL -> APPROVED -> SENT (simulated). Every transition is validated server-side, appended to an activity log and advances a deterministic demo clock (starts 14:30, +2 min per action).

**All data is synthetic. Nothing is ever sent or received.** "SENT" means "simulated send - nothing was sent".

Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Async.

## Run

```
npm install
npm run dev        # or: npm run build && npm start
npm test
```

- SQLite file `opsdesk.db` by default (override with `OPSDESK_DB`). Set `DATABASE_URL` to use Postgres (see IMPLEMENTATION.md for its verification status).
- Set `COOKIE_SECURE=1` behind HTTPS.
- Each visitor gets an httpOnly `od_uid` cookie and their own seeded inbox; Reset restores it.

See IMPLEMENTATION.md for the data model, endpoints and verification results.
