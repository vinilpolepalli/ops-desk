import { route } from '@/lib/api';
import { presentInbox } from '@/lib/present';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  const s = await store.snapshot(owner);
  return presentInbox(s.clockMin, s.items);
});
