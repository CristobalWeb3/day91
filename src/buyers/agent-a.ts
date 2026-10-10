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
const task = "Extract the visible content of a SPA (tokens, pools, navigation) for a downstream task";

async function main() {
  console.log(`[${AGENT}] ${task}`);
  console.log(`[${AGENT}] plain GET ${target}`);
  const plain = await plainGet(target);
  console.log(`[${AGENT}] HTTP ${plain.status} · ${plain.bytes} bytes · ${plain.usefulChars} useful chars (threshold ${MIN_USEFUL_CHARS}) · ${plain.ms} ms`);
  console.log(`[${AGENT}] sample: ${JSON.stringify(plain.sample)}`);

  if (plain.status === 200 && plain.usefulChars >= MIN_USEFUL_CHARS) {
    appendDecision({
      timestamp: new Date().toISOString(),
      agent: AGENT,
      task,
      target,
      decision: "skip",
      reason: "the plain GET already returns enough useful text",
      evidence: { plainStatus: plain.status, plainUsefulChars: plain.usefulChars, threshold: MIN_USEFUL_CHARS },
      tx: null,
      amount: null,
    });
    return;
  }

  console.log(`[${AGENT}] not enough useful text: paying RenderGate for a render`);
  const r = await paidGet(renderEndpoint(target), RENDERGATE_PAYTO, AGENT);
  let rendered: any = null;
  try {
    rendered = JSON.parse(r.body);
  } catch {}
  const renderedChars = rendered?.content ? usefulText(String(rendered.content)).length : 0;
  console.log(`[${AGENT}] HTTP ${r.status} in ${(r.totalMs / 1000).toFixed(1)} s · ${renderedChars} useful chars after render (${renderedChars - plain.usefulChars >= 0 ? "+" : ""}${renderedChars - plain.usefulChars} vs plain GET) · renderTimeMs=${rendered?.renderTimeMs ?? "?"}`);
  if (rendered?.title) console.log(`[${AGENT}] title: ${rendered.title}`);
  if (rendered?.refund) console.log(`[${AGENT}] the service refunded the payment: ${JSON.stringify(rendered.refund)}`);
  console.log(`[${AGENT}] request timings: ${JSON.stringify(r.timings)}`);
  if (r.txHash) console.log(`[${AGENT}] tx ${txLink(r.txHash)}`);

  appendDecision({
    timestamp: new Date().toISOString(),
    agent: AGENT,
    task,
    target,
    decision: "pay",
    reason:
      r.settle?.success === false
        ? `paid, but the server did not settle (${r.settle.errorReason})`
        : renderedChars >= MIN_USEFUL_CHARS
          ? `the plain GET lacks the SPA content (${plain.usefulChars} chars); the render has it (${renderedChars} chars)`
          : `the plain GET lacks the SPA content (${plain.usefulChars} chars); paid for a render that also missed the threshold (${renderedChars} chars)`,
    evidence: {
      plainStatus: plain.status,
      plainUsefulChars: plain.usefulChars,
      threshold: MIN_USEFUL_CHARS,
      renderStatus: r.status,
      renderUsefulChars: renderedChars,
      /** Chars útiles que el render aportó sobre el GET simple (negativo = el render trajo menos). */
      renderGainChars: renderedChars - plain.usefulChars,
      renderTitle: rendered?.title ?? null,
      renderSample: rendered?.content ? usefulText(String(rendered.content)).slice(0, 300) : null,
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
