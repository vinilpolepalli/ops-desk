// Synthetic seed data for the fictional "Demo Pet Supply Co" (2 locations). Nothing here is real.
import { CLOCK_START, type Status } from './machine';

export const BUSINESS = { name: 'Demo Pet Supply Co', locations: ['Downtown', 'Eastside'] };

export interface SeedItem {
  id: string; type: string; source: string; fromAddr: string; subject: string; body: string;
  draftKind: string; draft: string; status: Status;
  receivedMin: number; draftedMin: number; respondedMin: number | null;
}
export interface SeedLog { clockMin: number; itemId: string | null; text: string }

const t = (h: number, m: number) => h * 60 + m;

export const SEED_ITEMS: SeedItem[] = [
  { id: 'OPS-101', type: 'Supplier', source: 'Synthetic email', fromAddr: 'orders@northfield-feed.example',
    subject: 'Shipment #4471 delayed 3 days',
    body: 'Hello Demo Pet Supply, a carrier backlog has delayed shipment #4471 (kibble pallet, 24 bags). New ETA is Friday. Apologies for the trouble.',
    draftKind: 'Reply draft to supplier',
    draft: 'Hi Northfield team,\n\nThanks for the heads-up on shipment #4471. Friday works for the Eastside store, but please prioritize the grain-free line. Could you confirm whether a partial delivery Wednesday is possible?\n\nThanks,\nDemo Pet Supply Co',
    status: 'NEEDS_APPROVAL', receivedMin: t(9, 12), draftedMin: t(9, 16), respondedMin: null },
  { id: 'OPS-102', type: 'Scheduling', source: 'Synthetic email', fromAddr: 'jamie.r@staff.example',
    subject: 'Can I swap Saturday shift with Priya?',
    body: 'Hi, Priya said she is happy to swap Saturday with me at Downtown (I would close, she would open). Is that ok?',
    draftKind: 'Adjusted schedule',
    draft: 'Saturday, Downtown:\n- Open (9:00-3:00): Priya (was Jamie)\n- Close (3:00-8:00): Jamie (was Priya)\n\nCoverage stays at 2 staff. No overtime impact.',
    status: 'NEEDS_APPROVAL', receivedMin: t(9, 40), draftedMin: t(9, 46), respondedMin: null },
  { id: 'OPS-103', type: 'Invoice', source: 'Synthetic system', fromAddr: 'billing@paws-packaging.example',
    subject: 'Invoice 2208 due in 3 days',
    body: 'Automated notice: invoice 2208 for $1,240.00 (synthetic) is due Thursday. No dispute is on file.',
    draftKind: 'Payment reminder note',
    draft: 'Reminder: Paws Packaging invoice 2208 ($1,240.00, synthetic) is due Thursday. Proposed action: schedule payment Wednesday from operating account.',
    status: 'DRAFTED', receivedMin: t(10, 5), draftedMin: t(10, 8), respondedMin: null },
  { id: 'OPS-104', type: 'Inventory', source: 'Synthetic alert', fromAddr: 'inventory-monitor',
    subject: 'Low stock: cat litter 20lb (Downtown)',
    body: 'Stock alert: 4 units of cat litter 20lb remain at Downtown. Typical weekly sales are 15 units.',
    draftKind: 'Reorder draft',
    draft: 'Reorder 3 cases (36 units) of cat litter 20lb from Northfield Supply. Estimated cost $432.00 (synthetic). Delivery to Downtown.',
    status: 'NEEDS_APPROVAL', receivedMin: t(10, 21), draftedMin: t(10, 23), respondedMin: null },
  { id: 'OPS-105', type: 'Customer', source: 'Synthetic email', fromAddr: 'sam.k@customer.example',
    subject: 'Refund request: dog harness too small',
    body: 'Hi, I bought a dog harness 6 days ago and it is too small. It has not been used. Could I get a refund?',
    draftKind: 'Reply draft to customer',
    draft: "Hi Sam,\n\nSorry the harness didn't fit! It's within our 30-day return window, so we've approved a full refund of $34.99 to your original payment method. Want us to hold a larger size for you?\n\n- Demo Pet Supply Co",
    status: 'NEEDS_APPROVAL', receivedMin: t(10, 48), draftedMin: t(10, 53), respondedMin: null },
  { id: 'OPS-106', type: 'Lease', source: 'Synthetic email', fromAddr: 'pm@harborview-props.example',
    subject: 'Lease renewal notice - Eastside, 60 days',
    body: 'Per section 4 of your lease, this is notice that the Eastside lease expires in 60 days. We propose renewal with a 4% rent increase.',
    draftKind: 'Reply draft to landlord',
    draft: "Hello,\n\nThank you for the notice. We'd like to renew; could we discuss holding the increase to 2% given a 3-year term? Happy to schedule a call next week.\n\nDemo Pet Supply Co",
    status: 'DRAFTED', receivedMin: t(11, 2), draftedMin: t(11, 10), respondedMin: null },
  { id: 'OPS-107', type: 'Finance', source: 'Synthetic system', fromAddr: 'pos-reconciler',
    subject: 'POS mismatch: Downtown Tuesday, $86.20',
    body: 'Reconciliation alert: card totals exceed bank deposits by $86.20 for Tuesday at Downtown.',
    draftKind: 'Reconciliation note',
    draft: "Likely cause: 2 refunds processed after batch close (receipts R-5531, R-5534, synthetic). Proposed action: adjust Wednesday's batch and flag for manager review.",
    status: 'DRAFTED', receivedMin: t(11, 30), draftedMin: t(11, 37), respondedMin: null },
  { id: 'OPS-108', type: 'Supplier', source: 'Synthetic email', fromAddr: 'sales@chewco.example',
    subject: 'Price update effective next month',
    body: 'Notice: Chew Co treat prices increase 3% starting the 1st of next month. Updated price sheet available on request.',
    draftKind: 'Reply draft to supplier',
    draft: "Thanks for the notice. Please send the updated price sheet; we'll review volume tiers before confirming next month's order.",
    status: 'SENT', receivedMin: t(8, 15), draftedMin: t(8, 18), respondedMin: t(8, 42) },
  { id: 'OPS-109', type: 'Scheduling', source: 'Synthetic email', fromAddr: 'alex.t@staff.example',
    subject: 'PTO request: Dec 22-24',
    body: 'Hi, I would like to request PTO for Dec 22-24. Thanks!',
    draftKind: 'Approval reply',
    draft: 'Hi Alex, your PTO for Dec 22-24 is approved. Coverage plan: Priya picks up the 23rd. Enjoy the break!',
    status: 'SENT', receivedMin: t(8, 40), draftedMin: t(8, 45), respondedMin: t(9, 5) },
  { id: 'OPS-110', type: 'Customer', source: 'Synthetic email', fromAddr: 'lee.m@customer.example',
    subject: 'Do you carry grain-free puppy food?',
    body: 'Hello! Do you carry grain-free puppy food at the Eastside store? Thanks.',
    draftKind: 'Reply draft to customer',
    draft: 'Hi Lee, yes! Eastside has 3 grain-free puppy formulas in stock (synthetic). Stop by any day 9-8 or we can set one aside for you.',
    status: 'APPROVED', receivedMin: t(9, 55), draftedMin: t(9, 59), respondedMin: null },
];

/** Seeded activity entries, derived from each item's seeded path, oldest first. */
export function seedLog(): SeedLog[] {
  const out: SeedLog[] = [{ clockMin: CLOCK_START, itemId: null, text: 'Demo session started (synthetic data, nothing sent or received)' }];
  const done = (i: SeedItem) => ['NEEDS_APPROVAL', 'APPROVED', 'SENT'].includes(i.status);
  for (const i of SEED_ITEMS) {
    out.push({ clockMin: i.draftedMin, itemId: i.id, text: `${i.id} agent draft created (synthetic)` });
    if (done(i)) out.push({ clockMin: i.draftedMin + 1, itemId: i.id, text: `${i.id} submitted for approval` });
    if (i.status === 'APPROVED' || i.status === 'SENT') out.push({ clockMin: i.draftedMin + 2, itemId: i.id, text: `${i.id} approved` });
    if (i.status === 'SENT') out.push({ clockMin: i.respondedMin as number, itemId: i.id, text: `${i.id} simulated send recorded - nothing was sent` });
  }
  return out.sort((a, b) => a.clockMin - b.clockMin);
}
