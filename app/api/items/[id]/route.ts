import { route } from '@/lib/api';
import { presentItem, presentLog } from '@/lib/present';
import { HttpError, parseItemId } from '@/lib/validate';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
type P = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, p: P) => {
  const { id } = await p.params;
  return route(false, async ({ owner, store }) => {
    const itemId = parseItemId(id);
    const item = await store.getItem(owner, itemId);
    if (!item) throw new HttpError(404, 'item not found');
    return { item: presentItem(item), log: (await store.log(owner, itemId)).map(presentLog) };
  })(req);
};
