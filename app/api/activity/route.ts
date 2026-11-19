import { route } from '@/lib/api';
import { presentLog } from '@/lib/present';

export const dynamic = 'force-dynamic';

export const GET = route(false, async ({ owner, store }) => {
  return { log: (await store.log(owner)).map(presentLog) };
});
