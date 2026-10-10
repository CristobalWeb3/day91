import { fmt, sum } from "./amounts.js";
import * as horizon from "./horizon.js";
import { CCTP_DOMAINS, label } from "./labels.js";
import { type Transfer, normalize } from "./transfers.js";

export interface ServiceSpend {
  to: string;
  label: string | null;
  payments: number;
  amount: string;
  unitPrices: string[];
  /** Cuentas que enviaron la transacción en nombre del comprador (facilitators x402). */
  facilitators: string[];
  first: string;
  last: string;
}

export interface Bridge {
  tx: string;
  at: string;
  amount: string;
  contract: string;
  domain: number | null;
  chain: string | null;
  mintRecipient: string | null;
}

export interface BuyerProfile {
  address: string;
  createdAt: string | null;
  funder: string | null;
  sponsor: string | null;
  firstActivity: string | null;
  lastActivity: string | null;
  fundedWith: { from: string; label: string | null; amount: string; at: string; tx: string }[];
  /** Pagos x402: transferencias USDC enviadas por un tercero (facilitator), no por el comprador. */
  services: ServiceSpend[];
  /** Salidas USDC firmadas y enviadas por el propio comprador (DeFi, devoluciones, etc.); no se cuentan como servicios. */
  otherOutflows: ServiceSpend[];
  bridges: Bridge[];
  totalServiceSpend: string;
  spendOnTarget: string;
  /** Proporción del gasto en servicios que fue al payTo analizado (0..1). */
  targetShare: number | null;
}

function evmAddress(hex: unknown): string | null {
  return typeof hex === "string" && hex.length === 64 ? `0x${hex.slice(24)}` : null;
}

function groupByRecipient(list: Transfer[]): ServiceSpend[] {
  const groups = new Map<string, Transfer[]>();
  for (const t of list) groups.set(t.to, [...(groups.get(t.to) ?? []), t]);
  return [...groups.entries()]
    .map(([to, items]) => ({
      to,
      label: label(to),
      payments: items.length,
      amount: fmt(sum(items.map((t) => t.amount))),
      unitPrices: [...new Set(items.map((t) => fmt(t.amount)))],
      facilitators: [...new Set(items.map((t) => t.submitter))],
      first: items[0].at,
      last: items.at(-1)!.at,
    }))
    .sort((a, b) => b.payments - a.payments);
}

export async function profile(address: string, target: string): Promise<BuyerProfile> {
  const [records, ops] = await Promise.all([horizon.payments(address), horizon.operations(address, 1)]);
  const transfers = normalize(records);
  const created = transfers.find((t) => t.kind === "create_account" && t.to === address);
  const createOp = ops.find((o: any) => o.type === "create_account" && o.account === address);

  const fundedWith = transfers
    .filter((t) => t.usdc && t.to === address && t.from !== address)
    .map((t) => ({ from: t.from, label: label(t.from), amount: fmt(t.amount), at: t.at, tx: t.tx }));

  // deposit_for_burn(from, amount, destination_domain, mint_recipient, burn_token, ...): args sin contrato ni función.
  const bridgeTxs = transfers.filter((t) => t.from === address && t.fn === "deposit_for_burn");
  const bridges: Bridge[] = bridgeTxs.map((t) => {
    const domain = typeof t.args?.[2] === "number" ? (t.args[2] as number) : null;
    return {
      tx: t.tx,
      at: t.at,
      amount: fmt(t.amount),
      contract: t.contract!,
      domain,
      chain: domain === null ? null : CCTP_DOMAINS[domain] ?? `dominio ${domain}`,
      mintRecipient: evmAddress(t.args?.[3]),
    };
  });

  const spends = transfers.filter((t) => t.usdc && t.from === address && t.to !== address && t.fn !== "deposit_for_burn");
  const x402 = spends.filter((t) => t.submitter !== address);
  const services = groupByRecipient(x402);
  const otherOutflows = groupByRecipient(spends.filter((t) => t.submitter === address));

  const total = sum(x402.map((t) => t.amount));
  const onTarget = sum(x402.filter((t) => t.to === target).map((t) => t.amount));
  return {
    address,
    createdAt: created?.at ?? null,
    funder: created?.from ?? null,
    sponsor: createOp?.sponsor ?? null,
    firstActivity: transfers[0]?.at ?? null,
    lastActivity: transfers.at(-1)?.at ?? null,
    fundedWith,
    services,
    otherOutflows,
    bridges,
    totalServiceSpend: fmt(total),
    spendOnTarget: fmt(onTarget),
    targetShare: total > 0n ? Number(onTarget) / Number(total) : null,
  };
}
