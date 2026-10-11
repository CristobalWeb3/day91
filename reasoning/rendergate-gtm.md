# RenderGate: what the ledger says about demand, and five cheap things to try

> **Disclosure.** This report was drafted by an LLM (Claude) from the output of `day91 scan` and the activation runs in the
> [Day91](https://github.com/CristobalWeb3/day91) repository, then reviewed by a human before posting. Every number below
> comes from a file in `data/` or from a Stellar testnet transaction, and each finding links to its evidence. Nothing here
> is an opinion about the code: RenderGate works, it rendered and settled every time we paid it. This is about who pays.

Hi, and congrats on the 3rd place at Stellar Hacks: Agents. We used RenderGate as the first target for Day91, a small tool that
reads a service's payTo history on Horizon, works out why it isn't selling, and sends a few real buyer agents at it. We paid for
four renders (0.004 USDC total, testnet) and read everything else from the public ledger. Here is what we found. Take what is
useful, ignore the rest.

Addresses used below: payTo `GAUJ54…25GO`, your harness wallet `GDMJ5B…IQR3`, the one independent buyer `GBUQ25…M3L6`,
the operator that created that buyer `GBICCL…JU6V`. All links go to stellar.expert (testnet) or to the evidence files in the repo.

## 1. Cold start: 97.5% of all payments came from your own harness

- Before Day91's first payment (cutoff `2026-10-10T20:18:37Z`) the payTo had received **81 payments** of 0.001 USDC.
- **79 of them (97.5%)** arrived on **2026-04-13**, all from `GDMJ5B…IQR3`. That account was created by friendbot **5 seconds after the payTo**
  (04:11:30 vs 04:11:35 UTC) and is the only account that ever received funds back from the payTo: six transfers, all with memos
  `refund:test` / `refund:blocked_page`. We therefore class it as *linked* (same operator), not as a buyer.
- In the **180 days** before the cutoff there was **one** independent payer, who made **2** payments, both on 2026-09-20. At the cutoff the
  service had gone **20 days** without an external sale.

Evidence: [scan report](https://github.com/CristobalWeb3/day91/blob/main/data/scan-GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO.md)
(sections *Línea base* and *Evidencia de vínculo*) ·
[payTo on stellar.expert](https://stellar.expert/explorer/testnet/account/GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO) ·
[GDMJ5B…IQR3](https://stellar.expert/explorer/testnet/account/GDMJ5B3LJJHF4TTEHIEMG5UW7XNGRZJCHEFF3YXOHR5APHVCAW5OIQR3).

## 2. Price is not the problem

The one independent buyer, `GBUQ25…M3L6`, lived for about seven hours on 2026-09-20 and spent **0.102 USDC** on x402 calls:

| payee | calls | unit price | total |
|---|---:|---:|---:|
| `GDXKBO…GWQU` (unidentified) | 8 | 0.01 | 0.080 |
| `GCHEI4…OR2W` (the sample payTo from the official x402/Stellar tests) | 2 | 0.01 | 0.020 |
| **RenderGate** | 2 | 0.001 | **0.002 (2.0%)** |

It paid 10× your price, eight times, to another service. It tried RenderGate twice and did not come back. Afterwards it bridged 1 USDC
to Base through CCTP (`deposit_for_burn`, destination domain 6). The honest reading: a developer or an agent evaluating the x402
ecosystem, with RenderGate as one stop among several. Lowering the price would not have changed that.

One more detail: that bridge never completed. Circle issued the attestation for the burn (CCTP v2, source domain 27 → 6, mint recipient
`0xc97c…4b4f`, 1 USDC), but nothing was ever minted on Base Sepolia: the [recipient address is empty on Blockscout](https://base-sepolia.blockscout.com/address/0xc97c1ca97df407f7ca9039c5d392e8868f234b4f)
(no transactions, no token transfers). As far as the ledgers show, that USDC is still parked in the bridge.

Evidence: [scan report, *Compradores externos*](https://github.com/CristobalWeb3/day91/blob/main/data/scan-GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO.md) ·
[GBUQ25…M3L6](https://stellar.expert/explorer/testnet/account/GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6) ·
[CCTP tx f37b4310…](https://stellar.expert/explorer/testnet/tx/f37b4310bd74fd9ee39ccda806ce982919020c55100bd76b80050dfbd1289df0).

## 3. A paid render that did not beat a plain GET (and was not refunded)

Our agent A pays only when a no-JS fetch returns fewer than 500 characters of useful text. For `https://app.soroswap.finance/` the plain
GET gave **176** characters; the paid render returned HTTP 200 with **170** (−6). The page is a swap form behind a wallet connect, so there
was nothing for the browser to reveal. RenderGate charged 0.001 USDC and, correctly by its own rules, did not refund: the content was over
100 characters and matched no block pattern.

For contrast, the same agent on `https://testnet.stellarchain.io/accounts/<payTo>` got **73** characters without JS and **693** with the render
(+620), including the address, the XLM balance and the 0.078 USDC balance. We confirmed locally with Playwright that the page really exposes
689 characters, so the render was faithful.

Suggestion: you already have the refund path and memo. Compare the extracted text against a plain fetch of the same URL (or against a
threshold on `content.length − plainLength`) and refund with `refund:no_gain` when the render adds nothing. A buyer agent that sees that
behaviour on-chain can trust the service with pages it is unsure about, which is exactly the case where it would pay.

Evidence: [decisions.jsonl](https://github.com/CristobalWeb3/day91/blob/main/data/decisions.jsonl) ·
[tx 69603878… (Soroswap)](https://stellar.expert/explorer/testnet/tx/69603878693153fca79d0ffcf46356370087dcf9ee3dfb5f9c488413bc85c886) ·
[tx 7132753a… (stellarchain)](https://stellar.expert/explorer/testnet/tx/7132753a567a78e7b832e4c0e88c44b0b40f6d4e6a0c333922da5f526a318255) ·
[local reference render](https://github.com/CristobalWeb3/day91/blob/main/data/stellarchain-local-render.txt).

## 4. Hypothesis, one occurrence: a very cold start can push settlement outside the 60-second window

Our very first paid call, made when the service had gone **about 20 days without a payment**, returned **402 after 68 seconds** with
`invalid_exact_stellar_payload_simulation_failed` and no charge. The retry a few minutes later took 6.8 s end to end; later calls took 13.3 s and
8.8 s. The 402 advertises `maxTimeoutSeconds: 60`, and the client signs an authorization that expires after roughly that many ledgers. As we read
`server.js`, the handler renders first and the payment is settled when the response goes out, so a render that takes longer than the window would
make the facilitator's simulation fail after the work was done.

We then tried to reproduce it deliberately: one call after **about 16.5 hours idle** worked, HTTP 200 in 10.7 s (the paid request itself took 7.98 s).
So a normal overnight idle is fine; whatever happened the first time needed a longer sleep, which points at the Space itself being asleep rather
than at the browser. **One occurrence, not reproduced**: please treat it as a hypothesis. If it is real, the cost is a buyer's first impression after
weeks without traffic, which for a service in this state is most of the first impressions.

Evidence: [failed-calls.jsonl](https://github.com/CristobalWeb3/day91/blob/main/data/failed-calls.jsonl) ·
[probe-402.json](https://github.com/CristobalWeb3/day91/blob/main/data/probe-402.json) (`maxTimeoutSeconds`) ·
[paid-calls.jsonl](https://github.com/CristobalWeb3/day91/blob/main/data/paid-calls.jsonl) ·
[tx 2d51114c… (after 16.5 h idle)](https://stellar.expert/explorer/testnet/tx/2d51114c066e26cb513d09be21c236906fc0aa18d30cfb0e2faa1fe14b800eb4).

## 5. Where the probable buyers are

The independent buyer was created by operator `GBICCL…JU6V`. That operator created **40 accounts** between 2026-09-19 20:20 and 2026-09-24 16:08 UTC,
in pairs, all with sponsored reserves, which looks like a test harness or a wallet platform onboarding users. Of those 40 wallets:

- **13** were funded with USDC;
- **5** paid at least one x402 service (payments sent by a facilitator on the wallet's behalf);
- **1** paid RenderGate;
- **3** bridged USDC out through CCTP.

The x402 payee used by most of them is `GAU2ME…BTVU` (3 wallets, 14 calls at 0.01 USDC), followed by `GDXKBO…GWQU` (2 wallets, 9 calls). We have not
identified either. Whoever runs that operator is producing wallets that actually pay for x402 calls, which is rare on testnet right now.

Evidence: [scan report, *Cohortes por operador*](https://github.com/CristobalWeb3/day91/blob/main/data/scan-GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO.md) ·
[GBICCL…JU6V](https://stellar.expert/explorer/testnet/account/GBICCLC22HBCJTUBWHVDZ4KMXT4HJQZRQHFJPO7KW27PCOW4JEAFJU6V) ·
[GAU2ME…BTVU](https://stellar.expert/explorer/testnet/account/GAU2MEYD2CWV46OM7W3H7I7BMN34WEXN54EBJ3VNZLE6XJ2EY3GIBTVU).

## 6. Why a cautious agent does not buy today

Agent B has one rule: buy only if the payTo shows **≥ 3 independent payers in the last 90 days**, excluding wallets linked to the service and
Day91's own wallets. Reading the live ledger it found **1** (`GBUQ25…M3L6`) and did not buy. Any buyer with a similar policy will reach the same
answer until two more unrelated wallets pay. The first independent payments are therefore worth more than their face value.

Evidence: [decisions.jsonl](https://github.com/CristobalWeb3/day91/blob/main/data/decisions.jsonl) (`agent-b`, `externalPayers90d: 1`).

## 7. The market, and who is buying in it

We read the last 90 days of the three x402 facilitators we know on testnet (a facilitator submits the payment on the buyer's behalf, so its
history is the sales ledger of every service that uses it). After dropping our own four payments:

- **2,296 x402 payments, 224 buyer wallets, 113 services, 804.76 USDC** in total. Removing likely test traffic (12 services whose average
  price is ≤ 0.0001 USDC, among them a block of seven that each took exactly 60 payments from 11 wallets at 0.00001 USDC between 2026-09-28
  and 10-09): **1,851 payments, 129 buyer wallets, 101 services.** 35 of those 129 wallets paid something in the last 14 days; only 4 used more
  than one facilitator.
- **RenderGate: 2 of 2,296 payments (0.09%) and 1 of 224 buyers (0.45%).** Outside likely test traffic: 2 of 1,851 payments (0.11%) and
  1 of 129 buyers (0.78%).
- The market is lumpy. `GDABGS…6S2P` has the most buyers (15 wallets, 37 payments at ~0.30 USDC). `CAT76P…KSKL` is a contract taking 6 payments
  averaging 35.8 USDC.
- **Nine wallets paid two or more distinct services** in the window. These are the buyers that already shop around, which is the behaviour
  a new service needs. Ordered by last activity:

| # | buyer | services | payments | USDC | last active | tried RenderGate |
|---:|---|---:|---:|---:|---|---|
| 1 | [CDFLOE…DMQN](https://stellar.expert/explorer/testnet/contract/CDFLOE4HGKNV3JJQGIS3Y7BT2K2DTT4SBF2NKARMBVB4RBJZ5YJLDMQN) (contract) | 4 | 4 | 4.0000004 | 2026-10-10 | no |
| 2 | [GAVPQ7…BDB4](https://stellar.expert/explorer/testnet/account/GAVPQ7VRQK5TK5ZJCFPYZHWOOSSDYVDPAH7LW4ME4PC7VLMZ4JUGBDB4) | 2 | 3 | 0.0030000 | 2026-09-27 | no |
| 3 | [GAURYW…UTEZ](https://stellar.expert/explorer/testnet/account/GAURYWKSSNA7IWU4S6VYHIU6TFOEUGO72BULFXNBKJ2IGXHR22ANUTEZ) | 3 | 48 | 1.5900000 | 2026-09-25 | no |
| 4 | [GBUQ25…M3L6](https://stellar.expert/explorer/testnet/account/GBUQ25LH4BARXR4RAJZVA7QYVFTIRZD63YXYVAETETYGKMNZF5PKM3L6) | 3 | 12 | 0.1020000 | 2026-09-20 | **yes** |
| 5 | [GBAVTB…MXV6](https://stellar.expert/explorer/testnet/account/GBAVTBA7T7FLNBPGNJXUBMBZV4J4N7L3JCKMWNVFPMK267C46FLJMXV6) | 2 | 5 | 0.4500000 | 2026-09-20 | no |
| 6 | [GDSGS5…6JDT](https://stellar.expert/explorer/testnet/account/GDSGS53IUWOSFIW7EWW5NJ4WJLUNVRSH3MYQ3YFGWEJI7VZCVE3C6JDT) | 6 | 18 | 0.3300000 | 2026-09-19 | no |
| 7 | [GBPA6I…KWZG](https://stellar.expert/explorer/testnet/account/GBPA6I6PQAYXADRROHMGYGPRY7NVHXL5Q7QT3L6SOAUSIBWV27AJKWZG) | 2 | 5 | 0.4010000 | 2026-09-19 | no |
| 8 | [GBRZSG…UTV7](https://stellar.expert/explorer/testnet/account/GBRZSG7K6ZXJRCMYM2O2HO2DKR7RO2ACZ5FARBMQZBB4YZMDFDXFUTV7) | 2 | 3 | 2.3389016 | 2026-09-17 | no |
| 9 | [GBH4IB…K6A7](https://stellar.expert/explorer/testnet/account/GBH4IBWTCU3ARMY33PILVW6SMBMKYWSUKONNLJN5IZGXBAQFVJWJK6A7) | 2 | 4 | 0.0400000 | 2026-08-04 | no |

Prospect 1 deserves a caveat: it is a contract, not a wallet, and it pays exactly 1 USDC to each of four services through the two twin
facilitators. That pattern looks more like test infrastructure than like a customer; treat it as something to understand before selling to it.

These are wallets, not contacts. We have not identified who operates any of them.

Evidence: [prospects report](https://github.com/CristobalWeb3/day91/blob/main/data/prospects-GAUJ54FOJLO62JPBURZMCFIGR4KZB2PVD6J6SHKRTJXCZKFWXAUL25GO.md)
(generated by `day91 prospects`, with the per-facilitator counts, the load-test filter and the full JSON next to it).

## Six cheap things to try

1. **Refund when the render adds nothing** (finding 3). Compare against a plain fetch and refund with `refund:no_gain`. About twenty lines in `refund.js`.
2. **Settle before you render, or widen the window** (finding 4). Verify and settle the payment before launching Playwright, or raise `maxTimeoutSeconds`
   above your worst-case render (30 s navigation timeout plus scrolling) and keep the browser warm with a periodic self-ping. Log settle failures
   server-side so this stops being a hypothesis.
3. **Say when it pays off, on `GET /`.** You already have `demo-output/` with with/without-JS pairs. Publish two or three of them with character counts
   and a one-line "best for: client-rendered explorers, dashboards, app shells". Agents that try a plain GET first (ours do) can then decide before paying.
4. **Go where the paying wallets are** (finding 5). Find out who runs `GBICCL…JU6V` and ask to be included in whatever they are testing; look at what
   `GAU2ME…BTVU` offers at 0.01 USDC, since 3 of the 5 x402-paying wallets in that cohort used it.
5. **Keep your own harness out of the demand signal** (findings 1 and 6). Anything you publish about usage should separate `GDMJ5B…IQR3` from buyers, so a
   reader (or an agent) can see independent demand the moment it appears. Day91's [funnel page](https://cristobalweb3.github.io/day91/) does this
   live from Horizon; reuse it if it helps.
6. **Approach the wallets that already shop around, starting with three** (finding 7). `CDFLOE…DMQN` is a contract that paid four different
   services exactly 1 USDC each, through the two twin facilitators, and was active yesterday; it may well be test infrastructure, so find its
   deployer from the creation transaction and work out what it is before investing time. `GDSGS5…6JDT` tried six services in two days for 0.33 USDC: a breadth-first evaluator, the profile most likely to try a render
   endpoint if it is easy to find. `GAURYW…UTEZ` made 48 payments to three services in one day: a volume user; if what it buys looks like
   content fetching, pay-per-render is a natural next purchase. For each one, look at the services it pays (links in the prospects report),
   work out who operates it, and ask. And ask `GBUQ25…M3L6` why it did not come back: it is the only wallet that has actually tried you.

Thanks for building something that actually settles. Happy to share the raw scan JSON or run it again after any change.
