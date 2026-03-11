# CanHav Ethereum Market Map — Supabase vs Google Drive Gap Analysis

**Generated:** March 10, 2026

---

## Executive Summary

| Metric | Google Drive | Supabase |
|--------|-------------|----------|
| Unique Entities | 446 | 516 |
| Sectors | 7 | 7 |
| Subsectors | 36 | 35 |
| Duplicates | 31 | 0 |

**Entity Matching (case-insensitive):**
- Matched: **445** entities found in both sources
- Missing from Supabase: **1** entities in Google Drive but not in Supabase
- Extra in Supabase: **71** entities in Supabase but not in Google Drive
- Name differences: **0** entities matched but with different spelling/casing

## Critical Issues

### 1. Missing Foreign Keys (Blocker)

The Supabase `entities` table has these columns: `created_at, entity_id, entity_name, entity_uuid, updated_at`

**Missing:** `sector_id` and `subsector_id` foreign key columns.

This means:
- Entities are stored as a **flat list** with no categorization
- The `sectors` (7 rows) and `subsectors` (35 rows) tables exist but are **disconnected** from entities
- The database **cannot answer** queries like 'which entities are in DeFi?'
- The live website at canhav.com uses **hardcoded static JS** (not Supabase), so this hasn't been caught

### 2. Entity Count Gap

Google Drive has **446** unique entities vs Supabase's **516**.
After case-insensitive matching, **1** entities from Google Drive are missing in Supabase.

### 3. Live Website Uses Static Data

The canhav.com/market-map website uses 539 entities hardcoded in a Next.js JS bundle.
It does NOT connect to Supabase at all. This means three separate data sources are out of sync:
1. Google Drive (source of truth) — 451+ unique entities
2. Supabase — 516 entities (no sector linkage)
3. Live website — 539 entities (static JS)

## Sector Comparison

| # | Google Drive Sector | In Supabase | Match Type |
|---|---------------------|-------------|------------|
| 1 | Advanced Compute & Integration | ✅ | Exact |
| 2 | Core Protocol Architecture | ✅ | Exact |
| 3 | Data & Consensus Infrastructure | ✅ | Exact |
| 4 | DeFi Systems Architecture | ⚠️ | Name mismatch: Supabase has 'DeFi Systems **&** Architecture' |
| 5 | Governance & Enterprise Framework | ✅ | Exact |
| 6 | Monetary & Access Rails | ✅ | Exact |
| 7 | Rollup & Scaling Frameworks | ✅ | Exact |

**Sector name mismatch:** Google Drive uses 'DeFi Systems Architecture' while Supabase uses 'DeFi Systems & Architecture' (extra ampersand). Should be standardized.

## Subsector Comparison

- Exact matches: 30 / 36
- Case-insensitive matches: 30 / 36

### Subsector Name Mismatches (Truncation Issue)

The Google Drive spreadsheets truncated several subsector names. These are NOT true mismatches — they are the same subsectors with truncated names in the source spreadsheets:

| Google Drive (Truncated) | Supabase (Full Name) | Status |
|---|---|---|
| Compliance & Regulatory Intelli | Compliance & Regulatory Intelligence | Truncation — same subsector |
| Institutional Custody & Securit | Institutional Custody & Security | Truncation — same subsector |
| Synthetic & Yield-Bearing Dolla | Synthetic & Yield-Bearing Dollars | Truncation — same subsector |
| Validiums, Volitions, and Hybri | Validiums, Volitions, and Hybrid Rollups | Truncation — same subsector |
| ZK Rollups | ZK Rollup | Minor plural difference |

### True Subsector Mismatch

- **"Oracles & Data Networks"** exists in Google Drive but has no equivalent in Supabase
- Supabase has the full non-truncated names for the other 5 — these should be standardized

## Entities Missing from Supabase

### Rollup & Scaling Frameworks (1 missing)

- dYdX (historical Ethereum-anchored version) (Validiums, Volitions, and Hybri)

## Entities in Supabase but NOT in Google Drive

