# Day91 — contexto del proyecto

Este archivo es la fuente de verdad del proyecto. Léelo completo antes de escribir código.

## Qué es Day91

Agente de go-to-market para servicios construidos en hackathons de Stellar que quedaron sin clientes.
Tesis: el 92% de los proyectos de hackathons de Stellar no tiene actividad 90 días después del evento.
No les falta código; les falta mercado. Day91 lee el ledger, diagnostica por qué un servicio x402 no vende,
identifica a sus compradores probables y activa demanda medible on-chain.

Framing obligatorio: "capa de activación de mercado para la oferta dormida del ecosistema".
NO usar en el pitch ni en el README las palabras: marketplace, registry, discovery, "plataforma de agentes".
(Stellar Hacks: Agents tuvo 15+ marketplaces x402 y ~10 registries; los jueces están saturados de eso.)

## Entrega (hackathon "Find Your Way", Stellar Passport)

- Cierre: **lunes 12 de octubre de 2026, 23:59 hora de Chile**.
- Formulario: nombre, descripción, track (General), email, **repo open source**, **video pitch ≤ 3 min**, otros links.
- Criterios: ejecución técnica, uso significativo de Stellar, originalidad, impacto, UX, calidad de presentación.
- No hay demo en vivo: el video es la demo. "Otros links" = página del funnel en GitHub Pages.

## Restricciones

- Una persona, ~10 horas de trabajo en total. Priorizar siempre lo que se ve en el video.
- Solo **testnet**. Nunca mainnet.
- **Sin API key de LLM.** Los pasos de lenguaje (ICP, listing corregido, reporte) van como salida guardada en
  `reasoning/` y el README lo declara. Código preparado para usar `ANTHROPIC_API_KEY` si existe; si no, usa la salida guardada.
- RenderGate es el servicio en vivo de otra persona: tráfico liviano, máximo unas decenas de llamadas pagadas en total.
- Secretos solo en `.env` (en `.gitignore`). Nunca commitear claves.
- Licencia MIT en el repo.

## Servicio objetivo: RenderGate

- Repo: https://github.com/tantk/rendergate (MIT declarada en package.json). 3.º lugar en Stellar Hacks: Agents.
- Endpoint vivo: https://tantk-rendergate.hf.space — `GET /` devuelve ficha JSON; `GET /render?url=<encoded>` cobra vía x402.
- Red: `stellar:testnet`. Dirección de cobro (payTo): `GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO`
- **Precio consistente (corregido 10-oct-2026):** la ficha (`GET /`), el README y el paywall 402 cobran lo mismo:
  0.001 USDC (el 402 pide `amount: "10000"` en unidades atómicas de 7 decimales). La supuesta discrepancia
  0.001 vs 0.01 venía de leer el monto con 6 decimales (convención EVM). NO usar ese hallazgo en ningún lado.
- **El precio no es el problema:** el único comprador externo gastó 40x más en GDXKBOCC, que cobra 10x más
  por llamada. El diagnóstico es arranque en frío: 97,5% de los pagos son del autor y hay 1 comprador
  independiente en 180 días. (No llamar "competidor" a GDXKBOCC mientras no esté identificado.)

## Línea base verificada (Horizon testnet, 10-oct-2026)

- Cuenta payTo creada 2026-04-13 04:11 UTC (friendbot). Nunca firmó transacciones después del 13-abr salvo 6 pagos salientes.
- **81 pagos recibidos**, todos de 0.001 USDC. **79 (97,5%) el 13-abr-2026**, todos desde `GDMJ5B3LJJHF4TTEHIEMG5UW7XNGRZJCHEFF3YXOHR5APHVCAW5OIQR3` (harness del autor).
- 6 pagos salientes de prueba de la cuenta payTo hacia GDMJ… Saldo actual 0.075 USDC (cuadra exacto).
- **Desde la hackathon: 2 pagos en 180 días**, ambos 2026-09-20 desde `GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6`.

## Perfil del único comprador externo (GBUQ25LH…)

Vida completa el 2026-09-20, 00:19–07:44 UTC:
- Creada por el operador `GBICCLC22HBCJTUBWHVDZ4KMXT4HJQZRQHFJPO7KW27PCOW4JEAFJU6V` con reservas patrocinadas, saldo inicial 0.
- Fondeada con 2 USDC desde el contrato `CCAML62QF5D6ZV2CNIFBSKJK7HMTX4K473P7NGNNRAWVVLRNTOCFVSGI`.
- Pagó 3 servicios x402: 8 llamadas a `GDXKBOCCIUWIJ4O355O3YUSB46G5TGCOJ2LSADU7KB67EBT23KMAGWQU` (0.01 c/u, no identificado),
  2 a `GCHEI4PQEFJOA27MNZRPQNLGURS6KASW76X5UZCUZIXCOJLKXYCXOR2W` (0.01; es el payTo de ejemplo de los tests oficiales de x402/Stellar),
  2 a RenderGate (0.001).
