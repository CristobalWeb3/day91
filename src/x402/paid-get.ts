/**
 * GET pagado con el cliente x402 estándar (@x402/fetch + @x402/stellar), sin modificar.
 * Registra la llamada en data/paid-calls.jsonl o data/failed-calls.jsonl y verifica la tx en Horizon
 * (/payments del payTo). Si la respuesta no trae el hash, lo busca filtrando por from = comprador.
 */
import { Horizon } from "@stellar/stellar-sdk";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { HORIZON_URL, NETWORK, requireEnv } from "../config.js";
import { appendFailedCall, appendPaidCall } from "../ledger-log.js";

export interface RequestTiming {
  status: number;
  ms: number;
  paid: boolean;
}

export interface PaidGetResult {
  status: number;
  body: string;
  settle: any | null;
  txHash: string | null;
  hashSource: "payment-response" | "horizon-lookup" | null;
  amount: string | null;
  /** Registro de Horizon (/payments del payTo) sin `_links`. */
  record: any | null;
  timings: RequestTiming[];
  totalMs: number;
}

const horizon = new Horizon.Server(HORIZON_URL);

async function paymentsFrom(payTo: string, buyer: string, since: string) {
  const page = await horizon.payments().forAccount(payTo).order("desc").limit(50).call();
  return (page.records as any[]).filter(
    (r) =>
      r.created_at >= since &&
      (r.asset_balance_changes ?? []).some((c: any) => c.from === buyer && c.to === payTo),
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

export function buyerFromEnv() {
  return { publicKey: requireEnv("BUYER_PUBLIC"), secret: requireEnv("BUYER_SECRET") };
}

export async function paidGet(endpoint: string, payTo: string, agent: string): Promise<PaidGetResult> {
  const buyer = buyerFromEnv();
  const signer = createEd25519Signer(buyer.secret, NETWORK);
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer));

  // Fetch envoltorio que solo mide cada request HTTP; el cliente x402 no se toca.
  const timings: RequestTiming[] = [];
  const timedFetch: typeof fetch = async (input, init) => {
    const t0 = Date.now();
    const r = await fetch(input, init);
    const paid = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).has("payment-signature");
    timings.push({ status: r.status, ms: Date.now() - t0, paid });
    return r;
  };
  const fetchWithPayment = wrapFetchWithPayment(timedFetch, client);

  // Horizon guarda created_at con resolución de segundos: margen de 5 s para el filtro.
  const paidAt = new Date(Date.now() - 5000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const started = Date.now();
  const res = await fetchWithPayment(endpoint);
  const body = await res.text();
  const totalMs = Date.now() - started;

  const settleHeader = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
  const settle = settleHeader ? (decodePaymentResponseHeader(settleHeader) as any) : null;
  const base: PaidGetResult = { status: res.status, body, settle, txHash: null, hashSource: null, amount: null, record: null, timings, totalMs };

  if (settle && settle.success === false) {
    appendFailedCall({
      timestamp: new Date().toISOString(),
      agent,
      buyer: buyer.publicKey,
      payTo,
      resource: endpoint,
      httpStatus: res.status,
      errorReason: settle.errorReason,
      totalMs,
      requests: timings,
    });
    return base;
  }
  if (!settle) return base; // el servidor respondió sin pasar por el pago (p. ej. 400 antes del paywall)

  let hash: string | undefined = settle.transaction || undefined;
  let hashSource: "payment-response" | "horizon-lookup" = "payment-response";
  if (!hash) {
    const found = await waitFor(async () => (await paymentsFrom(payTo, buyer.publicKey, paidAt)).at(-1));
    hash = found?.transaction_hash;
    hashSource = "horizon-lookup";
  }
  if (!hash) return base;

  const record = await waitFor(async () =>
    (await paymentsFrom(payTo, buyer.publicKey, paidAt)).find((r) => r.transaction_hash === hash),
  );
  if (!record) return { ...base, txHash: hash, hashSource };
  const change = record.asset_balance_changes.find((c: any) => c.from === buyer.publicKey && c.to === payTo);

  appendPaidCall({
    timestamp: record.created_at,
    agent,
    buyer: buyer.publicKey,
    payTo,
    resource: endpoint,
    httpStatus: res.status,
    txHash: hash,
    hashSource,
    amount: change.amount,
    asset: `${change.asset_code}:${change.asset_issuer}`,
  });
  const { _links, ...fields } = record;
  return { ...base, txHash: hash, hashSource, amount: change.amount, record: fields };
}
