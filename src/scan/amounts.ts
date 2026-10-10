// Montos en stroops (BigInt) para sumar sin error de punto flotante; siempre se muestran con 7 decimales.
export const DECIMALS = 7;
const SCALE = 10n ** BigInt(DECIMALS);

export function toStroops(amount: string): bigint {
  const [int, frac = ""] = amount.split(".");
  return BigInt(int) * SCALE + BigInt((frac + "0000000").slice(0, DECIMALS));
}

export function fmt(stroops: bigint): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  return `${neg ? "-" : ""}${abs / SCALE}.${(abs % SCALE).toString().padStart(DECIMALS, "0")}`;
}

export function sum(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}
