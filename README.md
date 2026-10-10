# Day91

**A market activation layer for the ecosystem's dormant supply.**

Most services built at Stellar hackathons work on day one and have no customers on day 91. Day91 reads a service's payment history
straight from the ledger, diagnoses why it is not selling, sends real buyer agents at it with different purchasing policies, and measures
the result on-chain, before and after.

Built for the *Find Your Way* hackathon (Stellar Passport, October 2026). Everything runs on **Stellar testnet** only.

- Funnel (live from Horizon): **https://cristobalweb3.github.io/day91/**
- Target service: [RenderGate](https://github.com/tantk/rendergate), a pay-per-render headless browser behind x402 (3rd place, Stellar Hacks: Agents)
- Report for the RenderGate author: [`reasoning/rendergate-gtm.md`](reasoning/rendergate-gtm.md)

## The problem

Across 10 Stellar hackathons and ~962 submissions, only about **7.6%** of projects show any commits 90 or more days after the event. For
Stellar Hacks: Agents specifically (248 submissions): **74%** have no commits after 90 days, **17%** no longer have a repository, and roughly
**9%** are alive (Raven / Scout data, 2026-10-10).

These projects do not lack code. RenderGate, for example, renders and settles every time you pay it. What they lack is a market: the first
independent buyers, and a way for later buyers to see that those first ones exist. Day91 works on that gap.

## What it does, in four steps

1. **Scan.** `day91 scan <payTo>` pulls the complete payment history of a service's payout address from Horizon (no 7-day limit, no RPC),
   classifies every payer as *linked* (received funds from the payTo itself), *day91* (our own wallets) or *external*, and profiles each
   external buyer: which other x402 services it pays, how much, and whether it bridges out through CCTP. It then follows the operator that
   created each buyer and analyses that whole cohort. It also probes the service's listing and its 402 challenge for consistency.
2. **Diagnose.** The scan output (JSON + Markdown in `data/`) becomes a short report for the author, written in plain language with every number
   linked to its evidence. The language step is saved in `reasoning/`; see *Limitations*.
3. **Activate.** Three buyer agents, all using the standard `@x402/fetch` + `@x402/stellar` client without modification, each with a different
   policy. Agent A pays only if a plain GET of the page returns too little text. Agent B buys only if the ledger shows at least three independent
   payers in the last 90 days. Agent C has a task that never needs a render. Each agent writes its decision, the numbers it looked at and the
   transaction hash (if any) to `data/decisions.jsonl`.
4. **Measure.** A static page reads Horizon live from the browser and shows payments before and after the activation cutoff by payer class, the
   payments Day91 made (each linked to stellar.expert), and the agents' decisions.

## Results against RenderGate (testnet, 2026-10-10)

| | payments | payers | USDC |
|---|---:|---:|---:|
| Before the cutoff: linked (author's harness) | 79 | 1 | 0.0790000 |
| Before the cutoff: external | 2 | 1 | 0.0020000 |
| After the cutoff: day91 | 3 | 1 | 0.0030000 |

- **97.5%** of historical payments came from a wallet created 5 seconds after the payTo by the same friendbot and later refunded by it.
  One independent buyer in 180 days; 20 days without an external sale at the cutoff.
- That buyer spent 0.102 USDC on x402 calls that day and only **2%** of it on RenderGate, so price is not the blocker.
- Agent A paid twice: `app.soroswap.finance` (plain GET 176 useful chars → render 170, charged without gain) and
  `testnet.stellarchain.io/accounts/<payTo>` (73 → 693). Agent B found 1 independent payer and did not buy. Agent C never needed to pay.
- The operator that created the one external buyer onboarded 40 wallets in five days; 5 of them pay for x402 services, 1 paid RenderGate.
- One hypothesis under measurement: the first paid call returned 402 after 68 s without charging, which is consistent with settlement after
  a slow render exceeding the 60-second authorization window. Seen once.

Transactions: [d8453fc3…](https://stellar.expert/explorer/testnet/tx/d8453fc3e3ecf8234606fdb06621629996b98f304fceb9dd5a9b0d9e239945da)
(cutoff), [69603878…](https://stellar.expert/explorer/testnet/tx/69603878693153fca79d0ffcf46356370087dcf9ee3dfb5f9c488413bc85c886),
[7132753a…](https://stellar.expert/explorer/testnet/tx/7132753a567a78e7b832e4c0e88c44b0b40f6d4e6a0c333922da5f526a318255).

## How to run

Requires Node 20+. Testnet only.

```bash
npm install
cp .env.example .env
npm run setup-buyer          # keypair → .env, friendbot, USDC trustline; registers the wallet in data/day91-wallets.json
# get testnet USDC for BUYER_PUBLIC at https://faucet.circle.com (network: Stellar), then:
npm run buy-render           # one paid render against RenderGate, verified in Horizon
npm run day91 -- scan GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO   # → data/scan-<payTo>.{json,md}
npm run agent-a              # pays only if a plain GET is not enough (real payment)
npm run agent-b              # buys only with ≥ 3 independent payers in 90 days
npm run agent-c              # static page, never pays
npm run funnel-data          # → docs/data.json for the funnel page
npm run typecheck
```

Set `DAY91_DRY_RUN=1` to let agents decide and print without writing to `data/decisions.jsonl`. `day91 scan` accepts
`--service <url>` for the listing probe and `--cutoff <ISO>` to override the activation cutoff in `data/activation.json`.

Everything in `data/` is committed as evidence: raw 402 challenge, paid and failed calls, decisions, wallets (public keys only), scan output.

## Limitations, honestly

- **Testnet only.** No mainnet, no real money. The service is someone else's live deployment, so traffic was kept to a handful of paid calls.
- **The three payments after the cutoff are Day91's own** and are labelled `day91` everywhere. We did not bring RenderGate an external customer;
  we measured how buyer agents with different policies react to it, and what they leave on-chain.
- **"Linked" includes refunds.** A payer is *linked* if it ever received funds from the payTo, refunds included. That is the conservative reading
  and it correctly tags the author's harness, but it would also tag a real customer who got a failed render refunded. The report shows the
  evidence (transaction, amount, memo) for every link so a reader can judge.
- **No LLM API key at runtime.** The language steps (the report in `reasoning/`) were written with an LLM from the scan output and saved; the
  code is prepared to use `ANTHROPIC_API_KEY` when present, and falls back to the saved output when it is not.
- **Two of the four agent decisions were recorded before some fields existed** (`renderGainChars`, `renderSample`). The funnel derives what it
  can from the numbers that were saved; the log itself is append-only and was never rewritten, except one `reason` string corrected by hand
  right after the first run, which is marked with a `note` field.
- The cold-start settlement hypothesis is based on a single failed call.

## Roadmap

- A Soroban contract that pays cashback to the first N independent buyers of a dormant service, funded by the service.
- A buyer on Base: the one external buyer bridged 1 USDC to `0xc97c1ca97df407f7ca9039c5d392e8868f234b4f` via CCTP; following it there is the next step.
- A fuller payTo → service directory built from 402 challenges, and Hubble/BigQuery for ecosystem-wide scans.
- Run the scan against every live x402 service from Stellar Hacks: Agents and publish the aggregate.

## License

MIT. See [LICENSE](LICENSE).
