import { fmt, toStroops } from "./amounts.js";
import { CLASSES, type Segment } from "./baseline.js";
import type { ScanResult } from "./index.js";
import { label } from "./labels.js";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const acct = (a: string) => `[${short(a)}](${EXPLORER}/${a.startsWith("C") ? "contract" : "account"}/${a})${label(a) ? ` (${label(a)})` : ""}`;
const tx = (h: string) => `[${h.slice(0, 8)}…](${EXPLORER}/tx/${h})`;
const pct = (n: number, d: number) => (d === 0 ? "—" : `${((100 * n) / d).toFixed(1)}%`);
const row = (cells: (string | number)[]) => `| ${cells.join(" | ")} |`;

function classTable(seg: Segment): string[] {
  return [
    row(["clase", "pagos", "pagadores", "monto USDC", "% de pagos"]),
    row(["---", "---:", "---:", "---:", "---:"]),
    ...CLASSES.map((c) => {
      const s = seg.byClass[c];
      return row([c, s.payments, s.payers, s.amount, pct(s.payments, seg.total.payments)]);
    }),
    row(["**total**", seg.total.payments, seg.total.payers, seg.total.amount, "100%"]),
  ];
}

function payerTable(seg: Segment): string[] {
  if (seg.payers.length === 0) return ["_Sin pagos._"];
  return [
    row(["pagador", "clase", "pagos", "monto USDC", "primero", "último"]),
    row(["---", "---", "---:", "---:", "---", "---"]),
    ...seg.payers.map((p) => row([acct(p.address), p.class, p.payments, p.amount, p.first, p.last])),
  ];
}

