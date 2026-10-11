# Submission: Find Your Way (Stellar Passport)

**Project name:** Day91

**Track:** General

**Short description (≤ 300 characters):**

Day91 is a market activation layer for the ecosystem's dormant supply: it reads a hackathon service's payment history from Horizon, diagnoses why it isn't selling, sends buyer agents with different purchasing policies at it over x402, and measures the result on-chain.

**Long description (≤ 1500 characters):**

Only ~7.6% of ~962 Stellar hackathon submissions show commits 90 days after the event. They don't lack code; they lack a market. Day91 works on that gap, on testnet, against a real service: RenderGate, a pay-per-render browser behind x402.

Scan: `day91 scan <payTo>` pulls the payout address's full payment history from Horizon, classifies payers as linked (received funds from the payTo), day91 (ours) or external, and profiles each external buyer and its operator's cohort. Prospect: `day91 prospects` reads the x402 facilitators' ledgers and ranks wallets that already buy from several services. Diagnose: a report for the author, every number linked to evidence. Activate: three buyer agents on the unmodified @x402 client: A pays only if a plain GET is not enough; B buys only with ≥ 3 independent payers in 90 days; C never needs to pay. Measure: a static page reads Horizon live and shows before/after by payer class.

Findings on RenderGate: 97.5% of historical payments came from the author's own harness; one independent buyer in 180 days, who spent 2% of its x402 budget there, so price isn't the blocker; one paid render that added nothing over a plain GET (refund suggested). In a 90-day market of 2,296 x402 payments and 224 buyer wallets, RenderGate is 0.09% of payments; 9 wallets buy from several services and are the ranked prospects. Four real paid renders, verified on-chain and labelled as Day91's own. Prospects are wallets, not contacts: outreach is manual and on the roadmap.

**Links:**

- Repository (MIT): https://github.com/CristobalWeb3/day91
- Funnel page (live from Horizon): https://cristobalweb3.github.io/day91/
- Report for the RenderGate author: https://github.com/CristobalWeb3/day91/blob/main/reasoning/rendergate-gtm.md
- Video pitch (≤ 3 min): _to be added_
