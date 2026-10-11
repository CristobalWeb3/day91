/**
 * `day91 prospects <payTo>`: tamaño del mercado x402 (vía los facilitators conocidos), cuota del payTo
 * y compradores probables, todo leído de Horizon en una ventana de N días.
 *
 * Un pago x402 es una transferencia USDC enviada por el facilitator (source_account) en nombre del comprador (from)
 * hacia un servicio (to). Se ignoran los pagos de monto 0. Los servicios con precio medio ≤ TEST_TRAFFIC_MAX_AVG se marcan
 * "likely test traffic" y sus compradores quedan fuera del ranking (siguen en el JSON, etiquetados).
 */
import { FACILITATORS, USDC_ISSUER } from "../config.js";
import { readWallets } from "../ledger-log.js";
import { fmt, sum, toStroops } from "./amounts.js";
import * as horizon from "./horizon.js";
import { label } from "./labels.js";

const EXPLORER = "https://stellar.expert/explorer/testnet";
/** Precio medio por pago (en stroops) a partir del cual un servicio se considera tráfico real: 0.0001 USDC. */
const TEST_TRAFFIC_MAX_AVG = 1000n;

export interface X402Payment {
  at: string;
  tx: string;
  from: string;
  to: string;
  amount: bigint;
  facilitator: string;
}

export interface ServiceRow {
  to: string;
  label: string | null;
  payments: number;
  buyers: number;
  usdc: string;
  avgPrice: string;
  testTraffic: boolean;
}

export interface MarketRow {
  payments: number;
  buyers: number;
  services: number;
  usdc: string;
  buyersActiveLast14d: number;
}

export interface Prospect {
  rank: number | null;
  address: string;
  isContract: boolean;
  explorer: string;
  services: number;
  payments: number;
  usdc: string;
  unitPrices: string[];
  first: string;
  last: string;
  daysSinceLast: number;
  facilitators: string[];
  paidTarget: boolean;
  /** Fuera del ranking: pagó algún servicio marcado "likely test traffic". */
  excluded: "test-traffic-buyer" | null;
  /** Señales derivadas de los números, sin juicio: el lector decide. */
  notes: string[];
  why: string;
}

export interface ProspectsResult {
  generatedAt: string;
  payTo: string;
  windowDays: number;
  since: string;
  testTrafficRule: string;
  facilitators: { address: string; label: string; records: number; payments: number; buyers: number; services: number; readMs: number }[];
  removed: { zeroAmount: number; day91Payments: number; day91Wallets: string[] };
  market: { total: MarketRow; excludingTestTraffic: MarketRow; buyersOnTwoOrMoreFacilitators: number };
  share: { payments: number; buyers: number; paymentsPct: number; buyersPct: number; buyersPctExcludingTestTraffic: number; buyersOfTarget: string[] };
  testTrafficServices: ServiceRow[];
  topServices: ServiceRow[];
  candidates: { total: number; excludedTestTrafficBuyers: number; ranked: number };
  prospects: Prospect[];
  warnings: string[];
}

function extract(records: any[], facilitator: string): X402Payment[] {
  const out: X402Payment[] = [];
  for (const r of records) {
    if (r.type !== "invoke_host_function" || r.source_account !== facilitator || r.transaction_successful === false) continue;
    for (const c of r.asset_balance_changes ?? []) {
      if (c.type !== "transfer" || c.asset_code !== "USDC" || c.asset_issuer !== USDC_ISSUER || c.from === facilitator) continue;
      out.push({ at: r.created_at, tx: r.transaction_hash, from: c.from, to: c.to, amount: toStroops(c.amount), facilitator });
    }
  }
  return out;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((10000 * n) / d) / 100);
const explorerPath = (a: string) => `${EXPLORER}/${a.startsWith("C") ? "contract" : "account"}/${a}`;

function marketRow(list: X402Payment[], since14: string): MarketRow {
  const lastByBuyer = new Map<string, string>();
  for (const p of list) if ((lastByBuyer.get(p.from) ?? "") < p.at) lastByBuyer.set(p.from, p.at);
  return {
    payments: list.length,
    buyers: lastByBuyer.size,
    services: new Set(list.map((p) => p.to)).size,
    usdc: fmt(sum(list.map((p) => p.amount))),
    buyersActiveLast14d: [...lastByBuyer.values()].filter((at) => at >= since14).length,
  };
}

