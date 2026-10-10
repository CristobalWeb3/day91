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
const task = `Comprar un render solo si el servicio muestra demanda independiente: ≥ ${MIN_EXTERNAL_PAYERS} pagadores externos en ${WINDOW_DAYS} días`;

async function main() {
  console.log(`[${AGENT}] ${task}`);
  const day91 = new Set(readWallets().map((w) => w.publicKey));
  console.log(`[${AGENT}] Leyendo /payments de ${payTo} (ledger vivo, sin marca de corte)...`);
  const b = await baseline(payTo, null, day91);
  const w = b.windows.find((x) => x.days === WINDOW_DAYS)!;
  const external = w.payersByClass.externo;

  console.log(`[${AGENT}] Últimos ${WINDOW_DAYS} días: externo ${w.byClass.externo} pagos / ${external} pagadores · vinculado ${w.byClass.vinculado}/${w.payersByClass.vinculado} · day91 ${w.byClass.day91}/${w.payersByClass.day91}`);
  console.log(`[${AGENT}] Historial: ${b.before.total.payments} pagos, ${b.before.total.payers} pagadores; vinculados excluidos: ${b.linked.map((l) => l.address).join(", ") || "ninguno"}; wallets Day91 excluidas: ${day91.size}`);

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
      reason: `solo ${external} pagador(es) externo(s) en ${WINDOW_DAYS} días; la política exige ≥ ${MIN_EXTERNAL_PAYERS}`,
      evidence,
      tx: null,
      amount: null,
    });
    return;
  }

  console.log(`[${AGENT}] Demanda suficiente (${external} ≥ ${MIN_EXTERNAL_PAYERS}): compro un render`);
  const r = await paidGet(renderEndpoint("https://example.com"), payTo, AGENT);
  appendDecision({
    timestamp: new Date().toISOString(),
    agent: AGENT,
    task,
    target: payTo,
    decision: "pay",
    reason: `${external} pagadores externos en ${WINDOW_DAYS} días cumplen la política`,
    evidence: { ...evidence, renderStatus: r.status, settle: r.settle },
    tx: r.txHash,
    amount: r.amount,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
