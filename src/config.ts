import "dotenv/config";

// Solo testnet. Day91 nunca toca mainnet.
export const NETWORK = "stellar:testnet" as const;
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

export const USDC_CODE = "USDC";
export const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const USDC_SAC = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const USDC_DECIMALS = 7;

export const RENDERGATE_URL = process.env.RENDERGATE_URL ?? "https://tantk-rendergate.hf.space";
export const RENDERGATE_PAYTO =
  process.env.RENDERGATE_PAYTO ?? "GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO";

/**
 * Facilitators x402 conocidos en testnet. Un facilitator envía la transacción de pago en nombre del comprador,
 * así que su /payments es el libro de ventas de todos los servicios que lo usan.
 * Cómo encontrar otros: en los pagos de cualquier comprador, `source_account` ≠ comprador es el facilitator.
 */
export const FACILITATORS: { address: string; label: string }[] = [
  { address: "GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K", label: "x402.org facilitator" },
  { address: "GCGKCIJE7S22OLQUWURUIL7OFMTVJY77RDZIO6ZJADVFLRUMRW6MNDYL", label: "facilitator (twin A, 2025-12-22)" },
  { address: "GA6QLQOQFN36EV6NRIZAGMNA42MFG2XGCX23KYF6VE5DTBXPPS5RO67I", label: "facilitator (twin B, 2025-12-22)" },
];

export function txLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env (corre primero: npm run setup-buyer)`);
  return value;
}
