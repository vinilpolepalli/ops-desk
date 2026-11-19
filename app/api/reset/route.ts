import { route } from '@/lib/api';
import { presentInbox } from '@/lib/present';

export const dynamic = 'force-dynamic';

export const POST = route(true, async ({ owner, store }) => {
  await store.reset(owner);
  const s = await store.snapshot(owner);
  return presentInbox(s.clockMin, s.items);
});
