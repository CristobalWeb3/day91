import { RENDERGATE_PAYTO, USDC_SAC } from "../config.js";

// Direcciones identificadas a mano (ver CLAUDE.md). Lo que no está aquí se reporta como "sin identificar".
export const LABELS: Record<string, string> = {
  [RENDERGATE_PAYTO]: "RenderGate (payTo)",
  GCHEI4PQEFJOA27MNZRPQNLGURS6KASW76X5UZCUZIXCOJLKXYCXOR2W: "payTo de ejemplo de los tests oficiales x402/Stellar",
  GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K: "facilitator x402 (x402.org)",
  CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP: "CCTP TokenMessengerMinter (testnet)",
  GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR: "friendbot (testnet)",
  [USDC_SAC]: "USDC SAC",
};

export const FRIENDBOT = "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";

// Dominios CCTP de Circle (en testnet apuntan a las redes de prueba correspondientes).
export const CCTP_DOMAINS: Record<number, string> = {
  0: "Ethereum",
  1: "Avalanche",
  2: "OP",
  3: "Arbitrum",
  5: "Solana",
  6: "Base",
  7: "Polygon PoS",
  10: "Unichain",
  11: "Linea",
};

export const label = (address: string) => LABELS[address] ?? null;
