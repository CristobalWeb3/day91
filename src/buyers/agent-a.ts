/**
 * Agente A: necesita el contenido de un SPA (por defecto Soroswap, uno de los ejemplos del demo de RenderGate).
 * 1. GET simple. 2. Si el texto útil no alcanza, paga un render a RenderGate con el cliente x402 estándar.
 * Uso: npm run agent-a [-- <url del SPA>]
 */
import { RENDERGATE_PAYTO, txLink } from "../config.js";
import { paidGet } from "../x402/paid-get.js";
import { MIN_USEFUL_CHARS, appendDecision, plainGet, renderEndpoint, usefulText } from "./common.js";

const AGENT = "agent-a";
const target = process.argv[2] ?? "https://app.soroswap.finance/";
const task = "Extraer el contenido visible de un SPA (tokens, pools y navegación) para alimentar una tarea posterior";

async function main() {
  console.log(`[${AGENT}] ${task}`);
  console.log(`[${AGENT}] GET simple ${target}`);
  const plain = await plainGet(target);
  console.log(`[${AGENT}] HTTP ${plain.status} · ${plain.bytes} bytes · ${plain.usefulChars} chars útiles (umbral ${MIN_USEFUL_CHARS}) · ${plain.ms} ms`);
  console.log(`[${AGENT}] muestra: ${JSON.stringify(plain.sample)}`);

  if (plain.status === 200 && plain.usefulChars >= MIN_USEFUL_CHARS) {
    appendDecision({
      timestamp: new Date().toISOString(),
      agent: AGENT,
      task,
      target,
      decision: "skip",
      reason: "el GET simple ya trae suficiente texto útil",
      evidence: { plainStatus: plain.status, plainUsefulChars: plain.usefulChars, threshold: MIN_USEFUL_CHARS },
      tx: null,
      amount: null,
    });
    return;
  }

  console.log(`[${AGENT}] Texto útil insuficiente: pago un render a RenderGate`);
  const r = await paidGet(renderEndpoint(target), RENDERGATE_PAYTO, AGENT);
  let rendered: any = null;
  try {
    rendered = JSON.parse(r.body);
  } catch {}
  const renderedChars = rendered?.content ? usefulText(String(rendered.content)).length : 0;
  console.log(`[${AGENT}] HTTP ${r.status} en ${(r.totalMs / 1000).toFixed(1)} s · ${renderedChars} chars útiles tras el render · renderTimeMs=${rendered?.renderTimeMs ?? "?"}`);
  if (rendered?.title) console.log(`[${AGENT}] título: ${rendered.title}`);
  if (rendered?.refund) console.log(`[${AGENT}] el servicio devolvió el pago: ${JSON.stringify(rendered.refund)}`);
  console.log(`[${AGENT}] tiempos por request: ${JSON.stringify(r.timings)}`);
  if (r.txHash) console.log(`[${AGENT}] tx ${txLink(r.txHash)}`);

  appendDecision({
    timestamp: new Date().toISOString(),
    agent: AGENT,
    task,
    target,
    decision: "pay",
    reason:
      r.settle?.success === false
        ? `pagó pero el servidor no liquidó (${r.settle.errorReason})`
        : renderedChars >= MIN_USEFUL_CHARS
          ? `el GET simple no trae el contenido del SPA (${plain.usefulChars} chars); el render sí (${renderedChars} chars)`
          : `el GET simple no trae el contenido del SPA (${plain.usefulChars} chars); pagó el render y tampoco alcanzó el umbral (${renderedChars} chars)`,
    evidence: {
      plainStatus: plain.status,
      plainUsefulChars: plain.usefulChars,
      threshold: MIN_USEFUL_CHARS,
      renderStatus: r.status,
      renderUsefulChars: renderedChars,
      renderTimeMs: rendered?.renderTimeMs ?? null,
      totalMs: r.totalMs,
      requests: r.timings,
      refund: rendered?.refund ?? null,
      settle: r.settle,
    },
    tx: r.txHash,
    amount: r.amount,
  });
  if (r.status !== 200 || !r.txHash) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
