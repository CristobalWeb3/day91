/**
 * Agente C: su tarea no necesita render. Lee el README de RenderGate (texto estático en GitHub);
 * el GET simple alcanza y no paga. Misma regla que A: paga solo si el texto útil no llega al umbral.
 * Uso: npm run agent-c [-- <url estática>]
 */
import { MIN_USEFUL_CHARS, appendDecision, plainGet } from "./common.js";

const AGENT = "agent-c";
const target = process.argv[2] ?? "https://raw.githubusercontent.com/tantk/rendergate/HEAD/README.md";
const task = "Read the docs of an x402 service (static page) to summarize its API and price";

async function main() {
  console.log(`[${AGENT}] ${task}`);
  console.log(`[${AGENT}] GET simple ${target}`);
  const plain = await plainGet(target);
  console.log(`[${AGENT}] HTTP ${plain.status} · ${plain.bytes} bytes · ${plain.usefulChars} chars útiles (umbral ${MIN_USEFUL_CHARS}) · ${plain.ms} ms`);
  console.log(`[${AGENT}] muestra: ${JSON.stringify(plain.sample)}`);

  const enough = plain.status === 200 && plain.usefulChars >= MIN_USEFUL_CHARS;
  appendDecision({
    timestamp: new Date().toISOString(),
    agent: AGENT,
    task,
    target,
    decision: "skip",
    reason: enough
      ? "static page: the plain GET returns the full text; rendering adds nothing"
      : "not enough useful text, but the task does not justify paying for a render",
    evidence: { plainStatus: plain.status, plainUsefulChars: plain.usefulChars, threshold: MIN_USEFUL_CHARS, bytes: plain.bytes, ms: plain.ms },
    tx: null,
    amount: null,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
