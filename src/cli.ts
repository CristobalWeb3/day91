/**
 * day91 scan <payTo> [--service <url>] [--cutoff <ISO>]
 * Escribe data/scan-<payTo>.json y data/scan-<payTo>.md.
 */
import { StrKey } from "@stellar/stellar-sdk";
import { writeFileSync } from "node:fs";
import { writeJson } from "./ledger-log.js";
import { scan } from "./scan/index.js";
import { toMarkdown } from "./scan/report.js";

function usage(): never {
  console.error("Uso: npm run day91 -- scan <payTo> [--service <url>] [--cutoff <ISO>]");
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [command, payTo, ...rest] = process.argv.slice(2);
  if (command !== "scan" || !payTo) usage();
  if (!StrKey.isValidEd25519PublicKey(payTo)) {
    console.error(`payTo inválido: ${payTo}`);
    process.exit(1);
  }

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
