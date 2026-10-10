import { appendFileSync, mkdirSync } from "node:fs";
import { RENDERGATE_URL } from "../config.js";

export const DECISIONS_PATH = "data/decisions.jsonl";

/** Umbral de texto útil (chars sin etiquetas, scripts ni estilos) para considerar que un GET simple alcanza. */
export const MIN_USEFUL_CHARS = 500;

export interface Decision {
  timestamp: string;
  agent: string;
  task: string;
  target: string;
  decision: "pay" | "skip";
  reason: string;
  /** Números que miró el agente para decidir. */
  evidence: Record<string, unknown>;
  tx: string | null;
  amount: string | null;
}

export function appendDecision(d: Decision) {
  mkdirSync("data", { recursive: true });
  appendFileSync(DECISIONS_PATH, JSON.stringify(d) + "\n");
  console.log(`\nDecisión registrada en ${DECISIONS_PATH}: ${d.agent} → ${d.decision} (${d.reason})`);
}

export function usefulText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PlainGet {
  status: number;
  ms: number;
  bytes: number;
  usefulChars: number;
  sample: string;
}

/** GET sin pago. Mide cuánto texto útil trae la respuesta tal cual. */
export async function plainGet(url: string): Promise<PlainGet> {
  const t0 = Date.now();
  const res = await fetch(url, { headers: { "user-agent": "day91-agent/0.1" } });
  const body = await res.text();
  const text = usefulText(body);
  return { status: res.status, ms: Date.now() - t0, bytes: body.length, usefulChars: text.length, sample: text.slice(0, 160) };
}

export const renderEndpoint = (url: string) => `${RENDERGATE_URL}/render?url=${encodeURIComponent(url)}`;
