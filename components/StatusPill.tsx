import type { Status } from '@/lib/machine';
import { STATUS_LABEL } from '@/lib/machine';

const TONE: Record<Status, string> = {
  DRAFTED: 'border-hair text-muted',
  NEEDS_APPROVAL: 'border-gold text-gold',
  APPROVED: 'border-ink text-ink',
  SENT: 'border-hair bg-sunk text-ink',
};

const PILL = 'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs'; // unslop-ignore: status pills are the spec's one pill use

export default function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`${PILL} ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
