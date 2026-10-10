import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const PROBE_402_PATH = "data/probe-402.json";
export const PAID_CALLS_PATH = "data/paid-calls.jsonl";
export const FAILED_CALLS_PATH = "data/failed-calls.jsonl";
export const WALLETS_PATH = "data/day91-wallets.json";

export interface Day91Wallet {
  publicKey: string;
  role: string;
  createdAt: string;
  fundingTx?: string;
  trustlineTx?: string;
}

export interface PaidCall {
  timestamp: string;
  agent: string;
  buyer: string;
  payTo: string;
  resource: string;
  httpStatus: number;
  txHash: string;
  hashSource: "payment-response" | "horizon-lookup";
  amount: string;
  asset: string;
}

export interface FailedCall {
  timestamp: string;
  agent: string;
  buyer: string;
  payTo: string;
  resource: string;
  httpStatus: number;
  errorReason: string;
  totalMs: number;
  requests: { status: number; ms: number; paid: boolean }[];
}

function ensureDir(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

export function writeJson(path: string, data: unknown) {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function appendPaidCall(call: PaidCall) {
  ensureDir(PAID_CALLS_PATH);
  appendFileSync(PAID_CALLS_PATH, JSON.stringify(call) + "\n");
}

export function appendFailedCall(call: FailedCall) {
  ensureDir(FAILED_CALLS_PATH);
  appendFileSync(FAILED_CALLS_PATH, JSON.stringify(call) + "\n");
}

export function readWallets(): Day91Wallet[] {
  return existsSync(WALLETS_PATH) ? JSON.parse(readFileSync(WALLETS_PATH, "utf8")) : [];
}

/** Agrega o actualiza la wallet (por publicKey). Nunca guarda secretos. */
export function upsertWallet(wallet: Day91Wallet) {
  const wallets = readWallets();
  const i = wallets.findIndex((w) => w.publicKey === wallet.publicKey);
  if (i >= 0) wallets[i] = { ...wallets[i], ...wallet, createdAt: wallets[i].createdAt };
  else wallets.push(wallet);
  writeJson(WALLETS_PATH, wallets);
}
