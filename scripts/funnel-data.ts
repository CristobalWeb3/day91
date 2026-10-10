/**
 * Escribe docs/data.json para el funnel (GitHub Pages) a partir de lo que NO se calcula en el navegador:
 * marca de corte (data/activation.json), wallets de Day91 (data/day91-wallets.json), direcciones vinculadas
 * (del scan) y las decisiones de los agentes (data/decisions.jsonl). El HTML lee Horizon en vivo para lo demás.
 * Uso: npm run funnel-data [-- <payTo>]
 */
import { existsSync, readFileSync } from "node:fs";
import { RENDERGATE_PAYTO, RENDERGATE_URL } from "../src/config.js";
import { readWallets } from "../src/ledger-log.js";
import { writeJson } from "../src/ledger-log.js";

const payTo = process.argv[2] ?? RENDERGATE_PAYTO;
const OUT = "docs/data.json";

const activation = JSON.parse(readFileSync("data/activation.json", "utf8"))[payTo];
if (!activation) throw new Error(`Sin marca de corte para ${payTo} en data/activation.json`);

const scanPath = `data/scan-${payTo}.json`;
if (!existsSync(scanPath)) throw new Error(`Falta ${scanPath}: corre primero npm run day91 -- scan ${payTo}`);
const scan = JSON.parse(readFileSync(scanPath, "utf8"));

const decisions = existsSync("data/decisions.jsonl")
  ? readFileSync("data/decisions.jsonl", "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  : [];

const data = {
  generatedAt: new Date().toISOString(),
  network: "testnet",
  service: { name: activation.service ?? "RenderGate", url: RENDERGATE_URL, payTo },
  cutoff: activation.cutoff,
  firstDay91Tx: activation.firstDay91Tx,
  day91Wallets: readWallets().map((w) => w.publicKey),
  linked: scan.baseline.linked.map((l: any) => ({
    address: l.address,
    transfersFromPayTo: l.evidence.length,
    memos: [...new Set(l.evidence.map((e: any) => e.memo).filter(Boolean))],
    createdSecondsAfterPayTo: l.createdSecondsAfterPayTo,
  })),
  scanGeneratedAt: scan.generatedAt,
  decisions: decisions.map((d) => ({
    agent: d.agent,
    timestamp: d.timestamp,
    task: d.task,
    target: d.target,
    decision: d.decision,
    reason: d.reason,
    tx: d.tx,
    amount: d.amount,
    // Corridas anteriores a la existencia del campo: se deriva de los dos conteos guardados.
    renderGainChars:
      d.evidence?.renderGainChars ??
      (typeof d.evidence?.renderUsefulChars === "number" && typeof d.evidence?.plainUsefulChars === "number"
        ? d.evidence.renderUsefulChars - d.evidence.plainUsefulChars
        : null),
  })),
};

writeJson(OUT, data);
console.log(`Escrito ${OUT}: corte ${data.cutoff}, ${data.day91Wallets.length} wallet(s) Day91, ${data.linked.length} vinculada(s), ${data.decisions.length} decision(es)`);
