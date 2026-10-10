import { scValToNative, xdr } from "@stellar/stellar-sdk";
import { USDC_CODE, USDC_ISSUER } from "../config.js";
import { toStroops } from "./amounts.js";

/** Un movimiento de fondos normalizado desde un registro de /payments. */
export interface Transfer {
  at: string;
  tx: string;
  from: string;
  to: string;
  amount: bigint;
  usdc: boolean;
  /** Cuenta que envió la transacción. Si no es `from`, la pagó un tercero (p. ej. un facilitator x402). */
  submitter: string;
  kind: "sac_transfer" | "payment" | "create_account";
  contract?: string;
  fn?: string;
  /** Argumentos decodificados de la invocación (solo invoke_host_function). */
  args?: unknown[];
  /** Hubo burn del mismo asset en la misma invocación (CCTP). */
  burned?: bigint;
}

function decodeParam(p: { value: string }): unknown {
  try {
    const v = scValToNative(xdr.ScVal.fromXDR(p.value, "base64"));
    if (typeof v === "bigint") return v.toString();
    if (v instanceof Uint8Array) return Buffer.from(v).toString("hex");
    return v;
  } catch {
    return null;
  }
}

const isUsdc = (code?: string, issuer?: string) => code === USDC_CODE && issuer === USDC_ISSUER;

export function normalize(records: any[]): Transfer[] {
  const out: Transfer[] = [];
  for (const r of records) {
    if (r.transaction_successful === false) continue;
    const base = { at: r.created_at as string, tx: r.transaction_hash as string, submitter: r.source_account as string };
    if (r.type === "create_account") {
      out.push({ ...base, kind: "create_account", from: r.funder, to: r.account, amount: toStroops(r.starting_balance), usdc: false });
    } else if (r.type === "payment") {
      out.push({ ...base, kind: "payment", from: r.from, to: r.to, amount: toStroops(r.amount), usdc: isUsdc(r.asset_code, r.asset_issuer) });
    } else if (r.type === "invoke_host_function") {
      const args = (r.parameters ?? []).map(decodeParam);
      const changes = r.asset_balance_changes ?? [];
      const burned = changes.filter((c: any) => c.type === "burn").reduce((a: bigint, c: any) => a + toStroops(c.amount), 0n);
      for (const c of changes) {
        if (c.type !== "transfer") continue;
        out.push({
          ...base,
          kind: "sac_transfer",
          from: c.from,
          to: c.to,
          amount: toStroops(c.amount),
          usdc: isUsdc(c.asset_code, c.asset_issuer),
          contract: args[0] as string,
          fn: args[1] as string,
          args: args.slice(2),
          burned: burned || undefined,
        });
      }
    }
  }
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
