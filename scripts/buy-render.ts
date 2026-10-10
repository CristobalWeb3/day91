/**
 * Un render pagado de punta a punta contra RenderGate con el cliente x402 estándar, sin modificar.
 * Uso: npm run buy-render [-- <url a renderizar>]
 * Imprime el 402 recibido, la respuesta, el hash de la transacción y la verifica en Horizon (/payments del payTo).
 */
import { Horizon } from "@stellar/stellar-sdk";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { HORIZON_URL, NETWORK, RENDERGATE_PAYTO, RENDERGATE_URL, USDC_DECIMALS, requireEnv, txLink } from "../src/config.js";

const target = process.argv[2] ?? "https://example.com";
const endpoint = `${RENDERGATE_URL}/render?url=${encodeURIComponent(target)}`;

async function showChallenge() {
  const res = await fetch(endpoint);
  const header = res.headers.get("payment-required");
  if (res.status !== 402 || !header) {
    console.log(`Respuesta inesperada sin pago: ${res.status}`);
    return;
  }
  const challenge = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  for (const a of challenge.accepts) {
    const human = Number(a.amount) / 10 ** USDC_DECIMALS;
    console.log(`402: ${a.scheme} ${a.network} amount=${a.amount} (${human} USDC) payTo=${a.payTo}`);
  }
}

async function waitForPayment(hash: string, tries = 10) {
  const horizon = new Horizon.Server(HORIZON_URL);
  for (let i = 0; i < tries; i++) {
    const page = await horizon.payments().forAccount(RENDERGATE_PAYTO).order("desc").limit(20).call();
    const hit = page.records.find((r: any) => r.transaction_hash === hash);
    if (hit) return hit as any;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

async function main() {
  const signer = createEd25519Signer(requireEnv("BUYER_SECRET"), NETWORK);
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  console.log(`Comprador: ${requireEnv("BUYER_PUBLIC")}`);
  console.log(`GET ${endpoint}`);
  await showChallenge();

  const started = Date.now();
  const res = await fetchWithPayment(endpoint);
  const body = await res.text();
  console.log(`\nHTTP ${res.status} en ${((Date.now() - started) / 1000).toFixed(1)} s, ${body.length} bytes`);
  console.log(body.slice(0, 400) + (body.length > 400 ? "..." : ""));

  const settleHeader = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  if (!settleHeader) {
    console.error("\nSin header payment-response: el pago no se liquidó.");
    process.exit(1);
  }
  const settle = decodePaymentResponseHeader(settleHeader);
  console.log("\nLiquidación:", JSON.stringify(settle));
  const hash = (settle as any).transaction;
  if (!res.ok || !hash) process.exit(1);
  console.log(`Tx: ${txLink(hash)}`);

  const payment = await waitForPayment(hash);
  if (!payment) {
    console.error("La transacción no aparece aún en /payments del payTo.");
    process.exit(1);
  }
  for (const c of payment.asset_balance_changes ?? []) {
    console.log(`Horizon /payments OK: ${c.amount} ${c.asset_code ?? ""} ${c.from} -> ${c.to} (${payment.created_at})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
