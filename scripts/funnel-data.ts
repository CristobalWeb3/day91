/**
 * Escribe docs/data.json para el funnel (GitHub Pages) con todo lo que NO se calcula en el navegador:
 * marca de corte (data/activation.json), wallets de Day91, direcciones vinculadas (scan), decisiones de los agentes,
 * mercado y prospectos (data/prospects-<payTo>.json), las 4 cifras del hero (derivadas, nada a mano) y un snapshot
 * de los pagos clasificados leído de Horizon ahora, por si la lectura en vivo falla en el navegador.
 * Uso: npm run funnel-data [-- <payTo>]
 */
import { existsSync, readFileSync } from "node:fs";
import { RENDERGATE_PAYTO, RENDERGATE_URL } from "../src/config.js";
import { readWallets, writeJson } from "../src/ledger-log.js";
import { fmt } from "../src/scan/amounts.js";
import * as horizon from "../src/scan/horizon.js";
import { normalize } from "../src/scan/transfers.js";

const payTo = process.argv[2] ?? RENDERGATE_PAYTO;
const OUT = "docs/data.json";
const REPO = "https://github.com/CristobalWeb3/day91";

const activation = JSON.parse(readFileSync("data/activation.json", "utf8"))[payTo];
if (!activation) throw new Error(`Sin marca de corte para ${payTo} en data/activation.json`);

const scanPath = `data/scan-${payTo}.json`;
if (!existsSync(scanPath)) throw new Error(`Falta ${scanPath}: corre primero npm run day91 -- scan ${payTo}`);
const scan = JSON.parse(readFileSync(scanPath, "utf8"));

const prospectsPath = `data/prospects-${payTo}.json`;
const prospects = existsSync(prospectsPath) ? JSON.parse(readFileSync(prospectsPath, "utf8")) : null;
if (!prospects) console.warn(`Aviso: falta ${prospectsPath}; el funnel no tendrá sección de mercado (npm run day91 -- prospects ${payTo})`);

const decisions = existsSync("data/decisions.jsonl")
  ? readFileSync("data/decisions.jsonl", "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];

/** Descripción fija en inglés de la tarea de cada agente (los `task` del log quedan como están). */
const TASK_SUMMARY: Record<string, string> = {
  "agent-a": "Needs the visible content of a JS-rendered page (SPA). Tries a plain GET first; pays for a render only if the useful text is below 500 chars.",
  "agent-b": "Buys only with evidence of independent demand: ≥ 3 external payers in the last 90 days, excluding linked and Day91 wallets, read live from Horizon.",
  "agent-c": "Needs a static page (the service's README). A plain GET is enough, so it never pays.",
  "buy-render": "Manual end-to-end check: one paid render with the standard x402 client.",
};

const gainOf = (e: any): number | null =>
  e?.renderGainChars ??
  (typeof e?.renderUsefulChars === "number" && typeof e?.plainUsefulChars === "number" ? e.renderUsefulChars - e.plainUsefulChars : null);

/** Resumen en inglés construido solo desde los números de `evidence` (los `reason` del log quedan como están). */
function summarize(d: any): string {
  const e = d.evidence ?? {};
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  if (typeof e.externalPayers90d === "number") {
    const base = `${e.externalPayers90d} independent payer${e.externalPayers90d === 1 ? "" : "s"} in ${e.windowDays} days; policy requires ≥ ${e.minExternalPayers}.`;
    return d.decision === "pay" ? `${base} Bought one render.` : base;
  }
  if (typeof e.renderUsefulChars === "number" && typeof e.plainUsefulChars === "number") {
    const settle = e.settle?.success === false ? ` Server did not settle (${e.settle.errorReason}).` : "";
    return `Plain GET: ${e.plainUsefulChars} useful chars. Paid render: ${e.renderUsefulChars} chars (${sign(gainOf(e)!)}).${settle}`;
  }
  if (typeof e.plainUsefulChars === "number") {
    return `Plain GET: ${e.plainUsefulChars} useful chars (threshold ${e.threshold}); no render needed.`;
  }
  return d.reason;
}

const decisionsOut = decisions.map((d) => ({
  agent: d.agent,
  timestamp: d.timestamp,
  task: d.task,
  taskSummary: TASK_SUMMARY[d.agent] ?? d.task,
  target: d.target,
  decision: d.decision,
  reason: d.reason,
  summary: summarize(d),
  tx: d.tx,
  amount: d.amount,
  plainUsefulChars: d.evidence?.plainUsefulChars ?? null,
  renderUsefulChars: d.evidence?.renderUsefulChars ?? null,
  renderGainChars: gainOf(d.evidence),
  renderTimeMs: d.evidence?.renderTimeMs ?? null,
}));

// Las 4 cifras del hero, todas derivadas.
const before = scan.baseline.before;
const harnessPct = before.total.payments ? Math.round((1000 * before.byClass.vinculado.payments) / before.total.payments) / 10 : null;
const bestRender = decisionsOut
  .filter((d) => d.agent === "agent-a" && d.decision === "pay" && d.renderGainChars !== null)
  .sort((a, b) => (b.renderGainChars ?? 0) - (a.renderGainChars ?? 0))[0];
const hero = {
  harness: { value: harnessPct !== null ? `${harnessPct}%` : "—", label: "of payments came from the author's own harness" },
  market: prospects
    ? {
        value: `${prospects.share.buyers} of ${prospects.market.excludingTestTraffic.buyers}`,
        label: `buyers in the x402 market reached in ${prospects.windowDays} days (${prospects.share.paymentsPctExcludingTestTraffic}% of payments)`,
      }
    : { value: "—", label: "market not scanned yet" },
  prospects: prospects
    ? { value: String(prospects.candidates.ranked), label: "probable buyers found, none reached yet" }
    : { value: "—", label: "market not scanned yet" },
  render: bestRender
    ? { value: `${bestRender.plainUsefulChars} → ${bestRender.renderUsefulChars}`, label: `chars after one ${Number(bestRender.amount).toString()} USDC render`, tx: bestRender.tx }
    : { value: "—", label: "no paid render yet" },
};

// Títulos de los hallazgos del reporte GTM, leídos del .md (no se escriben a mano), con el ancla que GitHub genera.
const REPORT_PATH = "reasoning/rendergate-gtm.md";
const githubSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9 \-]/g, "").trim().replace(/ /g, "-");
const findings = existsSync(REPORT_PATH)
  ? [...readFileSync(REPORT_PATH, "utf8").matchAll(/^## (\d+)\. (.+?)\s*$/gm)].map((m) => ({
      n: Number(m[1]),
      title: m[2],
      url: `${REPO}/blob/main/${REPORT_PATH}#${githubSlug(`${m[1]}. ${m[2]}`)}`,
    }))
  : [];

