import { Pool, type PoolClient } from 'pg';
import { applyAction, CLOCK_START, type Status } from '../machine';
import { seedItemRows, seedLogRows, type ActResult, type ItemRow, type LogRow, type Store } from './store';

// Postgres implementation for production (DATABASE_URL). Same tables and semantics as the SQLite store.
// It has not been exercised against a live Postgres in this repo's verification (see IMPLEMENTATION.md).
type IRow = {
  id: string; type: string; source: string; from_addr: string; subject: string; body: string; draft_kind: string;
  draft: string; status: string; received_min: number; responded_min: number | null; updated_min: number;
};
type LRow = { seq: number; clock_min: number; item_id: string | null; action: string | null; text: string; seeded: number };
const toItem = (r: IRow): ItemRow => ({
  id: r.id, type: r.type, source: r.source, fromAddr: r.from_addr, subject: r.subject, body: r.body,
  draftKind: r.draft_kind, draft: r.draft, status: r.status as Status,
  receivedMin: r.received_min, respondedMin: r.responded_min, updatedMin: r.updated_min,
});
const toLog = (r: LRow): LogRow => ({ seq: r.seq, clockMin: r.clock_min, itemId: r.item_id, action: r.action, text: r.text, seeded: r.seeded === 1 });

export async function createPgStore(url: string): Promise<Store> {
  const pool = new Pool({ connectionString: url });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (owner_id TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, source TEXT NOT NULL, from_addr TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, draft_kind TEXT NOT NULL, draft TEXT NOT NULL, status TEXT NOT NULL, received_min INTEGER NOT NULL, responded_min INTEGER, updated_min INTEGER NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS activity (owner_id TEXT NOT NULL, seq INTEGER NOT NULL, clock_min INTEGER NOT NULL, item_id TEXT, action TEXT, text TEXT NOT NULL, seeded INTEGER NOT NULL, PRIMARY KEY(owner_id, seq));
    CREATE TABLE IF NOT EXISTS clocks (owner_id TEXT PRIMARY KEY, clock_min INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket BIGINT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);

  async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const out = await fn(c);
      await c.query('COMMIT');
      return out;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally { c.release(); }
  }

  async function seed(c: PoolClient, owner: string) {
    await c.query('INSERT INTO clocks (owner_id, clock_min) VALUES ($1,$2)', [owner, CLOCK_START]);
    for (const i of seedItemRows()) {
      await c.query(
        'INSERT INTO items (owner_id,id,type,source,from_addr,subject,body,draft_kind,draft,status,received_min,responded_min,updated_min) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [owner, i.id, i.type, i.source, i.fromAddr, i.subject, i.body, i.draftKind, i.draft, i.status, i.receivedMin, i.respondedMin, i.updatedMin],
      );
    }
    for (const l of seedLogRows()) {
      await c.query('INSERT INTO activity (owner_id,seq,clock_min,item_id,action,text,seeded) VALUES ($1,$2,$3,$4,$5,$6,1)', [owner, l.seq, l.clockMin, l.itemId, l.action, l.text]);
    }
  }
  /** Serialise per owner with a transaction-scoped advisory lock, then seed if new. */
  async function ensure(c: PoolClient, owner: string) {
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [owner]);
    const r = await c.query('SELECT 1 FROM clocks WHERE owner_id=$1', [owner]);
    if (!r.rowCount) await seed(c, owner);
  }

  return {
    async snapshot(owner) {
      return tx(async (c) => {
        await ensure(c, owner);
        const rows = await c.query<IRow>('SELECT * FROM items WHERE owner_id=$1 ORDER BY id', [owner]);
        const clock = await c.query<{ clock_min: number }>('SELECT clock_min FROM clocks WHERE owner_id=$1', [owner]);
        return { clockMin: clock.rows[0].clock_min, items: rows.rows.map(toItem) };
      });
    },
    async getItem(owner, id) {
      return tx(async (c) => {
        await ensure(c, owner);
        const r = await c.query<IRow>('SELECT * FROM items WHERE owner_id=$1 AND id=$2', [owner, id]);
        return r.rows[0] ? toItem(r.rows[0]) : null;
      });
    },
    async log(owner, itemId) {
      return tx(async (c) => {
        await ensure(c, owner);
        const r = itemId
          ? await c.query<LRow>('SELECT * FROM activity WHERE owner_id=$1 AND item_id=$2 ORDER BY seq DESC', [owner, itemId])
          : await c.query<LRow>('SELECT * FROM activity WHERE owner_id=$1 ORDER BY seq DESC', [owner]);
        return r.rows.map(toLog);
      });
    },
    async act(owner, itemId, action, payload): Promise<ActResult> {
      return tx(async (c) => {
        await ensure(c, owner);
        const r = await c.query<IRow>('SELECT * FROM items WHERE owner_id=$1 AND id=$2 FOR UPDATE', [owner, itemId]);
        if (!r.rows[0]) return { ok: false, status: 404, reason: 'item not found' } as const;
        const row = r.rows[0];
        const clock = (await c.query<{ clock_min: number }>('SELECT clock_min FROM clocks WHERE owner_id=$1', [owner])).rows[0].clock_min;
        const out = applyAction({ status: row.status as Status, draft: row.draft, respondedMin: row.responded_min }, action, payload, clock);
        if (!out.ok) return out;
        const upd = await c.query<IRow>(
          'UPDATE items SET status=$3, draft=$4, responded_min=$5, updated_min=$6 WHERE owner_id=$1 AND id=$2 RETURNING *',
          [owner, itemId, out.item.status, out.item.draft, out.item.respondedMin, out.clockMin],
        );
        await c.query('UPDATE clocks SET clock_min=$2 WHERE owner_id=$1', [owner, out.clockMin]);
        const seq = (await c.query<{ m: number }>('SELECT COALESCE(MAX(seq),0)+1 AS m FROM activity WHERE owner_id=$1', [owner])).rows[0].m;
        const text = `${itemId} ${out.event.text}`;
        await c.query('INSERT INTO activity (owner_id,seq,clock_min,item_id,action,text,seeded) VALUES ($1,$2,$3,$4,$5,$6,0)', [owner, seq, out.clockMin, itemId, action, text]);
        return { ok: true, item: toItem(upd.rows[0]), clockMin: out.clockMin, entry: { seq, clockMin: out.clockMin, itemId, action, text, seeded: false } } as const;
      });
    },
    async reset(owner) {
      await tx(async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [owner]);
        for (const t of ['items', 'activity', 'clocks']) await c.query(`DELETE FROM ${t} WHERE owner_id=$1`, [owner]);
        await seed(c, owner);
      });
    },
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      const r = await pool.query(
        `INSERT INTO write_counts (owner_id, bucket, count) VALUES ($1,$2,1)
         ON CONFLICT (owner_id, bucket) DO UPDATE SET count = write_counts.count + 1 WHERE write_counts.count < $3 RETURNING count`,
        [owner, bucket, limit],
      );
      return (r.rowCount ?? 0) > 0;
    },
  };
}
