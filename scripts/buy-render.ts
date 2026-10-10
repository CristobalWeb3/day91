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
  console.log(`402 crudo guardado en ${PROBE_402_PATH} (status ${res.status})`);
  for (const a of decoded?.accepts ?? []) {
    const human = Number(a.amount) / 10 ** USDC_DECIMALS;
    console.log(`  ${a.scheme} ${a.network} amount=${a.amount} (${human} USDC) payTo=${a.payTo}`);
  }
}

async function main() {
  console.log(`Comprador: ${buyerFromEnv().publicKey}  Agente: ${agent}`);
  console.log(`GET ${endpoint}`);
  await probe402();

  const r = await paidGet(endpoint, RENDERGATE_PAYTO, agent);
  console.log(`\nHTTP ${r.status} en ${(r.totalMs / 1000).toFixed(1)} s, ${r.body.length} bytes`);
  console.log(r.body.slice(0, 400) + (r.body.length > 400 ? "..." : ""));
  if (r.settle) console.log("\nLiquidación:", JSON.stringify(r.settle));
  console.log("Tiempos por request:", JSON.stringify(r.timings));

  if (r.settle?.success === false) {
    console.error(`\nEl servidor no liquidó el pago (${r.settle.errorReason}). Registrado en ${FAILED_CALLS_PATH}`);
    process.exit(1);
  }
  if (!r.txHash) {
    console.error("\nNo se encontró la transacción del pago.");
    process.exit(1);
  }
  if (!r.record) {
    console.error(`Tx ${r.txHash} no aparece en /payments del payTo.`);
    process.exit(1);
  }
  console.log(`\nLlamada registrada en ${PAID_CALLS_PATH}`);
  console.log(`Tx: ${txLink(r.txHash)}`);
  console.log("\nRegistro en Horizon (/accounts/<payTo>/payments):");
  console.log(JSON.stringify(r.record, null, 2));
  if (r.status !== 200) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
