/**
 * Un render pagado de punta a punta contra RenderGate con el cliente x402 estándar, sin modificar.
 * Uso: npm run buy-render [-- <url a renderizar> [agente]]
 *
 * Registra:
 *   data/probe-402.json   402 crudo (status, headers, payload decodificado)
 *   data/paid-calls.jsonl una línea por llamada pagada (timestamp, agente, tx hash, monto)
 *   data/failed-calls.jsonl intentos de pago que el servidor no liquidó (errorReason, tiempos)
 * El hash sale del header payment-response; si no viene, se busca en /payments del payTo
 * filtrando por from = wallet compradora y created_at >= hora del pago.
 */
import { Horizon } from "@stellar/stellar-sdk";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { HORIZON_URL, NETWORK, RENDERGATE_PAYTO, RENDERGATE_URL, USDC_DECIMALS, requireEnv, txLink } from "../src/config.js";
import { FAILED_CALLS_PATH, PAID_CALLS_PATH, PROBE_402_PATH, appendFailedCall, appendPaidCall, writeJson } from "../src/ledger-log.js";

const target = process.argv[2] ?? "https://example.com";
const agent = process.argv[3] ?? "buy-render";
const endpoint = `${RENDERGATE_URL}/render?url=${encodeURIComponent(target)}`;
const horizon = new Horizon.Server(HORIZON_URL);

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

/** Pagos al payTo cuyo asset_balance_changes viene de `buyer`, más recientes primero. */
async function paymentsFrom(buyer: string, since: string) {
  const page = await horizon.payments().forAccount(RENDERGATE_PAYTO).order("desc").limit(50).call();
  return (page.records as any[]).filter(
    (r) =>
      r.created_at >= since &&
      (r.asset_balance_changes ?? []).some((c: any) => c.from === buyer && c.to === RENDERGATE_PAYTO),
  );
}

async function waitFor<T>(fn: () => Promise<T | undefined>, tries = 15): Promise<T | undefined> {
  for (let i = 0; i < tries; i++) {
    const hit = await fn();
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return undefined;
}

async function main() {
  const buyer = requireEnv("BUYER_PUBLIC");
  const signer = createEd25519Signer(requireEnv("BUYER_SECRET"), NETWORK);
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer));
  // Fetch envoltorio que solo mide cada request HTTP; el cliente x402 no se toca.
  const timings: { status: number; ms: number; paid: boolean }[] = [];
  const timedFetch: typeof fetch = async (input, init) => {
    const t0 = Date.now();
    const r = await fetch(input, init);
    const paid = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).has("payment-signature");
    timings.push({ status: r.status, ms: Date.now() - t0, paid });
    return r;
  };
  const fetchWithPayment = wrapFetchWithPayment(timedFetch, client);

  console.log(`Comprador: ${buyer}  Agente: ${agent}`);
  console.log(`GET ${endpoint}`);
  await probe402();

  // Horizon guarda created_at con resolución de segundos: margen de 5 s para el filtro.
  const paidAt = new Date(Date.now() - 5000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const started = Date.now();
  const res = await fetchWithPayment(endpoint);
  const body = await res.text();
  console.log(`\nHTTP ${res.status} en ${((Date.now() - started) / 1000).toFixed(1)} s, ${body.length} bytes`);
  console.log(body.slice(0, 400) + (body.length > 400 ? "..." : ""));

  const settleHeader = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  const settle = settleHeader ? (decodePaymentResponseHeader(settleHeader) as any) : null;
  if (settle) console.log("\nLiquidación:", JSON.stringify(settle));
  console.log("Tiempos por request:", JSON.stringify(timings));

  if (settle && settle.success === false) {
    appendFailedCall({
      timestamp: new Date().toISOString(),
      agent,
      buyer,
      payTo: RENDERGATE_PAYTO,
      resource: endpoint,
      httpStatus: res.status,
      errorReason: settle.errorReason,
      totalMs: Date.now() - started,
      requests: timings,
    });
    console.error(`\nEl servidor no liquidó el pago (${settle.errorReason}). Registrado en ${FAILED_CALLS_PATH}`);
    process.exit(1);
  }

  let hash: string | undefined = settle?.transaction || undefined;
  let hashSource: "payment-response" | "horizon-lookup" = "payment-response";
  if (!hash) {
    console.log("\nLa respuesta no trae hash; buscando en /payments del payTo...");
    const found = await waitFor(async () => (await paymentsFrom(buyer, paidAt)).at(-1));
    hash = found?.transaction_hash;
    hashSource = "horizon-lookup";
  }
  if (!hash) {
    console.error("No se encontró la transacción del pago.");
    process.exit(1);
  }

  const record = await waitFor(async () => (await paymentsFrom(buyer, paidAt)).find((r) => r.transaction_hash === hash));
  if (!record) {
    console.error(`Tx ${hash} no aparece en /payments del payTo.`);
    process.exit(1);
  }
  const change = record.asset_balance_changes.find((c: any) => c.from === buyer && c.to === RENDERGATE_PAYTO);

  appendPaidCall({
    timestamp: record.created_at,
    agent,
    buyer,
    payTo: RENDERGATE_PAYTO,
    resource: endpoint,
    httpStatus: res.status,
    txHash: hash,
    hashSource,
    amount: change.amount,
    asset: `${change.asset_code}:${change.asset_issuer}`,
  });
  console.log(`\nLlamada registrada en ${PAID_CALLS_PATH}`);
  console.log(`Tx: ${txLink(hash)}`);
  console.log("\nRegistro en Horizon (/accounts/<payTo>/payments):");
  const { _links, ...fields } = record;
  console.log(JSON.stringify(fields, null, 2));

  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
