/**
 * Crea (o reutiliza) la wallet compradora en testnet:
 *   1. keypair -> .env (BUYER_PUBLIC / BUYER_SECRET)
 *   2. fondeo con friendbot (XLM para la reserva de la trustline)
 *   3. trustline USDC
 * El USDC se saca a mano del faucet de Circle (https://faucet.circle.com, red Stellar).
 * Idempotente: se puede correr varias veces.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { FRIENDBOT_URL, HORIZON_URL, USDC_CODE, USDC_ISSUER, txLink } from "../src/config.js";

const ENV_PATH = ".env";
const horizon = new Horizon.Server(HORIZON_URL);
const usdc = new Asset(USDC_CODE, USDC_ISSUER);

function loadOrCreateKeypair(): Keypair {
  const secret = process.env.BUYER_SECRET;
  if (secret) {
    console.log("Wallet existente en .env");
    return Keypair.fromSecret(secret);
  }
  const kp = Keypair.random();
  const base = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : readFileSync(".env.example", "utf8");
  const next = base
    .replace(/^BUYER_PUBLIC=.*$/m, `BUYER_PUBLIC=${kp.publicKey()}`)
    .replace(/^BUYER_SECRET=.*$/m, `BUYER_SECRET=${kp.secret()}`);
  writeFileSync(ENV_PATH, next);
  console.log("Wallet nueva guardada en .env");
  return kp;
}

async function loadAccount(publicKey: string) {
  try {
    return await horizon.loadAccount(publicKey);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

async function main() {
  const kp = loadOrCreateKeypair();
  const pub = kp.publicKey();
  console.log(`Comprador: ${pub}`);

  let account = await loadAccount(pub);
  if (!account) {
    console.log("Fondeando con friendbot...");
    const res = await fetch(`${FRIENDBOT_URL}?addr=${pub}`);
    if (!res.ok) throw new Error(`friendbot ${res.status}: ${await res.text()}`);
    account = await horizon.loadAccount(pub);
  }

  const hasTrustline = account.balances.some(
    (b: any) => b.asset_code === USDC_CODE && b.asset_issuer === USDC_ISSUER,
  );
  if (!hasTrustline) {
    console.log("Creando trustline USDC...");
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(60)
      .build();
    tx.sign(kp);
    const result = await horizon.submitTransaction(tx);
    console.log(`Trustline OK: ${txLink(result.hash)}`);
    account = await horizon.loadAccount(pub);
  }

  console.log("\nSaldos:");
  for (const b of account.balances as any[]) {
    const label = b.asset_type === "native" ? "XLM" : `${b.asset_code}`;
    console.log(`  ${label.padEnd(5)} ${b.balance}`);
  }

  const usdcBalance = Number(
    (account.balances as any[]).find((b) => b.asset_code === USDC_CODE && b.asset_issuer === USDC_ISSUER)?.balance ?? 0,
  );
  if (usdcBalance === 0) {
    console.log(`\nSiguiente paso (manual): https://faucet.circle.com -> red "Stellar" -> dirección ${pub}`);
  } else {
    console.log("\nListo para comprar: npm run buy-render");
  }
}

main().catch((err) => {
  console.error(err?.response?.data ?? err);
  process.exit(1);
});
