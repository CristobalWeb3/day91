/**
 * Agente B: exige evidencia de demanda independiente antes de pagar.
 * Lee el ledger vivo (sin marca de corte) con src/scan/baseline.ts y cuenta pagadores externos en los últimos 90 días,
 * excluyendo vinculados (recibieron fondos del payTo) y wallets de Day91 (data/day91-wallets.json).
 * Compra solo si hay ≥ MIN_EXTERNAL_PAYERS. Nunca modifica el cliente x402: si compra, usa paidGet.
 * Uso: npm run agent-b [-- <payTo>]
 */
import { RENDERGATE_PAYTO } from "../config.js";
import { readWallets } from "../ledger-log.js";
import { baseline } from "../scan/baseline.js";
import { paidGet } from "../x402/paid-get.js";
import { appendDecision, renderEndpoint } from "./common.js";

const AGENT = "agent-b";
const MIN_EXTERNAL_PAYERS = 3;
const WINDOW_DAYS = 90;
const payTo = process.argv[2] ?? RENDERGATE_PAYTO;
const task = `Buy a render only if the service shows independent demand: ≥ ${MIN_EXTERNAL_PAYERS} external payers in ${WINDOW_DAYS} days`;

async function main() {
  console.log(`[${AGENT}] ${task}`);
  const day91 = new Set(readWallets().map((w) => w.publicKey));
  console.log(`[${AGENT}] reading /payments of ${payTo} from Horizon (live ledger, no cutoff)...`);
  const b = await baseline(payTo, null, day91);
  const w = b.windows.find((x) => x.days === WINDOW_DAYS)!;
  const external = w.payersByClass.externo;

  console.log(`[${AGENT}] last ${WINDOW_DAYS} days: external ${w.byClass.externo} payments / ${external} payers · linked ${w.byClass.vinculado}/${w.payersByClass.vinculado} · day91 ${w.byClass.day91}/${w.payersByClass.day91}`);
  console.log(`[${AGENT}] all time: ${b.before.total.payments} payments, ${b.before.total.payers} payers; excluded as linked: ${b.linked.map((l) => l.address).join(", ") || "none"}; excluded Day91 wallets: ${day91.size}`);

  const evidence = {
    payTo,
    windowDays: WINDOW_DAYS,
    minExternalPayers: MIN_EXTERNAL_PAYERS,
    externalPayers90d: external,
    externalPayments90d: w.byClass.externo,
    linkedPayers90d: w.payersByClass.vinculado,
    day91Payers90d: w.payersByClass.day91,
    excludedLinked: b.linked.map((l) => l.address),
    excludedDay91: [...day91],
    totalPaymentsAllTime: b.before.total.payments,
    lastExternalPayment: b.before.lastExternalPayment,
  };

  if (external < MIN_EXTERNAL_PAYERS) {
    appendDecision({
      timestamp: new Date().toISOString(),
      agent: AGENT,
      task,
      target: payTo,
      decision: "skip",
      reason: `only ${external} external payer(s) in ${WINDOW_DAYS} days; policy requires ≥ ${MIN_EXTERNAL_PAYERS}`,
      evidence,
      tx: null,
      amount: null,
    });
    return;
  }

  console.log(`[${AGENT}] enough independent demand (${external} ≥ ${MIN_EXTERNAL_PAYERS}): buying one render`);
  const r = await paidGet(renderEndpoint("https://example.com"), payTo, AGENT);
  appendDecision({
    timestamp: new Date().toISOString(),
    agent: AGENT,
    task,
    target: payTo,
    decision: "pay",
    reason: `${external} external payers in ${WINDOW_DAYS} days satisfy the policy`,
    evidence: { ...evidence, renderStatus: r.status, settle: r.settle },
    tx: r.txHash,
    amount: r.amount,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