export async function prospects(payTo: string, windowDays = 90): Promise<ProspectsResult> {
  const now = Date.now();
  const since = new Date(now - windowDays * 86_400_000).toISOString();
  const since14 = new Date(now - 14 * 86_400_000).toISOString();
  const day91 = new Set(readWallets().map((w) => w.publicKey));

  // 1. Pagos x402 de la ventana, por facilitator.
  const perFacilitator = await Promise.all(
    FACILITATORS.map(async (f) => {
      const t0 = Date.now();
      const records = await horizon.paymentsSince(f.address, since);
      const payments = extract(records, f.address);
      return { ...f, records: records.length, readMs: Date.now() - t0, payments };
    }),
  );
  const raw = perFacilitator.flatMap((f) => f.payments);

  // 2. Limpieza: monto 0 fuera; wallets de Day91 fuera del mercado (son nuestras).
  const zeroAmount = raw.filter((p) => p.amount === 0n).length;
  const day91Payments = raw.filter((p) => p.amount > 0n && day91.has(p.from)).length;
  const all = raw.filter((p) => p.amount > 0n && !day91.has(p.from));

  // 3. Servicios y tráfico de prueba probable (precio medio ≤ 0.0001 USDC).
  const byService = new Map<string, X402Payment[]>();
  for (const p of all) byService.set(p.to, [...(byService.get(p.to) ?? []), p]);
  const services: ServiceRow[] = [...byService.entries()]
    .map(([to, list]) => {
      const total = sum(list.map((p) => p.amount));
      return {
        to,
        label: label(to),
        payments: list.length,
        buyers: new Set(list.map((p) => p.from)).size,
        usdc: fmt(total),
        avgPrice: fmt(total / BigInt(list.length)),
        testTraffic: total <= BigInt(list.length) * TEST_TRAFFIC_MAX_AVG,
      };
    })
    .sort((a, b) => b.buyers - a.buyers || b.payments - a.payments);
  const testTrafficServices = services.filter((s) => s.testTraffic);
  const testTrafficSet = new Set(testTrafficServices.map((s) => s.to));
  const real = all.filter((p) => !testTrafficSet.has(p.to));

  // 4. Compradores.
  const byBuyer = new Map<string, X402Payment[]>();
  for (const p of all) byBuyer.set(p.from, [...(byBuyer.get(p.from) ?? []), p]);
  const targetPayments = all.filter((p) => p.to === payTo);
  const buyersOfTarget = [...new Set(targetPayments.map((p) => p.from))];
  const realBuyers = new Set(real.map((p) => p.from));

  const rows: Prospect[] = [...byBuyer.entries()].map(([address, list]) => {
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
    const servicesPaid = new Set(list.map((p) => p.to));
    const usdc = sum(list.map((p) => p.amount));
    const last = sorted.at(-1)!.at;
    const daysSinceLast = Math.floor((now - Date.parse(last)) / 86_400_000);
    const excluded = list.some((p) => testTrafficSet.has(p.to)) ? ("test-traffic-buyer" as const) : null;
    const paidTarget = servicesPaid.has(payTo);
    const span = Math.max(1, Math.round((Date.parse(last) - Date.parse(sorted[0].at)) / 86_400_000));
    const unitPrices = [...new Set(list.map((p) => fmt(p.amount)))];
    const isContract = address.startsWith("C");
    const facilitators = [...new Set(list.map((p) => p.facilitator))];
    const notes: string[] = [];
    if (isContract) notes.push("contract address, not a wallet");
    if (servicesPaid.size >= 2 && unitPrices.length === 1) notes.push(`pays exactly ${unitPrices[0]} USDC to every service`);
    if (isContract && unitPrices.length === 1 && servicesPaid.size >= 2) notes.push("may be test infrastructure rather than a customer");
    const why = excluded
      ? "paid a service that looks like test traffic (average price ≤ 0.0001 USDC); excluded from the ranking"
      : `${servicesPaid.size} services, ${list.length} payments, ${fmt(usdc)} USDC over ${span} day${span === 1 ? "" : "s"}; last active ${daysSinceLast} day${daysSinceLast === 1 ? "" : "s"} ago; ${paidTarget ? "already tried this service" : "has not tried this service"}${notes.length ? `; ${notes.join("; ")}` : ""}`;
    return {
      rank: null,
      address,
      isContract,
      explorer: explorerPath(address),
      services: servicesPaid.size,
      payments: list.length,
      usdc: fmt(usdc),
      unitPrices,
      first: sorted[0].at,
      last,
      daysSinceLast,
      facilitators,
      paidTarget,
      excluded,
      notes,
      why,
    };
  });

  const candidates = rows.filter((r) => r.services >= 2);
  const ranked = candidates
    .filter((r) => !r.excluded)
    .sort((a, b) => b.last.localeCompare(a.last) || Number(toStroops(b.usdc) - toStroops(a.usdc)))
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const excludedCandidates = candidates.filter((r) => r.excluded);

  return {
    generatedAt: new Date(now).toISOString(),
    payTo,
    windowDays,
    since,
    testTrafficRule: `service average price ≤ ${fmt(TEST_TRAFFIC_MAX_AVG)} USDC`,
    facilitators: perFacilitator.map((f) => ({
      address: f.address,
      label: f.label,
      records: f.records,
      payments: f.payments.length,
      buyers: new Set(f.payments.map((p) => p.from)).size,
      services: new Set(f.payments.map((p) => p.to)).size,
      readMs: f.readMs,
    })),
    removed: { zeroAmount, day91Payments, day91Wallets: [...day91] },
    market: {
      total: marketRow(all, since14),
      excludingTestTraffic: marketRow(real, since14),
      buyersOnTwoOrMoreFacilitators: rows.filter((r) => r.facilitators.length >= 2).length,
    },
    share: {
      payments: targetPayments.length,
      buyers: buyersOfTarget.length,
      paymentsPct: pct(targetPayments.length, all.length),
      buyersPct: pct(buyersOfTarget.length, byBuyer.size),
      buyersPctExcludingTestTraffic: pct(buyersOfTarget.length, realBuyers.size),
      buyersOfTarget,
    },
    testTrafficServices,
    topServices: services.filter((s) => !s.testTraffic).slice(0, 10),
    candidates: { total: candidates.length, excludedTestTrafficBuyers: excludedCandidates.length, ranked: ranked.length },
    prospects: [...ranked.slice(0, 10), ...excludedCandidates],
    warnings: horizon.warnings,
  };
}

