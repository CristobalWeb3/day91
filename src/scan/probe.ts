import { USDC_DECIMALS, USDC_SAC } from "../config.js";
import { fmt } from "./amounts.js";

export interface Probe {
  serviceUrl: string;
  probedAt: string;
  listing: { status: number; latencyMs: number; body: any };
  challenge: {
    url: string;
    status: number;
    latencyMs: number;
    x402Version: number | null;
    resource: any;
    accepts: {
      scheme: string;
      network: string;
      asset: string;
      payTo: string;
      amountRaw: string;
      amount: string;
      maxTimeoutSeconds: number | null;
      extra: any;
    }[];
  };
  /** Chequeo de consistencia ficha vs 402 (no es un hallazgo por sí solo). */
  checks: { name: string; ok: boolean; detail: string }[];
}

async function timed(url: string) {
  const t0 = Date.now();
  const res = await fetch(url);
  return { res, latencyMs: Date.now() - t0 };
}

/** Lee la ficha (GET /) y el 402 de un recurso pagado. No paga nada. */
export async function probe(serviceUrl: string, payTo: string, samplePath = "/render?url=https%3A%2F%2Fexample.com"): Promise<Probe> {
  const listing = await timed(`${serviceUrl}/`);
  const listingBody = await listing.res.json().catch(() => null);

  const challengeUrl = `${serviceUrl}${samplePath}`;
  const ch = await timed(challengeUrl);
  const raw = ch.res.headers.get("payment-required");
  const decoded = raw ? JSON.parse(Buffer.from(raw, "base64").toString("utf8")) : null;
  const accepts = (decoded?.accepts ?? []).map((a: any) => ({
    scheme: a.scheme,
    network: a.network,
    asset: a.asset,
    payTo: a.payTo,
    amountRaw: a.amount,
    amount: fmt(BigInt(a.amount) * 10n ** BigInt(7 - USDC_DECIMALS)),
    maxTimeoutSeconds: a.maxTimeoutSeconds ?? null,
    extra: a.extra ?? null,
  }));

  const first = accepts[0];
  const listedPrice = typeof listingBody?.price === "string" ? listingBody.price.replace(/^\$/, "") : null;
  const checks: Probe["checks"] = [];
  if (first) {
    checks.push({
      name: "precio ficha = precio 402",
      ok: listedPrice !== null && fmt(BigInt(Math.round(Number(listedPrice) * 1e7))) === first.amount,
      detail: `ficha ${listingBody?.price ?? "?"} · 402 ${first.amount} USDC (raw ${first.amountRaw}, ${USDC_DECIMALS} decimales)`,
    });
    checks.push({ name: "red ficha = red 402", ok: listingBody?.network === first.network, detail: `${listingBody?.network} · ${first.network}` });
    checks.push({ name: "payTo 402 = payTo analizado", ok: first.payTo === payTo, detail: first.payTo });
    checks.push({ name: "asset 402 = USDC SAC testnet", ok: first.asset === USDC_SAC, detail: first.asset });
  }

  return {
    serviceUrl,
    probedAt: new Date().toISOString(),
    listing: { status: listing.res.status, latencyMs: listing.latencyMs, body: listingBody },
    challenge: {
      url: challengeUrl,
      status: ch.res.status,
      latencyMs: ch.latencyMs,
      x402Version: decoded?.x402Version ?? null,
      resource: decoded?.resource ?? null,
      accepts,
    },
    checks,
  };
}
