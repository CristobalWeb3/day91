import { existsSync, readFileSync } from "node:fs";
import { RENDERGATE_PAYTO, RENDERGATE_URL } from "../config.js";
import { readWallets } from "../ledger-log.js";
import { type Baseline, baseline } from "./baseline.js";
import { type Cohort, cohort } from "./cohort.js";
import * as horizon from "./horizon.js";
import { type BuyerProfile, profile } from "./profile.js";
import { type Probe, probe } from "./probe.js";

const ACTIVATION_PATH = "data/activation.json";
const KNOWN_SERVICES: Record<string, string> = { [RENDERGATE_PAYTO]: RENDERGATE_URL };

export interface ScanResult {
  generatedAt: string;
  payTo: string;
  cutoff: { at: string | null; firstDay91Tx: string | null; source: string };
  baseline: Omit<Baseline, "incoming">;
  externalBuyers: BuyerProfile[];
  cohorts: Cohort[];
  probe: Probe | null;
  warnings: string[];
}

export interface ScanOptions {
  serviceUrl?: string;
  cutoff?: string;
}

function loadCutoff(payTo: string, override?: string) {
  if (override) return { at: override, firstDay91Tx: null, source: "--cutoff" };
  if (existsSync(ACTIVATION_PATH)) {
    const entry = JSON.parse(readFileSync(ACTIVATION_PATH, "utf8"))[payTo];
    if (entry) return { at: entry.cutoff as string, firstDay91Tx: entry.firstDay91Tx as string, source: ACTIVATION_PATH };
  }
  return { at: null, firstDay91Tx: null, source: "sin marca de corte" };
}

export async function scan(payTo: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const cutoff = loadCutoff(payTo, opts.cutoff);
  const day91 = new Set(readWallets().map((w) => w.publicKey));
  const serviceUrl = opts.serviceUrl ?? KNOWN_SERVICES[payTo];

  console.log(`Línea base de ${payTo} (corte: ${cutoff.at ?? "ninguno"})...`);
  const [base, probed] = await Promise.all([
    baseline(payTo, cutoff.at, day91),
    serviceUrl ? probe(serviceUrl, payTo) : Promise.resolve(null),
  ]);

  // Perfil de todos los pagadores externos (antes y después del corte).
  const externals = [...new Set(base.incoming.filter((t) => t.class === "externo").map((t) => t.from))];
  console.log(`Perfilando ${externals.length} comprador(es) externo(s)...`);
  const externalBuyers = await Promise.all(externals.map((a) => profile(a, payTo)));

  // Cohorte por operador: quien dio de alta a cada comprador externo.
  const operators = new Map<string, string[]>();
  for (const p of externalBuyers) {
    if (p.funder) operators.set(p.funder, [...(operators.get(p.funder) ?? []), p.address]);
  }
  const cohorts: Cohort[] = [];
  for (const [operator, via] of operators) {
    console.log(`Cohorte del operador ${operator}...`);
    cohorts.push(await cohort(operator, via, payTo));
  }

  const { incoming, ...baselineOut } = base;
  return {
    generatedAt: new Date().toISOString(),
    payTo,
    cutoff,
    baseline: baselineOut,
    externalBuyers,
    cohorts,
    probe: probed,
    warnings: horizon.warnings,
  };
}
