import { fmt, sum } from "./amounts.js";
import * as horizon from "./horizon.js";
import { type Transfer, daysBetween, normalize } from "./transfers.js";

export type PayerClass = "vinculado" | "day91" | "externo";
export const CLASSES: PayerClass[] = ["vinculado", "day91", "externo"];

export interface PayerStats {
  address: string;
  class: PayerClass;
  payments: number;
  amount: string;
  first: string;
  last: string;
}

export interface ClassStats {
  payments: number;
  payers: number;
  amount: string;
}

export interface Segment {
  label: string;
  total: ClassStats;
  byClass: Record<PayerClass, ClassStats>;
  payers: PayerStats[];
  byDay: { day: string; payments: number; byClass: Record<PayerClass, number> }[];
  firstPayment: string | null;
  lastPayment: string | null;
  lastExternalPayment: string | null;
}

export interface LinkEvidence {
  tx: string;
  at: string;
  amount: string;
  usdc: boolean;
  memo: string | null;
}

export interface Baseline {
  payTo: string;
  cutoff: string | null;
  account: { createdAt: string | null; funder: string | null; usdcBalance: string | null };
  linked: { address: string; evidence: LinkEvidence[] }[];
  before: Segment;
  after: Segment;
  /** Días desde el último pago externo hasta la marca de corte (o hasta hoy si no hay corte). */
  daysWithoutExternalSales: number | null;
  /** Pagos en las ventanas previas a la marca de corte, por clase. */
  windows: { days: number; byClass: Record<PayerClass, number>; payersByClass: Record<PayerClass, number> }[];
  /** Pagos recibidos para reutilizar en el perfil. */
  incoming: (Transfer & { class: PayerClass })[];
}

function classStats(list: Transfer[]): ClassStats {
  return { payments: list.length, payers: new Set(list.map((t) => t.from)).size, amount: fmt(sum(list.map((t) => t.amount))) };
}

function segment(label: string, list: (Transfer & { class: PayerClass })[]): Segment {
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, classStats(list.filter((t) => t.class === c))])) as Record<
    PayerClass,
    ClassStats
  >;
  const payers = new Map<string, PayerStats & { stroops: bigint }>();
  for (const t of list) {
    const p = payers.get(t.from) ?? { address: t.from, class: t.class, payments: 0, amount: "", stroops: 0n, first: t.at, last: t.at };
    p.payments++;
    p.stroops += t.amount;
    p.last = t.at;
    payers.set(t.from, p);
  }
  const days = new Map<string, Record<PayerClass, number>>();
  for (const t of list) {
    const d = days.get(t.at.slice(0, 10)) ?? { vinculado: 0, day91: 0, externo: 0 };
    d[t.class]++;
    days.set(t.at.slice(0, 10), d);
  }
  const external = list.filter((t) => t.class === "externo");
  return {
    label,
    total: classStats(list),
    byClass,
    payers: [...payers.values()]
      .map(({ stroops, ...p }) => ({ ...p, amount: fmt(stroops) }))
      .sort((a, b) => b.payments - a.payments),
    byDay: [...days.entries()].map(([day, c]) => ({ day, payments: c.vinculado + c.day91 + c.externo, byClass: c })),
    firstPayment: list[0]?.at ?? null,
    lastPayment: list.at(-1)?.at ?? null,
    lastExternalPayment: external.at(-1)?.at ?? null,
  };
}

export async function baseline(payTo: string, cutoff: string | null, day91Wallets: Set<string>): Promise<Baseline> {
  const [records, txs, acct] = await Promise.all([horizon.payments(payTo), horizon.transactionsOf(payTo), horizon.account(payTo)]);
  const transfers = normalize(records);
  const memoByTx = new Map(txs.map((t: any) => [t.hash, t.memo_type === "none" ? null : String(t.memo ?? "")]));

  // Vinculado: recibió fondos del propio payTo (cualquier asset). Se guarda la evidencia, memo incluido.
  const linkedMap = new Map<string, LinkEvidence[]>();
  for (const t of transfers) {
    if (t.from !== payTo || t.to === payTo || t.kind === "create_account") continue;
    const ev = linkedMap.get(t.to) ?? [];
    ev.push({ tx: t.tx, at: t.at, amount: fmt(t.amount), usdc: t.usdc, memo: memoByTx.get(t.tx) ?? null });
    linkedMap.set(t.to, ev);
  }
  const classify = (addr: string): PayerClass =>
    day91Wallets.has(addr) ? "day91" : linkedMap.has(addr) ? "vinculado" : "externo";

  const incoming = transfers
    .filter((t) => t.usdc && t.to === payTo && t.from !== payTo && t.kind !== "create_account")
    .map((t) => ({ ...t, class: classify(t.from) }));
  const before = incoming.filter((t) => !cutoff || t.at < cutoff);
  const after = incoming.filter((t) => cutoff && t.at >= cutoff);

  const created = transfers.find((t) => t.kind === "create_account" && t.to === payTo);
  const usdcLine = acct?.balances?.find((b: any) => b.asset_code === "USDC");
  const reference = cutoff ?? new Date().toISOString();
  const lastExternal = before.filter((t) => t.class === "externo").at(-1)?.at ?? null;

  const windows = [90, 180].map((days) => {
    const from = new Date(Date.parse(reference) - days * 86_400_000).toISOString();
    const inWindow = before.filter((t) => t.at >= from);
    const count = (c: PayerClass) => inWindow.filter((t) => t.class === c);
    return {
      days,
      byClass: Object.fromEntries(CLASSES.map((c) => [c, count(c).length])) as Record<PayerClass, number>,
      payersByClass: Object.fromEntries(CLASSES.map((c) => [c, new Set(count(c).map((t) => t.from)).size])) as Record<
        PayerClass,
        number
      >,
    };
  });

  return {
    payTo,
    cutoff,
    account: { createdAt: created?.at ?? null, funder: created?.from ?? null, usdcBalance: usdcLine?.balance ?? null },
    linked: [...linkedMap.entries()].map(([address, evidence]) => ({ address, evidence })),
    before: segment(cutoff ? `antes de ${cutoff}` : "historial completo", before),
    after: segment(cutoff ? `desde ${cutoff}` : "sin marca de corte", after),
    daysWithoutExternalSales: lastExternal ? daysBetween(lastExternal, reference) : null,
    windows,
    incoming,
  };
}
