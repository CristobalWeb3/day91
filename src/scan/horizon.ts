import { HORIZON_URL } from "../config.js";

const PAGE = 200;
export const warnings: string[] = [];

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Horizon ${res.status} ${url}: ${await res.text()}`);
  }
  throw new Error(`Horizon sin respuesta tras reintentos: ${url}`);
}

/** Recorre todas las páginas en orden ascendente. Historial completo (Horizon no tiene límite de 7 días). */
export async function fetchAll(path: string, maxPages = 50): Promise<any[]> {
  let url = `${HORIZON_URL}${path}${path.includes("?") ? "&" : "?"}limit=${PAGE}&order=asc`;
  const out: any[] = [];
  for (let page = 0; page < maxPages; page++) {
    const body = await getJson(url);
    if (!body) return out;
    const records = body._embedded.records;
    out.push(...records);
    if (records.length < PAGE) return out;
    url = body._links.next.href;
  }
  warnings.push(`${path}: truncado en ${maxPages * PAGE} registros`);
  return out;
}

export const payments = (account: string) => fetchAll(`/accounts/${account}/payments`);
export const operations = (account: string, maxPages?: number) => fetchAll(`/accounts/${account}/operations`, maxPages);
export const transactionsOf = (account: string) => fetchAll(`/accounts/${account}/transactions`);
export const account = (id: string) => getJson(`${HORIZON_URL}/accounts/${id}`);