- `deposit_for_burn` de 1 USDC en el contrato CCTP `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP`, dominio destino 6 (= Base).
- Lectura honesta: probablemente un desarrollador o su agente evaluando el ecosistema x402. Probó RenderGate 2 veces y no volvió;
  gastó 40x más en GDXKBOCC.
- Operador GBICCLC…: **28 `create_account`** entre 2026-09-19 23:56 y 2026-09-24 16:08 UTC → alta de wallets en serie
  (plataforma o harness). Cohorte analizable.

## Datos de ecosistema (Raven / Scout, 10-oct-2026)

- 10 hackathons de Stellar, ~962 submissions: ~7,6% con commits 90+ días después del evento.
- Stellar Hacks: Agents: 248 submissions; 74% sin commits 90+ días, 17% repo inexistente, ~9% vivo.

## Hechos técnicos verificados

- Horizon `GET /accounts/{id}/payments` devuelve los pagos x402 (transferencias SAC) como `invoke_host_function`
  con `asset_balance_changes[]` = `{type, from, to, amount}`. **Historial completo, sin límite de 7 días** (no usar RPC getEvents).
- USDC testnet: issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, contrato SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- Facilitator que envió los pagos de RenderGate: `GC6CSXBV4C6RL3HEDTW57KXYXSSXKAWKGYDEOSATXM3XNKXSR2VRYN3K`.
- Los montos del 402 (`amount`) vienen en unidades atómicas del SAC: USDC en Stellar tiene **7 decimales**
  (10000 = 0.001 USDC). Horizon, en cambio, devuelve montos ya decimales ("0.0010000"). Nunca convertir con 6.
- Paquetes verificados en npm: `@x402/fetch`, `@x402/core`, `@x402/stellar` versión **2.28.0**. Cliente:

```ts
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const signer = createEd25519Signer(process.env.BUYER_SECRET!, "stellar:testnet");
const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);
```

- Wallet compradora: generar keypair, friendbot, trustline USDC, USDC del faucet de Circle (https://faucet.circle.com, red Stellar;
  paso manual en el navegador). El comprador no necesita XLM para fees: el facilitator las patrocina.

## Plan de build (10 h)

1. **(2 h) Riesgo #1:** repo + `scripts/setup-buyer.ts` (keypair, friendbot, trustline) + `scripts/buy-render.ts`:
   un render pagado de punta a punta contra RenderGate. Criterio: respuesta 200 con contenido y la transacción visible
   en `/payments` del payTo. Si el cliente estándar falla contra el 402 de RenderGate, documentar el error antes de improvisar.
2. **(3 h) `day91 scan <payTo>`** (CLI, TypeScript): línea base (pagos, pagadores únicos, % del autor, último pago, días sin ventas),
   perfil de compradores externos (otros servicios que pagan, gasto por servicio, bridging CCTP), cohorte por operador
   (las 28 wallets de GBICCLC…), y sondeo del servicio (ficha y 402: precio, red, asset y payTo, con montos convertidos a 7 decimales;
   se reporta como chequeo de consistencia, no como hallazgo). Salida JSON + Markdown en `data/`.
3. **(1,5 h) Activación:** 3 agentes compradores con políticas distintas usando el cliente x402 estándar sin modificar:
   A necesita renderizar un SPA y paga; B exige evidencia de demanda independiente: compra solo si el payTo tiene ≥ 3 pagadores
   distintos en los últimos 90 días, excluyendo pagadores vinculados (los que recibieron fondos del propio payTo, p. ej. GDMJ…)
   y las wallets de Day91 listadas en `data/day91-wallets.json`; RenderGate tiene 1 → B no compra;
   C tiene una tarea que no requiere renderizar y no compra. Pagos reales en testnet.
4. **(1,5 h) Funnel en GitHub Pages** (`docs/index.html`, sin build): lee Horizon desde el navegador y muestra antes/después,
   con enlace a cada transacción en stellar.expert.
5. **(2 h)** README, reporte GTM para RenderGate (como issue de GitHub, publicado a mano), texto de la entrega, video.

## Fuera de alcance (roadmap en el README)

Contrato Soroban de cashback, comprador en Base, directorio completo payTo → servicio, Hubble/BigQuery.

## Estructura sugerida

```
day91/
  CLAUDE.md  README.md  LICENSE  .env.example  .gitignore  package.json  tsconfig.json
  src/scan/{baseline,profile,cohort,probe,report}.ts   src/buyers/{agent-a,agent-b,agent-c}.ts
  scripts/{setup-buyer,buy-render}.ts   reasoning/rendergate-gtm.md   data/   docs/index.html
```