// Snapshot de los pagos USDC recibidos, clasificados, por si Horizon no responde en el navegador.
const day91 = new Set(readWallets().map((w) => w.publicKey));
const linked = new Set<string>(scan.baseline.linked.map((l: any) => l.address));
const classify = (from: string) => (day91.has(from) ? "day91" : linked.has(from) ? "linked" : "external");
console.log(`Leyendo /payments de ${payTo} para el snapshot...`);
const records = await horizon.payments(payTo);
const snapshotPayments = normalize(records)
  .filter((t) => t.usdc && t.to === payTo && t.from !== payTo && t.kind !== "create_account")
  .map((t) => ({ at: t.at, tx: t.tx, from: t.from, amount: fmt(t.amount), cls: classify(t.from) }));

const data = {
  generatedAt: new Date().toISOString(),
  network: "testnet",
  service: { name: activation.service ?? "RenderGate", url: RENDERGATE_URL, payTo },
  links: {
    repo: REPO,
    readme: `${REPO}#readme`,
    report: `${REPO}/blob/main/reasoning/rendergate-gtm.md`,
    prospectsMd: `${REPO}/blob/main/data/prospects-${payTo}.md`,
    scanMd: `${REPO}/blob/main/data/scan-${payTo}.md`,
    video: "https://youtu.be/pcEAPKgzaTQ",
    issue: "https://github.com/tantk/rendergate/issues/2",
  },
  headline: `${activation.service ?? "RenderGate"} works. Almost nobody is buying.`,
  subline: "Day91 reads the ledger, finds the market, sends buyer agents, and measures what happens.",
  accountCreatedAt: scan.baseline.account.createdAt,
  cutoff: activation.cutoff,
  firstDay91Tx: activation.firstDay91Tx,
  day91Wallets: [...day91],
  linked: scan.baseline.linked.map((l: any) => ({
    address: l.address,
    transfersFromPayTo: l.evidence.length,
    memos: [...new Set(l.evidence.map((e: any) => e.memo).filter(Boolean))],
    createdSecondsAfterPayTo: l.createdSecondsAfterPayTo,
  })),
  scanGeneratedAt: scan.generatedAt,
  hero,
  market: prospects
    ? {
        generatedAt: prospects.generatedAt,
        windowDays: prospects.windowDays,
        total: prospects.market.total,
        excludingTestTraffic: prospects.market.excludingTestTraffic,
        share: prospects.share,
        testTrafficRule: prospects.testTrafficRule,
        testTrafficServices: prospects.testTrafficServices.length,
        prospects: prospects.prospects
          .filter((p: any) => p.rank !== null)
          .map((p: any) => ({
            rank: p.rank,
            address: p.address,
            isContract: p.isContract,
            explorer: p.explorer,
            services: p.services,
            payments: p.payments,
            usdc: p.usdc,
            first: p.first,
            last: p.last,
            paidTarget: p.paidTarget,
            notes: p.notes,
          })),
      }
    : null,
  findings,
  decisions: decisionsOut,
  snapshot: { takenAt: new Date().toISOString(), records: records.length, payments: snapshotPayments },
};

writeJson(OUT, data);
console.log(
  `Escrito ${OUT}: corte ${data.cutoff}, ${data.day91Wallets.length} wallet(s) Day91, ${data.linked.length} vinculada(s), ${data.decisions.length} decision(es), ` +
    `snapshot ${snapshotPayments.length} pagos, mercado ${data.market ? "sí" : "no"}`,
);
console.log("hero:", JSON.stringify(hero));
console.log(`findings: ${findings.length}`, findings.map((f) => `${f.n}. ${f.title.slice(0, 40)}…`).join(" | "));
