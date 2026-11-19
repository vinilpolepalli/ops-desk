import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { applyAction, CLOCK_START, type Status } from '../machine';
import { seedItemRows, seedLogRows, type ActResult, type ItemRow, type LogRow, type Store } from './store';

export const items = sqliteTable('items', {
  ownerId: text('owner_id').notNull(),
  id: text('id').notNull(),
  type: text('type').notNull(),
  source: text('source').notNull(),
  fromAddr: text('from_addr').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  draftKind: text('draft_kind').notNull(),
  draft: text('draft').notNull(),
  status: text('status').notNull(),
  receivedMin: integer('received_min').notNull(),
  respondedMin: integer('responded_min'),
  updatedMin: integer('updated_min').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.id] })]);

export const activity = sqliteTable('activity', {
  ownerId: text('owner_id').notNull(),
  seq: integer('seq').notNull(),
  clockMin: integer('clock_min').notNull(),
  itemId: text('item_id'),
  action: text('action'),
  text: text('text').notNull(),
  seeded: integer('seeded').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.seq] })]);

export const clocks = sqliteTable('clocks', {
  ownerId: text('owner_id').primaryKey(),
  clockMin: integer('clock_min').notNull(),
});

export const writeCounts = sqliteTable('write_counts', {
  ownerId: text('owner_id').notNull(),
  bucket: integer('bucket').notNull(),
  count: integer('count').notNull(),
}, (t) => [primaryKey({ columns: [t.ownerId, t.bucket] })]);

const toItem = (r: typeof items.$inferSelect): ItemRow => ({
  id: r.id, type: r.type, source: r.source, fromAddr: r.fromAddr, subject: r.subject, body: r.body,
  draftKind: r.draftKind, draft: r.draft, status: r.status as Status,
  receivedMin: r.receivedMin, respondedMin: r.respondedMin, updatedMin: r.updatedMin,
});
const toLog = (r: typeof activity.$inferSelect): LogRow => ({
  seq: r.seq, clockMin: r.clockMin, itemId: r.itemId, action: r.action, text: r.text, seeded: r.seeded === 1,
});

export function createSqliteStore(file: string): Store {
  const raw = new Database(file);
  raw.pragma('journal_mode = WAL');
  raw.exec(`
    CREATE TABLE IF NOT EXISTS items (owner_id TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, source TEXT NOT NULL, from_addr TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, draft_kind TEXT NOT NULL, draft TEXT NOT NULL, status TEXT NOT NULL, received_min INTEGER NOT NULL, responded_min INTEGER, updated_min INTEGER NOT NULL, PRIMARY KEY(owner_id, id));
    CREATE TABLE IF NOT EXISTS activity (owner_id TEXT NOT NULL, seq INTEGER NOT NULL, clock_min INTEGER NOT NULL, item_id TEXT, action TEXT, text TEXT NOT NULL, seeded INTEGER NOT NULL, PRIMARY KEY(owner_id, seq));
    CREATE TABLE IF NOT EXISTS clocks (owner_id TEXT PRIMARY KEY, clock_min INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS write_counts (owner_id TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(owner_id, bucket));
  `);
  const db = drizzle(raw);
  type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

  function seed(tx: Tx, owner: string) {
    tx.insert(clocks).values({ ownerId: owner, clockMin: CLOCK_START }).run();
    tx.insert(items).values(seedItemRows().map((i) => ({ ...i, ownerId: owner }))).run();
    tx.insert(activity).values(seedLogRows().map((l) => ({
      ownerId: owner, seq: l.seq, clockMin: l.clockMin, itemId: l.itemId, action: l.action, text: l.text, seeded: 1,
    }))).run();
  }
  const ensure = (tx: Tx, owner: string) => {
    if (!tx.select().from(clocks).where(eq(clocks.ownerId, owner)).get()) seed(tx, owner);
  };
  const clockOf = (tx: Tx, owner: string) => tx.select().from(clocks).where(eq(clocks.ownerId, owner)).get()!.clockMin;

  return {
    async snapshot(owner) {
      return db.transaction((tx) => {
        ensure(tx, owner);
        const rows = tx.select().from(items).where(eq(items.ownerId, owner)).orderBy(asc(items.id)).all();
        return { clockMin: clockOf(tx, owner), items: rows.map(toItem) };
      });
    },
    async getItem(owner, id) {
      return db.transaction((tx) => {
        ensure(tx, owner);
        const r = tx.select().from(items).where(and(eq(items.ownerId, owner), eq(items.id, id))).get();
        return r ? toItem(r) : null;
      });
    },
    async log(owner, itemId) {
      return db.transaction((tx) => {
        ensure(tx, owner);
        const cond = itemId ? and(eq(activity.ownerId, owner), eq(activity.itemId, itemId)) : eq(activity.ownerId, owner);
        return tx.select().from(activity).where(cond).orderBy(desc(activity.seq)).all().map(toLog);
      });
    },
    async act(owner, itemId, action, payload): Promise<ActResult> {
      return db.transaction((tx) => {
        ensure(tx, owner);
        const row = tx.select().from(items).where(and(eq(items.ownerId, owner), eq(items.id, itemId))).get();
        if (!row) return { ok: false, status: 404, reason: 'item not found' } as const;
        const clock = clockOf(tx, owner);
        const out = applyAction({ status: row.status as Status, draft: row.draft, respondedMin: row.respondedMin }, action, payload, clock);
        if (!out.ok) return out;
        tx.update(items).set({ status: out.item.status, draft: out.item.draft, respondedMin: out.item.respondedMin, updatedMin: out.clockMin })
          .where(and(eq(items.ownerId, owner), eq(items.id, itemId))).run();
        tx.update(clocks).set({ clockMin: out.clockMin }).where(eq(clocks.ownerId, owner)).run();
        const seq = (tx.select({ m: sql<number>`coalesce(max(${activity.seq}), 0)` }).from(activity).where(eq(activity.ownerId, owner)).get()?.m ?? 0) + 1;
        const entry: LogRow = { seq, clockMin: out.clockMin, itemId, action, text: `${itemId} ${out.event.text}`, seeded: false };
        tx.insert(activity).values({ ownerId: owner, seq, clockMin: entry.clockMin, itemId, action, text: entry.text, seeded: 0 }).run();
        const fresh = tx.select().from(items).where(and(eq(items.ownerId, owner), eq(items.id, itemId))).get()!;
        return { ok: true, item: toItem(fresh), clockMin: out.clockMin, entry } as const;
      });
    },
    async reset(owner) {
      db.transaction((tx) => {
        tx.delete(items).where(eq(items.ownerId, owner)).run();
        tx.delete(activity).where(eq(activity.ownerId, owner)).run();
        tx.delete(clocks).where(eq(clocks.ownerId, owner)).run();
        seed(tx, owner);
      });
    },
    async allowWrite(owner, limit, now = Date.now()) {
      const bucket = Math.floor(now / 3_600_000);
      return db.transaction((tx) => {
        tx.insert(writeCounts).values({ ownerId: owner, bucket, count: 0 }).onConflictDoNothing().run();
        const cur = tx.select().from(writeCounts).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).get()!;
        if (cur.count >= limit) return false;
        tx.update(writeCounts).set({ count: sql`${writeCounts.count} + 1` }).where(and(eq(writeCounts.ownerId, owner), eq(writeCounts.bucket, bucket))).run();
        tx.delete(writeCounts).where(sql`${writeCounts.bucket} < ${bucket}`).run();
        return true;
      });
    },
  };
}