export function toProspectsMarkdown(r: ProspectsResult): string {
  const acct = (a: string) => `[${short(a)}](${explorerPath(a)})${label(a) ? ` (${label(a)})` : ""}`;
  const row = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;
  const L: string[] = [];
  L.push(`# Day91 prospects: ${label(r.payTo) ?? short(r.payTo)}`, "");
  L.push(`- payTo: \`${r.payTo}\` · window: last ${r.windowDays} days (since ${r.since.slice(0, 19)}Z) · generated ${r.generatedAt}`);
  L.push(`- Source: /payments of ${r.facilitators.length} known x402 facilitators on Horizon testnet (a facilitator submits the payment on the buyer's behalf, so its history is the sales ledger of every service that uses it).`);
  L.push(`- Removed before counting: ${r.removed.zeroAmount} zero-amount payments and ${r.removed.day91Payments} payments from Day91's own wallets (${r.removed.day91Wallets.map(short).join(", ") || "none"}).`);
  L.push(`- Amounts in USDC, 7 decimals. Buyers are wallets, not people: one operator can run many wallets.`, "");

  L.push("## Market", "", row(["", "payments", "buyers", "services", "USDC", "buyers active last 14 d"]), row(["---", "---:", "---:", "---:", "---:", "---:"]));
  const m = r.market;
  L.push(row(["total", m.total.payments, m.total.buyers, m.total.services, m.total.usdc, m.total.buyersActiveLast14d]));
  L.push(row(["excluding likely test traffic", m.excludingTestTraffic.payments, m.excludingTestTraffic.buyers, m.excludingTestTraffic.services, m.excludingTestTraffic.usdc, m.excludingTestTraffic.buyersActiveLast14d]));
  L.push("", `Buyers seen on ≥ 2 facilitators: ${m.buyersOnTwoOrMoreFacilitators}.`, "");
  L.push(row(["facilitator", "records read", "x402 payments", "buyers", "services", "read time"]), row(["---", "---:", "---:", "---:", "---:", "---:"]));
  for (const f of r.facilitators) L.push(row([label(f.address) ? acct(f.address) : `${acct(f.address)} (${f.label})`, f.records, f.payments, f.buyers, f.services, `${(f.readMs / 1000).toFixed(1)} s`]));
  L.push("");

  L.push("## Share of this payTo", "");
  L.push(`- **${r.share.payments} of ${m.total.payments} payments (${r.share.paymentsPct}%)** and **${r.share.buyers} of ${m.total.buyers} buyers (${r.share.buyersPct}%; ${r.share.buyersPctExcludingTestTraffic}% of the ${m.excludingTestTraffic.buyers} buyers outside likely test traffic)**, Day91's wallets excluded.`);
  if (r.share.buyersOfTarget.length) L.push(`- Buyers of this payTo in the window: ${r.share.buyersOfTarget.map(acct).join(", ")}.`);
  L.push("");

  L.push("## Likely test traffic", "");
  if (r.testTrafficServices.length === 0) L.push(`_No service matched the rule (${r.testTrafficRule})._`);
  else {
    L.push(`${r.testTrafficServices.length} service(s) match the rule (${r.testTrafficRule}) and are tagged **likely test traffic**; their buyers stay in the JSON but are out of the ranking.`, "");
    L.push(row(["service", "payments", "buyers", "avg price"]), row(["---", "---:", "---:", "---:"]));
    for (const s of r.testTrafficServices) L.push(row([acct(s.to), s.payments, s.buyers, s.avgPrice]));
  }
  L.push("");

  L.push("## Most-bought services (excluding likely test traffic)", "", row(["service", "buyers", "payments", "USDC", "avg price"]), row(["---", "---:", "---:", "---:", "---:"]));
  for (const s of r.topServices) L.push(row([acct(s.to), s.buyers, s.payments, s.usdc, s.avgPrice]));
  L.push("");

  L.push("## Prospects", "");
  L.push(`Buyers that paid **≥ 2 distinct services** with a price > 0 in the window: ${r.candidates.total} (${r.candidates.excludedTestTrafficBuyers} excluded as test-traffic buyers, ${r.candidates.ranked} ranked). Ordered by last activity, then USDC spent. Top 10:`, "");
  L.push(row(["#", "buyer", "services", "payments", "USDC", "first", "last", "facilitator(s)", "paid this payTo", "why"]));
  L.push(row(["---:", "---", "---:", "---:", "---:", "---", "---", "---", "---", "---"]));
  const ranked = r.prospects.filter((p) => p.rank !== null);
  for (const p of ranked) {
    L.push(row([p.rank!, acct(p.address), p.services, p.payments, p.usdc, p.first.slice(0, 10), p.last.slice(0, 10), p.facilitators.map(short).join(", "), p.paidTarget ? "yes" : "no", p.why]));
  }
  for (const p of ranked.filter((p) => p.notes.length)) {
    L.push("", `- Note on #${p.rank} ${acct(p.address)}: ${p.notes.join("; ")}${p.facilitators.length >= 2 ? ` (via ${p.facilitators.map(short).join(" and ")})` : ""}.`);
  }
  const excluded = r.prospects.filter((p) => p.excluded);
  if (excluded.length) {
    L.push("", `Excluded from the ranking (test-traffic buyers): ${excluded.map((p) => acct(p.address)).join(", ")}.`);
  }
  L.push("", "> These are wallets, not contacts. Reaching them is manual work: look at what they buy, find who operates them, and talk to that operator.");
  if (r.warnings.length) L.push("", "## Warnings", "", ...r.warnings.map((w) => `- ${w}`));
  return L.join("\n") + "\n";
}