- agEUR
- Arbitrum
- Arbitrum Nitro (Framework)
- Base
- Binance (Validator Operations)
- Blast
- bloXroute (Block Builder)
- bloXroute (Integrated MEV Stack)
- bloXroute (Searcher-Builder Pipeline)
- bloXroute Relay
- Builder-Native Searcher Pipelines (Aggregated)
- Builder-Relay Integrated Operators (Aggregated)
- Chorus One
- Coinbase (Validator Operations)
- Dai
- Dencun
- dYdX (historical Ethereum-anchored version)
(Ethereum / StarkEx era) (High-performance validium design; DA committee model)
- Eden Network (Integrated MEV Stack)
- Eden Network (Searcher Infrastructure)
- Eden Relay
- Ethena Dollar
- EUR CoinVertible
- First Digital USD
- Flashbots (Block Builder)
- Flashbots (Integrated Stack)
- Flashbots (Searcher Infrastructure)
- Flashbots Relay
- Frax
- Fusaka
- Glamsterdam (Planned)
- Immutable X
(Production NFT validium using StarkEx)
- Kraken (Validator Operations)
- Lido (Node Operator Set)
- Linea
- Liquity USD
- London
- Monerium E-Money Tokens
- Ondo Short-Term U.S. Government Bond Fund
- Ondo U.S. Dollar Yield
- OP Stack (Framework)
- Optimism
- P2P.org
- Pax Dollar
- PayPal USD
- Pectra
- Polygon CDK
(Supports zkEVM rollups + validium-style chains)
- Polygon zkEVM
- Rai Reflex Index
- Rocket Pool (Node Operators)
- rsync-builder
- Savings Dai
- Scroll
- Shanghai / Capella (Shapella)
- Solo Validators
- Stably USD
- StakeWise (Operator Infrastructure)
- StarkEx
(Validium + ZK Rollup modes; application-specific)
- StarkEx (borderline but architecturally critical)
- Starknet
- Synthetix USD
- Taiko
- Tether
- The Merge
- Titan Builder
- Ultra Sound Relay
- Unichain
- USD Coin
- XSGD
- ZK Stack
(Rollup vs Validium selectable at deployment)
- zkSync
- zkSync Era
(Implements Volition-style DA choice in practice)

## Duplicate Entities

### Google Drive (31 duplicates)

| Entity | Count |
|--------|-------|
| ZK Stack | 2 |
| Polygon CDK | 2 |
| StarkEx | 2 |
| zkSync Era | 2 |
| Immutable X | 2 |
| Anchorage Digital | 2 |
| Monerium | 2 |
| dYdX (v3 on Ethereum) | 2 |
| Ankr | 2 |
| EigenDA | 2 |
| UMA | 2 |
| Infura | 2 |
| QuickNode | 2 |
| Chainstack | 2 |
| Moralis | 2 |
| Chainbase | 2 |
| Reality.eth | 2 |
| Axelar | 2 |
| Civic | 2 |
| Tally | 2 |
| Chainalysis | 2 |
| TRM Labs | 2 |
| Elliptic | 2 |
| RISC Zero | 2 |
| Axiom | 2 |
| Tokeny | 2 |
| Securitize | 2 |
| Notabene | 2 |
| Hats Protocol | 2 |
| Baseline Protocol | 2 |
| Solidus Labs | 2 |

### Supabase (0 duplicates)

No duplicates in Supabase.


## Recommended Action Plan

### Priority 1: Fix Database Schema (Critical)

1. **Add foreign keys** to the `entities` table:
   - `sector_id INT REFERENCES sectors(sector_id)`
   - `subsector_id INT REFERENCES subsectors(subsector_id)`
2. **Populate the FKs** using the Google Drive sector/subsector mapping as the source of truth
3. **Add entity metadata columns**: `website`, `description`, `entity_type` (these exist in Google Drive but not Supabase)

### Priority 2: Sync Missing Entities

4. **Insert 1 missing entities** from Google Drive into Supabase
5. **Review 71 extra Supabase entities** — keep, update, or remove
6. **Resolve 0 name discrepancies** — standardize naming across both sources

### Priority 3: Data Quality

7. **Deduplicate** 31 entities in Google Drive (intentional cross-sector references vs true duplicates)
8. **Deduplicate** 0 entities in Supabase
9. **Reconcile subsectors** — 5 are truncation issues (fix Google Drive names), 1 true mismatch ('Oracles & Data Networks' missing from Supabase), and 1 sector name mismatch ('DeFi Systems Architecture' vs 'DeFi Systems & Architecture')

### Priority 4: Connect Live Website to Supabase

10. **Replace static JS data** on canhav.com/market-map with Supabase API calls
11. **This eliminates the three-source sync problem** — Google Drive remains the editorial source, Supabase becomes the API layer, website reads from Supabase
12. **Enable real-time updates** without code deployments