export function toMarkdown(r: ScanResult): string {
  const b = r.baseline;
  const L: string[] = [];
  const name = label(r.payTo) ?? short(r.payTo);
  L.push(`# Day91 scan: ${name}`, "");
  L.push(`- payTo: \`${r.payTo}\` (red: stellar:testnet)`);
  L.push(`- Generado: ${r.generatedAt}`);
  L.push(`- Marca de corte de la activación: **${r.cutoff.at ?? "ninguna"}**${r.cutoff.firstDay91Tx ? ` (primer pago de Day91: ${tx(r.cutoff.firstDay91Tx)})` : ""}. Fuente: \`${r.cutoff.source}\`.`);
  L.push(`- Cuenta creada ${b.account.createdAt ?? "?"} por ${b.account.funder ? acct(b.account.funder) : "?"}. Saldo USDC actual: ${b.account.usdcBalance ? fmt(toStroops(b.account.usdcBalance)) : "?"}.`);
  L.push(`- Clasificación de pagadores: **vinculado** = recibió fondos del propio payTo; **day91** = está en \`data/day91-wallets.json\`; **externo** = el resto.`);
  L.push(`- Todos los montos en USDC con 7 decimales.`, "");

  L.push(`## Línea base (${b.before.label})`, "", ...classTable(b.before), "");
  const linkedShare = pct(b.before.byClass.vinculado.payments, b.before.total.payments);
  L.push(`- Pagos de pagadores vinculados: **${linkedShare}** del total.`);
  L.push(`- Primer pago: ${b.before.firstPayment ?? "—"} · último pago: ${b.before.lastPayment ?? "—"} · último pago externo: ${b.before.lastExternalPayment ?? "—"}.`);
  L.push(`- Días sin ventas externas hasta el corte: **${b.daysWithoutExternalSales ?? "—"}**.`);
  for (const w of b.windows) {
    L.push(`- Últimos ${w.days} días antes del corte: ${CLASSES.map((c) => `${c} ${w.byClass[c]} pagos / ${w.payersByClass[c]} pagadores`).join(" · ")}.`);
  }
  L.push("", "### Pagos por día", "", row(["día", "pagos", ...CLASSES]), row(["---", "---:", ...CLASSES.map(() => "---:")]));
  for (const d of b.before.byDay) L.push(row([d.day, d.payments, ...CLASSES.map((c) => d.byClass[c])]));
  L.push("", "### Pagadores", "", ...payerTable(b.before), "");

  L.push("### Evidencia de vínculo", "");
  if (b.linked.length === 0) L.push("_Ningún pagador recibió fondos del payTo._");
  for (const l of b.linked) {
    const origin =
      l.createdSecondsAfterPayTo !== null
        ? ` · cuenta creada **${l.createdSecondsAfterPayTo} s después del payTo** por el mismo funder (${l.funder ? acct(l.funder) : "?"})`
        : l.createdAt
          ? ` · cuenta creada ${l.createdAt} por ${l.funder ? acct(l.funder) : "?"}`
          : "";
    L.push(`- ${acct(l.address)}: ${l.evidence.length} transferencia(s) desde el payTo${origin}`);
    for (const e of l.evidence) L.push(`  - ${e.at} · ${e.amount} ${e.usdc ? "USDC" : "(otro asset)"} · memo ${e.memo === null ? "—" : `\`${e.memo}\``} · ${tx(e.tx)}`);
  }
  if (b.linked.some((l) => l.evidence.some((e) => e.memo?.startsWith("refund:")))) {
    L.push("", "> Nota: hay vínculos que vienen de devoluciones (`refund:*`). La regla también marcaría como vinculado a un comprador externo al que el servicio le devolvió un render fallido; revisar la evidencia de cada caso.");
  }
  L.push("");

  L.push(`## Después del corte (${b.after.label})`, "", ...classTable(b.after), "", ...payerTable(b.after), "");

  L.push("## Compradores externos", "");
  if (r.externalBuyers.length === 0) L.push("_Ninguno._", "");
  for (const p of r.externalBuyers) {
    L.push(`### ${acct(p.address)}`, "");
    L.push(`- Alta: ${p.createdAt ?? "?"} por ${p.funder ? acct(p.funder) : "?"}${p.sponsor ? `; reservas patrocinadas por ${acct(p.sponsor)}` : ""}.`);
    L.push(`- Actividad: ${p.firstActivity ?? "?"} → ${p.lastActivity ?? "?"}.`);
    for (const f of p.fundedWith) L.push(`- Fondeo: ${f.amount} USDC desde ${acct(f.from)} (${f.at}, ${tx(f.tx)}).`);
    L.push(`- Gasto en servicios: ${p.totalServiceSpend} USDC; en este payTo: ${p.spendOnTarget} USDC (${p.targetShare === null ? "—" : `${(100 * p.targetShare).toFixed(1)}%`}).`, "");
    L.push("Servicios x402 (pagos enviados por un facilitator):", "");
    L.push(row(["servicio (payTo)", "pagos", "monto USDC", "precio unitario", "facilitator(s)", "primero", "último"]));
    L.push(row(["---", "---:", "---:", "---", "---", "---", "---"]));
    for (const s of p.services) L.push(row([acct(s.to), s.payments, s.amount, s.unitPrices.join(", "), s.facilitators.map(acct).join(", "), s.first, s.last]));
    if (p.otherOutflows.length) {
      L.push("", "Otras salidas USDC (firmadas por el propio comprador):", "");
      for (const s of p.otherOutflows) L.push(`- ${acct(s.to)}: ${s.payments} transferencia(s), ${s.amount} USDC`);
    }
    for (const br of p.bridges) {
      L.push("", `- Bridge CCTP: ${br.amount} USDC → ${br.chain ?? "?"} (dominio ${br.domain ?? "?"}), destinatario ${br.mintRecipient ?? "?"} · ${br.at} · ${tx(br.tx)}`);
    }
    L.push("");
  }

  L.push("## Cohortes por operador", "");
  if (r.cohorts.length === 0) L.push("_Ninguna._", "");
  for (const c of r.cohorts) {
    L.push(`### Operador ${acct(c.operator)}`, "", `- Llegamos aquí por: ${c.via.map(acct).join(", ")}.`);
    if (c.skipped) {
      L.push(`- Omitida: ${c.skipped}.`, "");
      continue;
    }
    L.push(`- **${c.createAccounts} \`create_account\`** entre ${c.firstCreate} y ${c.lastCreate} (${c.sponsoredReserves} con reservas patrocinadas).`);
    L.push(`- Wallets fondeadas con USDC: ${c.walletsFunded} · pagaron algún servicio x402: ${c.walletsThatPaidServices} · pagaron este payTo: **${c.walletsThatPaidTarget}** · hicieron bridge: ${c.walletsThatBridged}.`, "");
    L.push("Servicios x402 que paga la cohorte:", "");
    L.push(row(["servicio (payTo)", "wallets", "pagos", "monto USDC"]), row(["---", "---:", "---:", "---:"]));
    for (const s of c.services) L.push(row([acct(s.to), s.wallets, s.payments, s.amount]));
    if (c.otherOutflows.length) {
      L.push("", "Otras salidas USDC de la cohorte (no x402):", "");
      for (const s of c.otherOutflows) L.push(`- ${acct(s.to)}: ${s.wallets} wallet(s), ${s.payments} transferencia(s), ${s.amount} USDC`);
    }
    L.push("");
  }

  L.push("## Sondeo del servicio", "");
  const pr = r.probe;
  if (!pr) L.push("_Sin URL de servicio conocida (usar `--service <url>`)._", "");
  else {
    L.push(`- Ficha \`GET ${pr.serviceUrl}/\` → ${pr.listing.status} en ${pr.listing.latencyMs} ms: \`${JSON.stringify(pr.listing.body)}\``);
    L.push(`- 402 \`GET ${pr.challenge.url}\` → ${pr.challenge.status} en ${pr.challenge.latencyMs} ms (x402 v${pr.challenge.x402Version ?? "?"}).`, "");
    L.push(row(["scheme", "red", "asset", "payTo", "amount (raw)", "amount USDC", "maxTimeoutSeconds", "extra"]));
    L.push(row(["---", "---", "---", "---", "---:", "---:", "---:", "---"]));
    for (const a of pr.challenge.accepts) {
      L.push(row([a.scheme, a.network, short(a.asset), short(a.payTo), a.amountRaw, a.amount, a.maxTimeoutSeconds ?? "—", `\`${JSON.stringify(a.extra)}\``]));
    }
    L.push("", "Chequeo de consistencia (ficha vs 402):", "");
    for (const c of pr.checks) L.push(`- ${c.ok ? "✅" : "❌"} ${c.name}: ${c.detail}`);
    L.push("");
  }

  if (r.warnings.length) L.push("## Advertencias", "", ...r.warnings.map((w) => `- ${w}`), "");
  return L.join("\n");
}
