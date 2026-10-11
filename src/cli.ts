/**
 * day91 scan <payTo> [--service <url>] [--cutoff <ISO>]   → data/scan-<payTo>.{json,md}
 * day91 prospects <payTo> [--days <n>]                     → data/prospects-<payTo>.{json,md}
 */
import { StrKey } from "@stellar/stellar-sdk";
import { writeFileSync } from "node:fs";
import { writeJson } from "./ledger-log.js";
import { scan } from "./scan/index.js";
import { prospects, toProspectsMarkdown } from "./scan/prospects.js";
import { toMarkdown } from "./scan/report.js";

function usage(): never {
  console.error("Uso:\n  npm run day91 -- scan <payTo> [--service <url>] [--cutoff <ISO>]\n  npm run day91 -- prospects <payTo> [--days <n>]");
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function runScan(payTo: string, rest: string[]) {
  const result = await scan(payTo, { serviceUrl: flag(rest, "--service"), cutoff: flag(rest, "--cutoff") });
  const base = `data/scan-${payTo}`;
  writeJson(`${base}.json`, result);
  writeFileSync(`${base}.md`, toMarkdown(result));
  console.log(`\nEscrito ${base}.json y ${base}.md`);

  const b = result.baseline;
  console.log(`Antes del corte: ${b.before.total.payments} pagos · ${b.before.total.payers} pagadores ` +
    `(vinculado ${b.before.byClass.vinculado.payments}, day91 ${b.before.byClass.day91.payments}, externo ${b.before.byClass.externo.payments})`);
  console.log(`Después del corte: ${b.after.total.payments} pagos ` +
    `(vinculado ${b.after.byClass.vinculado.payments}, day91 ${b.after.byClass.day91.payments}, externo ${b.after.byClass.externo.payments})`);
  console.log(`Días sin ventas externas hasta el corte: ${b.daysWithoutExternalSales ?? "—"}`);
  if (result.warnings.length) console.log(`Advertencias: ${result.warnings.join("; ")}`);
}

async function runProspects(payTo: string, rest: string[]) {
  const days = Number(flag(rest, "--days") ?? 90);
  console.log(`Leyendo los últimos ${days} días de ${(await import("./config.js")).FACILITATORS.length} facilitators...`);
  const result = await prospects(payTo, days);
  const base = `data/prospects-${payTo}`;
  writeJson(`${base}.json`, result);
  writeFileSync(`${base}.md`, toProspectsMarkdown(result));
  console.log(`\nEscrito ${base}.json y ${base}.md`);
  const m = result.market;
  console.log(`Mercado ${days} d: ${m.total.payments} pagos · ${m.total.buyers} compradores · ${m.total.services} servicios · ${m.total.usdc} USDC (sin tráfico de prueba probable: ${m.excludingTestTraffic.payments} · ${m.excludingTestTraffic.buyers} · ${m.excludingTestTraffic.services})`);
  console.log(`Cuota del payTo: ${result.share.payments} pagos (${result.share.paymentsPct}%) · ${result.share.buyers} compradores (${result.share.buyersPct}%)`);
  console.log(`Tráfico de prueba probable: ${result.testTrafficServices.length} servicios · prospectos: ${result.candidates.ranked} rankeados, ${result.candidates.excludedTestTrafficBuyers} excluidos`);
  if (result.warnings.length) console.log(`Advertencias: ${result.warnings.join("; ")}`);
}

async function main() {
  const [command, payTo, ...rest] = process.argv.slice(2);
  if (!payTo || !["scan", "prospects"].includes(command)) usage();
  if (!StrKey.isValidEd25519PublicKey(payTo)) {
    console.error(`payTo inválido: ${payTo}`);
    process.exit(1);
  }
  if (command === "scan") await runScan(payTo, rest);
  else await runProspects(payTo, rest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
