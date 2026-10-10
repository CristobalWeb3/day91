import { fmt, sum, toStroops } from "./amounts.js";
import * as horizon from "./horizon.js";
import { FRIENDBOT, label } from "./labels.js";
import { type BuyerProfile, type ServiceSpend, profile } from "./profile.js";

/** Operadores que dieron de alta más cuentas que esto se tratan como infraestructura, no como cohorte. */
const MAX_COHORT = 500;

export interface CohortService {
  to: string;
  label: string | null;
  wallets: number;
  payments: number;
  amount: string;
}

export interface Cohort {
  operator: string;
  operatorLabel: string | null;
  /** Comprador externo del payTo que llevó a este operador. */
  via: string[];
  createAccounts: number;
  firstCreate: string | null;
  lastCreate: string | null;
  sponsoredReserves: number;
  walletsFunded: number;
  walletsThatPaidServices: number;
  walletsThatPaidTarget: number;
  walletsThatBridged: number;
  services: CohortService[];
  otherOutflows: CohortService[];
  wallets: { address: string; createdAt: string; paidServices: number; paidTarget: boolean; bridged: boolean; spend: string }[];
  skipped?: string;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

function aggregate(profiles: BuyerProfile[], pick: (p: BuyerProfile) => ServiceSpend[]): CohortService[] {
  const byRecipient = new Map<string, { wallets: Set<string>; payments: number; stroops: bigint }>();
  for (const p of profiles) {
    for (const s of pick(p)) {
      const agg = byRecipient.get(s.to) ?? { wallets: new Set(), payments: 0, stroops: 0n };
      agg.wallets.add(p.address);
      agg.payments += s.payments;
      agg.stroops += toStroops(s.amount);
      byRecipient.set(s.to, agg);
    }
  }
  return [...byRecipient.entries()]
    .map(([to, s]) => ({ to, label: label(to), wallets: s.wallets.size, payments: s.payments, amount: fmt(s.stroops) }))
    .sort((a, b) => b.wallets - a.wallets || b.payments - a.payments);
}

export async function cohort(operator: string, via: string[], target: string): Promise<Cohort> {
  const base = { operator, operatorLabel: label(operator), via };
  if (operator === FRIENDBOT) {
    return { ...base, ...empty(), skipped: "friendbot: alta pública, no es una cohorte" };
  }
  const ops = await horizon.operations(operator, 10);
  const creates = ops.filter((o: any) => o.type === "create_account" && o.funder === operator);
  if (creates.length > MAX_COHORT) {
    return { ...base, ...empty(), createAccounts: creates.length, skipped: `más de ${MAX_COHORT} altas: infraestructura` };
  }

  const profiles: BuyerProfile[] = await mapLimit(
    creates.map((o: any) => o.account as string),
    4,
    (a) => profile(a, target),
  );

  const services = aggregate(profiles, (p) => p.services);
  const otherOutflows = aggregate(profiles, (p) => p.otherOutflows);

  return {
    ...base,
    createAccounts: creates.length,
    firstCreate: creates[0]?.created_at ?? null,
    lastCreate: creates.at(-1)?.created_at ?? null,
    sponsoredReserves: creates.filter((o: any) => o.sponsor === operator).length,
    walletsFunded: profiles.filter((p) => p.fundedWith.length > 0).length,
    walletsThatPaidServices: profiles.filter((p) => p.services.length > 0).length,
    walletsThatPaidTarget: profiles.filter((p) => p.services.some((s) => s.to === target)).length,
    walletsThatBridged: profiles.filter((p) => p.bridges.length > 0).length,
    services,
    otherOutflows,
    wallets: profiles.map((p, i) => ({
      address: p.address,
      createdAt: creates[i].created_at,
      paidServices: p.services.length,
      paidTarget: p.services.some((s) => s.to === target),
      bridged: p.bridges.length > 0,
      spend: fmt(sum(p.services.map((s) => toStroops(s.amount)))),
    })),
  };
}

function empty() {
  return {
    createAccounts: 0,
    firstCreate: null,
    lastCreate: null,
    sponsoredReserves: 0,
    walletsFunded: 0,
    walletsThatPaidServices: 0,
    walletsThatPaidTarget: 0,
    walletsThatBridged: 0,
    services: [],
    otherOutflows: [],
    wallets: [],
  };
}
