import type { presentInbox, presentItem, presentLog } from '@/lib/present';

export type Inbox = ReturnType<typeof presentInbox>;
export type Item = ReturnType<typeof presentItem>;
export type LogEntry = ReturnType<typeof presentLog>;
