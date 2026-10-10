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

export function txLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} en .env (corre primero: npm run setup-buyer)`);
  return value;
}
