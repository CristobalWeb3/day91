/**
 * Un render pagado de punta a punta contra RenderGate con el cliente x402 estándar, sin modificar.
 * Uso: npm run buy-render [-- <url a renderizar> [agente]]
 *
 * Registra:
 *   data/probe-402.json     402 crudo (status, headers, payload decodificado)
 *   data/paid-calls.jsonl   una línea por llamada pagada (timestamp, agente, tx hash, monto)
 *   data/failed-calls.jsonl intentos de pago que el servidor no liquidó (errorReason, tiempos)
 * La lógica de pago y verificación en Horizon vive en src/x402/paid-get.ts.
 */
import { RENDERGATE_PAYTO, RENDERGATE_URL, USDC_DECIMALS, txLink } from "../src/config.js";
import { FAILED_CALLS_PATH, PAID_CALLS_PATH, PROBE_402_PATH, writeJson } from "../src/ledger-log.js";
import { buyerFromEnv, paidGet } from "../src/x402/paid-get.js";

const target = process.argv[2] ?? "https://example.com";
const agent = process.argv[3] ?? "buy-render";
const endpoint = `${RENDERGATE_URL}/render?url=${encodeURIComponent(target)}`;

async function probe402() {
  const res = await fetch(endpoint);
  const headers = Object.fromEntries(res.headers.entries());
  const raw = res.headers.get("payment-required");
  const decoded = raw ? JSON.parse(Buffer.from(raw, "base64").toString("utf8")) : null;
  writeJson(PROBE_402_PATH, {
    probedAt: new Date().toISOString(),
    request: { method: "GET", url: endpoint },
    status: res.status,
    headers,
    body: await res.text(),
    paymentRequired: decoded,
  });
  console.log(`raw 402 saved to ${PROBE_402_PATH} (status ${res.status})`);
  for (const a of decoded?.accepts ?? []) {
    const human = Number(a.amount) / 10 ** USDC_DECIMALS;
    console.log(`  ${a.scheme} ${a.network} amount=${a.amount} (${human} USDC) payTo=${a.payTo}`);
  }
}

async function main() {
  console.log(`buyer: ${buyerFromEnv().publicKey}  agent: ${agent}`);
  console.log(`GET ${endpoint}`);
  await probe402();

  const r = await paidGet(endpoint, RENDERGATE_PAYTO, agent);
  console.log(`\nHTTP ${r.status} in ${(r.totalMs / 1000).toFixed(1)} s, ${r.body.length} bytes`);
  console.log(r.body.slice(0, 400) + (r.body.length > 400 ? "..." : ""));
  if (r.settle) console.log("\nsettlement:", JSON.stringify(r.settle));
  console.log("request timings:", JSON.stringify(r.timings));

  if (r.settle?.success === false) {
    console.error(`\nthe server did not settle the payment (${r.settle.errorReason}). Recorded in ${FAILED_CALLS_PATH}`);
    process.exit(1);
  }
  if (!r.txHash) {
    console.error("\npayment transaction not found.");
    process.exit(1);
  }
  if (!r.record) {
    console.error(`tx ${r.txHash} does not appear in the payTo's /payments yet.`);
    process.exit(1);
  }
  console.log(`\ncall recorded in ${PAID_CALLS_PATH}`);
  console.log(`tx: ${txLink(r.txHash)}`);
  console.log("\nHorizon record (/accounts/<payTo>/payments):");
  console.log(JSON.stringify(r.record, null, 2));
  if (r.status !== 200) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
