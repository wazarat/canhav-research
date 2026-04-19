-- 018_m2_monetary_access_rails.sql
-- Milestone 2 — Monetary & Access Rails coverage
--
-- Adds 29 new entities + 31 classifications across the six MAR subsectors,
-- plus enrichment for two existing rows (BlackRock BUIDL, Chipper).
--
-- Subsector IDs (verified in 017+ schema):
--   22 Centralized Stablecoins
--   35 Decentralized Stablecoins
--    5 Synthetic & Yield-Bearing Dollars
--   13 Global On-Ramps
--   15 Institutional Payment Rails
--   19 Regional Payment Networks

BEGIN;

-- =========================================================================
-- 1) Staging: new entities
-- =========================================================================
CREATE TEMP TABLE m2_new_entities (
  natural_key      text PRIMARY KEY,
  entity_name      text NOT NULL,
  canonical_website text,
  logo_url         text,
  year_founded     int,
  hq_location      text,
  funding_stage    text,
  token_symbol     text,
  tags             text[],
  long_description text,
  status           text,
  parent_entity_id bigint
) ON COMMIT DROP;

INSERT INTO m2_new_entities (natural_key, entity_name, canonical_website, logo_url, year_founded, hq_location, funding_stage, token_symbol, tags, long_description, status, parent_entity_id) VALUES
-- --- Centralized Stablecoins ---
('gho',         'GHO (Aave)',                  'https://aave.com/gho',        'https://logo.clearbit.com/aave.com',           2022, 'Remote / London, UK',   'Public protocol',  'GHO',   ARRAY['stablecoin','defi','aave']::text[],              'GHO is Aave DAO''s overcollateralized, multi-collateral USD stablecoin, natively issued by Aave Protocol and governed by AAVE token holders.',                                                                                                                                                                     'active', NULL),
('usds',        'USDS (Sky)',                  'https://sky.money',           'https://logo.clearbit.com/sky.money',          2014, 'Remote',                'Public protocol',  'USDS',  ARRAY['stablecoin','maker','sky','endgame']::text[],     'USDS is the successor to DAI issued under the Sky protocol following the MakerDAO rebrand and Endgame restructuring, designed to be the primary upgrade path for DAI holders within the Sky ecosystem.',                                                                                                              'active', NULL),
('rlusd',       'RLUSD (Ripple)',              'https://ripple.com/rlusd',    'https://logo.clearbit.com/ripple.com',         2012, 'San Francisco, USA',    'Public (IPO TBD)', 'RLUSD', ARRAY['stablecoin','ripple','institutional']::text[],    'RLUSD is Ripple''s institutionally focused USD stablecoin, issued by Ripple and backed by USD deposits, short-term U.S. Treasuries, and cash equivalents, available on Ethereum and the XRP Ledger.',                                                                                                             'active', NULL),
('usdm',        'Mountain Protocol (USDM)',    'https://mountainprotocol.com','https://logo.clearbit.com/mountainprotocol.com',2023,'Hamilton, Bermuda',      'Seed',             'USDM',  ARRAY['stablecoin','yield','mica','rwa']::text[],        'USDM is Mountain Protocol''s yield-bearing USD stablecoin regulated by the Bermuda Monetary Authority and issued under MiCA-aligned reserves, passing U.S. Treasury yield to holders via a daily-rebasing token.',                                                                                                  'active', NULL),
('zusd',        'ZUSD (GMO Trust)',            'https://stablecoin.z.com/zusd','https://logo.clearbit.com/z.com',             2020, 'New York, USA',         'Subsidiary',       'ZUSD',  ARRAY['stablecoin','regulated','nydfs','apac']::text[],  'ZUSD is a USD stablecoin issued by GMO-Z.com Trust Company under a NYDFS limited-purpose trust charter, targeted at Japanese-affiliated institutions and regulated counterparties needing a compliance-first dollar.',                                                                                                  'active', NULL),

-- --- Decentralized Stablecoins ---
('crvusd',      'crvUSD (Curve)',              'https://crvusd.curve.fi',     'https://logo.clearbit.com/curve.fi',           2020, 'Remote',                'Public protocol',  'crvUSD', ARRAY['stablecoin','decentralized','curve','llamma']::text[],'crvUSD is Curve Finance''s decentralized USD stablecoin issued against volatile collateral through the LLAMMA soft-liquidation mechanism, which continuously rebalances liquidated positions rather than triggering discrete auctions.',                                                                                    'active', 314),
('bold',        'BOLD (Liquity V2)',           'https://liquity.org/bold',    'https://logo.clearbit.com/liquity.org',        2019, 'Zug, Switzerland',      'Public protocol',  'BOLD',  ARRAY['stablecoin','decentralized','liquity','cdp']::text[],'BOLD is Liquity V2''s ETH- and LST-collateralized USD stablecoin that introduces user-set interest rates on individual troves while preserving the immutable, governance-free design philosophy of the original LUSD protocol.',                                                                                         'active', NULL),
('mkusd',       'mkUSD (Prisma Finance)',      'https://prismafinance.com',   'https://logo.clearbit.com/prismafinance.com',  2023, 'Remote',                'Seed',             'mkUSD', ARRAY['stablecoin','lst','decentralized','distressed']::text[],'mkUSD is Prisma Finance''s USD stablecoin collateralized exclusively by liquid staking tokens, representing one of the first attempts to convert LST-dominated collateral into a CDP-based dollar.',                                                                                                                  'unknown', NULL),

-- --- Synthetic & Yield-Bearing Dollars ---
('susde',       'sUSDe (Ethena)',              'https://ethena.fi',           'https://logo.clearbit.com/ethena.fi',          2023, 'Remote',                'Public protocol',  'sUSDe', ARRAY['synthetic-dollar','yield','ethena','basis-trade']::text[],'sUSDe is the staked, yield-accruing version of Ethena''s USDe, routing funding-rate yield from the delta-neutral basis trade to stakers and typically representing a larger on-chain footprint than unstaked USDe.',                                                                                                 'active', 280),
('usual',       'Usual Protocol (USD0 / USD0++ / USUAL)', 'https://usual.money','https://logo.clearbit.com/usual.money',       2024, 'Paris, France',         'Seed',             'USUAL', ARRAY['stablecoin','rwa','yield','governance']::text[], 'Usual Protocol issues USD0, an RWA-backed stablecoin collateralized by tokenized short-term U.S. Treasuries, along with the staked USD0++ yield wrapper and the USUAL governance token that coordinates fee accrual and reserves management across the system.',                                                       'active', NULL),
('ustb',        'Superstate USTB',             'https://superstate.com/ustb', 'https://logo.clearbit.com/superstate.com',     2023, 'New York, USA',         'Series A',         'USTB',  ARRAY['rwa','tokenized-treasury','onchain-fund']::text[],'USTB is Superstate''s tokenized short-duration U.S. Treasury fund, offering qualified institutional investors on-chain exposure to T-bill yield via an SEC-registered 1940 Act vehicle redeemable in USD or USDC.',                                                                                                    'active', 11),

-- --- Global On-Ramps ---
('revolut',     'Revolut',                     'https://www.revolut.com',     'https://logo.clearbit.com/revolut.com',        2015, 'London, UK',            'Pre-IPO',          NULL,    ARRAY['fintech','neobank','on-ramp','europe']::text[],    'Revolut is a London-headquartered neobank serving tens of millions of retail and business customers across Europe and global markets, embedding fiat-to-crypto conversion directly into its core banking app.',                                                                                                      'active', NULL),
('robinhood',   'Robinhood Connect',           'https://robinhood.com/connect','https://logo.clearbit.com/robinhood.com',     2013, 'Menlo Park, USA',       'Public (NASDAQ)',  NULL,    ARRAY['brokerage','on-ramp','retail','us']::text[],       'Robinhood Connect is Robinhood''s on-ramp API that lets external wallets and dApps tap into Robinhood''s U.S. retail brokerage stack, reusing existing KYC and funding rails to deliver fiat-to-Ethereum conversion for tens of millions of funded accounts.',                                                        'active', NULL),
('wise',        'Wise (TransferWise)',         'https://wise.com',            'https://logo.clearbit.com/wise.com',           2011, 'London, UK',            'Public (LSE)',     NULL,    ARRAY['fintech','cross-border','fx','institutional']::text[],'Wise is a publicly listed cross-border payments platform moving over $10B per quarter across 50+ currencies, operating its own licensed local-rail infrastructure and increasingly exploring stablecoin corridors as a settlement primitive.',                                                                     'active', NULL),
('wyre',        'Wyre',                        'https://www.sendwyre.com',    'https://logo.clearbit.com/sendwyre.com',       2013, 'San Francisco, USA',    'Defunct',          NULL,    ARRAY['on-ramp','defunct','legacy']::text[],              'Wyre was a major U.S.-based fiat-to-crypto on-ramp API that powered Ethereum access for wallets and dApps before winding down operations in 2023 amid a failed Bolt acquisition and liquidity shortfalls.',                                                                                                           'defunct', NULL),

-- --- Institutional Payment Rails ---
('visa',        'Visa (Crypto Settlement)',    'https://usa.visa.com/solutions/crypto.html','https://logo.clearbit.com/visa.com',1958,'San Francisco, USA',  'Public (NYSE)',    NULL,    ARRAY['card-network','institutional','settlement']::text[],'Visa''s crypto settlement program allows issuers and acquirers to settle obligations to Visa in USDC on Ethereum, making Ethereum a direct backend settlement rail for one of the largest global card networks.',                                                                                                     'active', NULL),
('mastercard',  'Mastercard (Crypto Credentials)','https://www.mastercard.com/news/perspectives/2023/mastercard-crypto-credential/','https://logo.clearbit.com/mastercard.com',1966,'Purchase, USA','Public (NYSE)',NULL,ARRAY['card-network','institutional','identity','settlement']::text[],'Mastercard''s Multi-Token Network and Crypto Credential initiative layer identity, verification, and blockchain settlement on top of the global Mastercard rail, with Ethereum as a reference settlement venue for participating banks.',                                                                         'active', NULL),
('bridge',      'Bridge (Stripe)',             'https://bridge.xyz',          'https://logo.clearbit.com/bridge.xyz',         2022, 'San Francisco, USA',    'Acquired (Stripe)',NULL,    ARRAY['stablecoin-orchestration','institutional','m&a']::text[],'Bridge is a stablecoin orchestration platform acquired by Stripe in 2024 for ~$1.1B that provides APIs for businesses to move between fiat and stablecoins across multiple chains and counterparties, with Ethereum as the canonical settlement backbone.',                                                             'acquired', NULL),
('citi',        'Citi (Citi Token Services)',  'https://www.citigroup.com/global/services/tts/citi-token-services','https://logo.clearbit.com/citi.com',1812,'New York, USA','Public (NYSE)',NULL,ARRAY['g-sib','institutional','tokenized-deposits']::text[],'Citi Token Services is a 24/7 tokenized deposit and trade-finance platform operated on a permissioned Ethereum-based ledger by one of the largest global systemically important banks (G-SIBs), providing institutional-grade settlement inside Citi''s own network.',                                               'active', NULL),
('bny',         'BNY Mellon (Digital Assets)', 'https://www.bny.com/solutions/digital-assets','https://logo.clearbit.com/bny.com',1784,'New York, USA','Public (NYSE)',NULL,ARRAY['g-sib','custody','institutional']::text[],'BNY Mellon''s digital-assets platform provides institutional custody and administration for crypto and tokenized assets, integrating with Ethereum-based issuers and fund structures as part of one of the largest custodians globally.',                                                                                'active', NULL),
('hsbc',        'HSBC (Orion)',                'https://www.hsbc.com/insight/topics/making-markets-digital','https://logo.clearbit.com/hsbc.com',1865,'London, UK','Public (HKEX / LSE)',NULL,ARRAY['g-sib','tokenized-assets','institutional','apac']::text[],'HSBC Orion is a tokenization platform used by HSBC for tokenized gold, digital bonds, and institutional settlement workflows, leveraging Ethereum-compatible infrastructure for issuance and custody across APAC and the UK.',                                                                                'active', NULL),
('goldman',     'Goldman Sachs (GS DAP)',      'https://www.goldmansachs.com/what-we-do/digital-assets','https://logo.clearbit.com/gs.com',1869,'New York, USA','Public (NYSE)',NULL,ARRAY['g-sib','tokenized-assets','institutional']::text[],'GS DAP is Goldman Sachs'' digital asset platform for primary issuance and lifecycle management of tokenized securities, with Ethereum-compatible infrastructure underpinning institutional-grade bond, fund, and money-market issuance.',                                                                              'active', NULL),

-- --- Regional Payment Networks ---
('mpesa',       'M-Pesa (Safaricom)',          'https://www.safaricom.co.ke/m-pesa','https://logo.clearbit.com/safaricom.co.ke',2007,'Nairobi, Kenya',      'Subsidiary (Vodacom/Safaricom)',NULL,ARRAY['mobile-money','africa','p2p']::text[],'M-Pesa is Africa''s largest mobile money network operated by Safaricom, serving 50M+ active users across Kenya, Tanzania, Ethiopia and neighbouring markets, and a hard integration target for any stablecoin-based remittance corridor into East Africa.',                                                              'active', NULL),
('nubank',      'Nubank',                      'https://www.nubank.com.br',   'https://logo.clearbit.com/nubank.com.br',      2013, 'São Paulo, Brazil',    'Public (NYSE)',    NULL,    ARRAY['neobank','latam','fintech']::text[],               'Nubank is the largest digital bank in Latin America with 90M+ customers across Brazil, Mexico, and Colombia, embedding crypto access and stablecoin exposure into its core consumer banking app.',                                                                                                                    'active', NULL),
('mercadopago', 'Mercado Pago',                'https://www.mercadopago.com', 'https://logo.clearbit.com/mercadopago.com',    2003, 'Buenos Aires, Argentina','Public (via Mercado Libre)',NULL,ARRAY['fintech','latam','payments']::text[],          'Mercado Pago is the payments arm of Mercado Libre, serving as a primary e-commerce and P2P rail across Latin America and offering native crypto trading and stablecoin custody inside its consumer app.',                                                                                                             'active', NULL),
('lemon',       'Lemon Cash',                  'https://www.lemon.me',        'https://logo.clearbit.com/lemon.me',           2019, 'Buenos Aires, Argentina','Series B',         NULL,    ARRAY['fintech','latam','crypto-super-app']::text[],      'Lemon Cash is an Argentine crypto super-app used as a primary USD hedge by local consumers, where USDT functions as an effective unit of account on top of peso denominated income and payments.',                                                                                                                    'active', NULL),
('grab',        'Grab Financial',              'https://www.grab.com/sg/finance','https://logo.clearbit.com/grab.com',        2012, 'Singapore',             'Public (NASDAQ)',  NULL,    ARRAY['super-app','sea','fintech']::text[],              'Grab Financial is the financial-services arm of Southeast Asia super-app Grab, layering wallets, cross-border transfers, and evolving stablecoin distribution on top of the ride-hail and delivery user base of 180M+ across SEA.',                                                                                   'active', NULL),
('aza',         'AZA Finance (BitPesa)',       'https://azafinance.com',      'https://logo.clearbit.com/azafinance.com',     2013, 'Nairobi, Kenya',        'Series B',         NULL,    ARRAY['b2b','africa','cross-border']::text[],             'AZA Finance (formerly BitPesa) is an African B2B cross-border payments platform that uses crypto and stablecoins on Ethereum as an intermediate settlement layer to move value between African currencies and major global ones.',                                                                                    'active', NULL),
('cedar',       'Cedar',                       'https://cedar.money',         'https://logo.clearbit.com/cedar.money',        2023, 'New York, USA',         'Seed',             NULL,    ARRAY['b2b','mena','stablecoins','cross-border']::text[],'Cedar is a MENA-focused stablecoin payments infrastructure provider that uses Ethereum as its settlement rail to move USD-denominated value between the U.S., Middle East, and emerging markets for SMB and enterprise corridors.',                                                                                    'active', NULL);

-- =========================================================================
-- 2) Insert into public.entities, capture id mapping
-- =========================================================================
CREATE TEMP TABLE m2_inserted (
  natural_key text PRIMARY KEY,
  entity_id   bigint NOT NULL
) ON COMMIT DROP;

WITH ins AS (
  INSERT INTO public.entities (
    entity_name, canonical_website, logo_url, year_founded, hq_location,
    funding_stage, token_symbol, tags, long_description, status, parent_entity_id
  )
  SELECT
    entity_name, canonical_website, logo_url, year_founded, hq_location,
    funding_stage, token_symbol, tags, long_description, status, parent_entity_id
  FROM m2_new_entities
  ORDER BY natural_key
  RETURNING entity_id, entity_name
)
INSERT INTO m2_inserted (natural_key, entity_id)
SELECT n.natural_key, i.entity_id
FROM ins i
JOIN m2_new_entities n ON n.entity_name = i.entity_name;

-- =========================================================================
-- 3) Staging: new classifications (one row per (entity, subsector))
-- =========================================================================
CREATE TEMP TABLE m2_new_classifications (
  natural_key               text,       -- FK to m2_inserted; NULL if existing entity
  explicit_entity_id        bigint,     -- set for reused existing rows
  subsector_id              bigint NOT NULL,
  maintaining_organization  text,
  website                   text,
  description               text,
  reason_for_inclusion      text,
  practitioners_note        text,
  practitioner_validation_check text,
  is_primary                boolean NOT NULL DEFAULT true
) ON COMMIT DROP;

-- Validation-check strings reused across rows (match existing subsector phrasing)
-- CENTRALIZED  = 'Does peg stability depend on discretionary offchain redemption by the issuer? Yes'
-- DECENTRALIZED= 'Would this asset maintain its peg or monetary logic if all offchain custodians, banks, and issuers ceased to exist? Yes'
-- SYNTHETIC    = 'Does this asset expose holders to strategy, counterparty, or market risk beyond simple custody of dollars? Yes'
-- ONRAMP       = 'Is this entity''s primary value proposition enabling users to get fiat value into Ethereum-native assets? Yes'
-- INST_RAILS   = 'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes'
-- REGIONAL     = 'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes'

INSERT INTO m2_new_classifications (natural_key, explicit_entity_id, subsector_id, maintaining_organization, website, description, reason_for_inclusion, practitioners_note, practitioner_validation_check, is_primary) VALUES
-- ===== Centralized Stablecoins (22) =====
('gho', NULL, 22,
  'Aave Companies / Aave DAO',
  'https://aave.com/gho',
  'GHO is a USD-referenced stablecoin issued by the Aave Protocol and governed by AAVE token holders, minted against user-supplied collateral inside Aave and redeemable through the same protocol facility.',
  'GHO meets Centralized Stablecoin criteria via its designated Facilitator model: the primary peg backstop is the Aave DAO treasury and Facilitator caps, which act as a controlled issuer/redeemer even though issuance runs through a smart contract.',
  'GHO should be treated as a DAO-issued stablecoin rather than a trust-minimized one: peg quality depends on Facilitator configuration and the DAO''s willingness to adjust interest rates and caps, which is operationally discretionary.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  true),
('usds', NULL, 22,
  'Sky (formerly MakerDAO)',
  'https://sky.money',
  'USDS is the Sky ecosystem''s USD-referenced stablecoin, issued as the primary successor asset to DAI under the Endgame restructuring and designed to serve as the default upgrade path for existing DAI holders.',
  'USDS qualifies as a Centralized Stablecoin under CanHav''s definition because peg maintenance relies on off-chain regulated collateral (RWA allocators), Sky governance, and discretionary parameter changes that can modify issuance and redemption terms.',
  'USDS should be evaluated as a governance-dependent stablecoin whose risk profile is tightly coupled to Sky''s RWA allocation strategy and Endgame political process, not just smart-contract security.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  true),
('rlusd', NULL, 22,
  'Ripple / Standard Custody & Trust Company',
  'https://ripple.com/rlusd',
  'RLUSD is an institutionally focused USD stablecoin issued by Ripple via a New York limited-purpose trust, with reserves in USD deposits, short-term U.S. Treasuries, and cash equivalents, available on Ethereum and the XRP Ledger.',
  'RLUSD is a textbook Centralized Stablecoin: peg stability is a direct function of Ripple''s off-chain reserve custody and redemption program for approved counterparties under NYDFS oversight.',
  'RLUSD positions Ripple as a direct competitor to Circle for institutional USD flow; practitioners should weigh payment-corridor distribution (XRPL + Ethereum) against concentration risk in a single issuer under U.S. regulatory scope.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  true),
('usdm', NULL, 22,
  'Mountain Protocol Ltd.',
  'https://mountainprotocol.com',
  'USDM is a MiCA-aligned, yield-bearing USD stablecoin issued by Mountain Protocol under Bermuda Monetary Authority oversight, distributing U.S. Treasury yield to holders through a daily positive rebase.',
  'USDM classifies as a Centralized Stablecoin because peg and yield delivery rely on Mountain Protocol''s off-chain reserve management and regulated redemption facility; holders do not receive strategy-style variability.',
  'USDM is valuable as a template for EU-compliant yield-bearing dollars, but positions should be sized against issuer concentration and MiCA regime evolution rather than protocol-native risk.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  true),
('zusd', NULL, 22,
  'GMO-Z.com Trust Company, Inc.',
  'https://stablecoin.z.com/zusd',
  'ZUSD is a USD stablecoin issued by GMO-Z.com Trust Company, a NYDFS-regulated limited-purpose trust affiliated with Japan''s GMO Internet Group, backed 1:1 by segregated USD-denominated reserves.',
  'ZUSD is a Centralized Stablecoin under a U.S. trust charter where peg stability depends on segregated fiat reserves and regulated redemption by the issuer for qualified counterparties.',
  'ZUSD matters less for DeFi volume and more for jurisdictional diversity: it is one of the few regulated USD tokens with an APAC-affiliated issuer and NYDFS oversight, which can matter for Japan-facing enterprise use cases.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  true),
-- BUIDL as additional Centralized Stablecoin classification (entity 423 already exists)
(NULL, 423, 22,
  'BlackRock / Securitize',
  'https://securitize.io/primary-market/blackrock-buidl',
  'BUIDL is BlackRock''s tokenized USD Institutional Digital Liquidity Fund issued via Securitize on Ethereum, with reserves in U.S. Treasuries, cash, and repurchase agreements and NAV targeting one dollar per share.',
  'BUIDL fits Centralized Stablecoin criteria because peg behavior is anchored to off-chain regulated redemption by BlackRock/Securitize: qualified holders redeem for USDC or USD off-chain, making the peg a discretionary issuer function.',
  'BUIDL is the largest tokenized money-market fund and effectively functions as an institutional stablecoin for regulated investors; its cross-listing between RWAs and Centralized Stablecoins reflects this dual identity.',
  'Does peg stability depend on discretionary offchain redemption by the issuer? Yes',
  false),

-- ===== Decentralized Stablecoins (35) =====
('crvusd', NULL, 35,
  'Curve Finance / Curve DAO',
  'https://crvusd.curve.fi',
  'crvUSD is Curve Finance''s decentralized USD stablecoin minted against volatile collateral (ETH, LSTs, WBTC) through the LLAMMA soft-liquidation AMM, which converts collateral into crvUSD continuously rather than via discrete liquidation events.',
  'crvUSD qualifies as a Decentralized Stablecoin because its monetary logic would continue to function with no off-chain custodian or issuer: collateral, liquidation, and redemption are enforced entirely by onchain smart contracts.',
  'crvUSD is a novel design worth studying for liquidation-smoothing behavior in volatile markets; practitioners should monitor LLAMMA parameterization and PegKeeper balances to understand peg resilience through a full cycle.',
  'Would this asset maintain its peg or monetary logic if all offchain custodians, banks, and issuers ceased to exist? Yes',
  true),
('bold', NULL, 35,
  'Liquity Protocol',
  'https://liquity.org/bold',
  'BOLD is Liquity V2''s USD stablecoin minted against ETH and LST collateral with user-set interest rates and a redemption mechanism that automatically redeems from the highest-interest troves, preserving the V1 ethos of immutable, governance-free design.',
  'BOLD is a Decentralized Stablecoin by construction: issuance, liquidation, and redemption run entirely through immutable Ethereum contracts with no off-chain custodian or issuer dependency.',
  'BOLD is structurally important as the blue-chip decentralized stablecoin that does not depend on RWA collateral; practitioners should price in design risk from the new user-set-rate mechanism and liquidity bootstrap.',
  'Would this asset maintain its peg or monetary logic if all offchain custodians, banks, and issuers ceased to exist? Yes',
  true),
('mkusd', NULL, 35,
  'Prisma Finance',
  'https://prismafinance.com',
  'mkUSD is Prisma Finance''s USD stablecoin collateralized by liquid staking tokens (LSTs), launched in 2023 and operating through a Liquity-style CDP design before suffering a March 2024 exploit that impaired its peg and operations.',
  'mkUSD qualifies as a Decentralized Stablecoin because its issuance mechanism is contract-enforced against LST collateral with no off-chain custodian; peg behaviour, however, has not survived stress.',
  'mkUSD should be treated primarily as a cautionary reference for LST-collateralized dollar designs; active sizing is not recommended pending protocol resolution, but the design remains instructive for the LST-backed category.',
  'Would this asset maintain its peg or monetary logic if all offchain custodians, banks, and issuers ceased to exist? Yes',
  true),

-- ===== Synthetic & Yield-Bearing Dollars (5) =====
('susde', NULL, 5,
  'Ethena Labs',
  'https://ethena.fi',
  'sUSDe is the staked, yield-accruing version of Ethena''s USDe synthetic dollar, accruing funding-rate yield from the delta-neutral basis trade (ETH spot + short perpetuals) into a rebasing token held by stakers.',
  'sUSDe qualifies as a Synthetic & Yield-Bearing Dollar because holders are exposed to funding-rate variability, counterparty risk on centralized exchanges, and strategy execution risk that go well beyond simple USD custody.',
  'sUSDe is arguably the more operationally important product than unstaked USDe: most capital is held in the staked form, and its yield path is directly exposed to perp funding-rate regime changes.',
  'Does this asset expose holders to strategy, counterparty, or market risk beyond simple custody of dollars? Yes',
  true),
('usual', NULL, 5,
  'Usual Labs',
  'https://usual.money',
  'Usual Protocol issues USD0 (an RWA-collateralized USD stablecoin backed by tokenized short-term Treasuries), USD0++ (a staked, yield-bearing wrapper), and the USUAL governance token coordinating fee accrual, buybacks, and reserve policy.',
  'The Usual system qualifies as Synthetic & Yield-Bearing Dollars because USD0++ and USUAL expose holders to duration, RWA custody, and governance-driven cash-flow distribution that are materially different from simple custody of dollars.',
  'Practitioners should analyze Usual as a single protocol-level exposure: USD0, USD0++ and USUAL are economically linked, and yield / peg behaviour depends on governance decisions about token issuance and collateral quality.',
  'Does this asset expose holders to strategy, counterparty, or market risk beyond simple custody of dollars? Yes',
  true),
('ustb', NULL, 5,
  'Superstate, Inc.',
  'https://superstate.com/ustb',
  'USTB is Superstate''s tokenized, short-duration U.S. Treasury fund for qualified institutional investors, structured as an SEC-registered 1940 Act vehicle with NAV-based value and redemption in USD or USDC.',
  'USTB meets Synthetic & Yield-Bearing Dollar criteria because it is a USD-denominated on-chain instrument with NAV behaviour, duration risk, and fund-level operational risk rather than a fixed-peg balance.',
  'USTB is the clearest Ondo/OUSG competitor and is worth tracking as a proxy for institutional RWA adoption; practitioners should monitor eligibility gates and distribution partners to understand real reach.',
  'Does this asset expose holders to strategy, counterparty, or market risk beyond simple custody of dollars? Yes',
  true),
-- USDM cross-classification into Synthetic & Yield-Bearing Dollars (non-primary)
('usdm', NULL, 5,
  'Mountain Protocol Ltd.',
  'https://mountainprotocol.com',
  'USDM also functions as a yield-bearing dollar: holders receive daily positive rebases funded by the underlying U.S. Treasury reserve yield, distinguishing it from fixed-balance centralized stablecoins.',
  'USDM qualifies as a Synthetic & Yield-Bearing Dollar because its value path embeds yield from off-chain reserve assets, exposing holders to reserve-management, duration and issuer discretion beyond simple dollar custody.',
  'USDM sits at the boundary of Centralized and Yield-Bearing: for risk modelling, treat it as a yield-bearing compliant stablecoin, not a fixed-peg cash substitute.',
  'Does this asset expose holders to strategy, counterparty, or market risk beyond simple custody of dollars? Yes',
  false);

-- =========================================================================
-- 4) Execute classification inserts for Centralized / Decentralized / Synthetic
-- =========================================================================
INSERT INTO public.entity_classifications (
  entity_id, subsector_id, maintaining_organization, website,
  description, reason_for_inclusion, practitioners_note,
  practitioner_validation_check, is_primary
)
SELECT
  COALESCE(c.explicit_entity_id, i.entity_id) AS entity_id,
  c.subsector_id,
  c.maintaining_organization,
  c.website,
  c.description,
  c.reason_for_inclusion,
  c.practitioners_note,
  c.practitioner_validation_check,
  c.is_primary
FROM m2_new_classifications c
LEFT JOIN m2_inserted i ON i.natural_key = c.natural_key
WHERE COALESCE(c.explicit_entity_id, i.entity_id) IS NOT NULL;

-- Clear the classification staging before re-populating for the next wave
TRUNCATE m2_new_classifications;

-- =========================================================================
-- 5) Classifications: Global On-Ramps (13), Institutional Payment Rails (15),
--    Regional Payment Networks (19)
-- =========================================================================
INSERT INTO m2_new_classifications (natural_key, explicit_entity_id, subsector_id, maintaining_organization, website, description, reason_for_inclusion, practitioners_note, practitioner_validation_check, is_primary) VALUES
-- ===== Global On-Ramps (13) =====
('revolut', NULL, 13,
  'Revolut Ltd.',
  'https://www.revolut.com',
  'Revolut is a UK-headquartered neobank with tens of millions of retail and business customers across Europe and global markets, embedding fiat-to-crypto conversion directly inside its core banking app via Revolut X and in-app crypto buy flows.',
  'Revolut qualifies as a Global On-Ramp because, analysed independently from trading, its on-ramp functionality is a primary pathway for European retail fiat to reach Ethereum assets at very large scale.',
  'Revolut''s crypto access is tightly coupled to its banking licenses and jurisdictional posture; practitioners should monitor regulatory regime changes (MiCA, UK FCA) and banking-partner decisions that can expand or restrict Ethereum access.',
  'Is this entity''s primary value proposition enabling users to get fiat value into Ethereum-native assets? Yes',
  true),
('robinhood', NULL, 13,
  'Robinhood Markets, Inc.',
  'https://robinhood.com/connect',
  'Robinhood Connect is Robinhood''s on-ramp API exposing Robinhood''s U.S. retail brokerage, KYC and funding stack to external wallets and dApps, letting users fund Ethereum positions directly from funded Robinhood accounts.',
  'Robinhood Connect meets Global On-Ramp criteria because its specific product purpose, separated from brokerage trading, is to deliver fiat-to-Ethereum conversion for a large U.S. retail user base.',
  'Robinhood Connect is a uniquely large U.S. retail on-ramp surface; access quality is strong for U.S. users but heavily dependent on U.S. regulatory posture and Robinhood''s product decisions.',
  'Is this entity''s primary value proposition enabling users to get fiat value into Ethereum-native assets? Yes',
  true),
('wise', NULL, 13,
  'Wise plc',
  'https://wise.com',
  'Wise is a publicly listed UK-founded cross-border payments platform moving over $10B per quarter across 50+ currencies, operating its own licensed local-rail infrastructure and increasingly positioning stablecoin corridors as a complementary settlement primitive.',
  'Wise belongs in Global On-Ramps as an emerging-use entity: while historically a fiat cross-border platform, its evolving stablecoin integration makes it a credible large-scale fiat-to-Ethereum access surface for consumer and SMB flows.',
  'Wise is best tracked as an upside on-ramp whose impact is conditional on how aggressively it embraces stablecoin settlement; optionality is high, but current Ethereum flow through Wise is a small share of total volume.',
  'Is this entity''s primary value proposition enabling users to get fiat value into Ethereum-native assets? Yes',
  true),
('wyre', NULL, 13,
  'Wyre Payments, Inc.',
  'https://www.sendwyre.com',
  'Wyre was a major U.S.-based fiat-to-crypto on-ramp API that powered Ethereum access for wallets and dApps from 2013 until winding down operations in 2023 following a failed Bolt acquisition and liquidity shortfalls.',
  'Wyre is included for historical coverage: during its operational lifetime it was one of the defining Global On-Ramps for U.S. developers and wallets plugging into Ethereum, and remains a reference point for the category.',
  'Wyre is effectively defunct as of 2023 and should not be relied on operationally; practitioners should treat it as a case study in on-ramp concentration risk and acquisition-driven instability rather than a live option.',
  'Is this entity''s primary value proposition enabling users to get fiat value into Ethereum-native assets? Yes',
  true),

-- ===== Institutional Payment Rails (15) =====
('visa', NULL, 15,
  'Visa Inc.',
  'https://usa.visa.com/solutions/crypto.html',
  'Visa''s crypto settlement initiative allows participating issuers and acquirers to settle obligations to Visa in USDC on Ethereum (and related chains), making Ethereum a direct backend settlement rail for the Visa network rather than a user-facing product.',
  'Visa meets Institutional Payment Rails criteria because Ethereum is used as a backend settlement layer for institutional-grade card-network flows, even while end users and merchants never interact with the blockchain directly.',
  'Visa''s program is the flagship enterprise example of Ethereum as settlement substrate; practitioners should monitor expansion (new issuers, new stablecoins, new corridors) as a leading indicator for broader banking adoption.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('mastercard', NULL, 15,
  'Mastercard Incorporated',
  'https://www.mastercard.com/news/perspectives/2023/mastercard-crypto-credential/',
  'Mastercard''s Multi-Token Network and Crypto Credential initiative layer identity, verification and blockchain settlement on top of the global Mastercard rail, with Ethereum and Ethereum-compatible networks as reference settlement venues for participating banks.',
  'Mastercard is included in Institutional Payment Rails because it is deliberately architecting Ethereum-compatible settlement and identity rails underneath its existing card business, so Ethereum becomes a settlement layer for traditional card flows.',
  'Mastercard''s efforts are more identity-focused than Visa''s and therefore more regulatorily defensive; practitioners should treat it as a complementary institutional on-chain surface rather than a competing stablecoin settlement play.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('bridge', NULL, 15,
  'Bridge, Inc. (Stripe subsidiary)',
  'https://bridge.xyz',
  'Bridge is a stablecoin orchestration platform acquired by Stripe in 2024 for ~$1.1B that offers APIs for enterprises to move value between fiat and stablecoins across multiple chains, with Ethereum as a canonical settlement backbone for issuance and custody.',
  'Bridge fits Institutional Payment Rails because its entire product is built around Ethereum-based stablecoin settlement for institutional-grade B2B and platform flows, largely invisible to end consumers.',
  'Bridge is the defining enterprise stablecoin acquisition of 2024; practitioners should watch Stripe''s integration path (Atlas, Treasury, Connect) as the real signal of how deep Ethereum settlement embeds into mainstream platform payments.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('citi', NULL, 15,
  'Citigroup Inc.',
  'https://www.citigroup.com/global/services/tts/citi-token-services',
  'Citi Token Services is a 24/7 tokenized deposit and trade-finance platform operated on a permissioned Ethereum-based ledger by one of the largest global systemically important banks (G-SIBs), providing institutional-grade settlement inside Citi''s own network.',
  'Citi belongs in Institutional Payment Rails because it uses an Ethereum-compatible private ledger as the settlement backbone for G-SIB institutional flows, including intraday liquidity and trade finance for corporate clients.',
  'Citi Token Services is the highest-signal example of a G-SIB treating Ethereum-compatible infrastructure as enterprise plumbing; practitioners should track whether Citi moves any of this onto public Ethereum or remains permissioned-only.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('bny', NULL, 15,
  'The Bank of New York Mellon Corporation',
  'https://www.bny.com/solutions/digital-assets',
  'BNY Mellon''s digital-asset platform provides institutional custody and administration for crypto and tokenized assets, integrating with Ethereum-based issuers and fund structures as part of one of the largest custodians globally.',
  'BNY Mellon qualifies as an Institutional Payment Rail because its digital-asset custody and settlement services are anchored in Ethereum-based issuance and transfer flows for regulated clients, even if client-facing interfaces abstract the chain entirely.',
  'BNY Mellon''s participation is a structural legitimizer for Ethereum as institutional infrastructure; practitioners should watch regulatory posture (FAS-121 evolution, SAB 121 replacement) to gauge how quickly balance-sheet capacity scales.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('hsbc', NULL, 15,
  'HSBC Holdings plc',
  'https://www.hsbc.com/insight/topics/making-markets-digital',
  'HSBC Orion is a tokenization platform used by HSBC for tokenized gold, digital bonds, and institutional settlement workflows, leveraging Ethereum-compatible infrastructure for issuance, custody and settlement across APAC and the UK.',
  'HSBC fits Institutional Payment Rails because Orion is deliberately architected on Ethereum-compatible tooling to settle and administer institutional tokenized assets at G-SIB scale, providing another global bank''s endorsement of Ethereum as backend infrastructure.',
  'HSBC''s APAC footprint makes Orion especially interesting as a bridge between Asian institutional capital and Ethereum-based tokenized assets; practitioners should track issuance volumes and partner banks onboarded each quarter.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),
('goldman', NULL, 15,
  'The Goldman Sachs Group, Inc.',
  'https://www.goldmansachs.com/what-we-do/digital-assets',
  'GS DAP is Goldman Sachs'' digital asset platform for primary issuance and lifecycle management of tokenized securities, with Ethereum-compatible infrastructure underpinning institutional-grade bond, fund and money-market issuance across multiple jurisdictions.',
  'Goldman Sachs belongs in Institutional Payment Rails because GS DAP uses Ethereum-compatible rails as the institutional settlement substrate for capital-markets issuance, even when end clients interact only via traditional custody.',
  'GS DAP is among the most strategically important enterprise deployments: issuance volume, partner banks, and secondary-trading integration signal how quickly institutional Ethereum settlement moves from pilot to production.',
  'Does this entity use Ethereum as a backend settlement layer for institutional-grade payment flows, even if users never touch Ethereum directly? Yes',
  true),

-- ===== Regional Payment Networks (19) =====
('mpesa', NULL, 19,
  'Safaricom PLC (Vodacom Group)',
  'https://www.safaricom.co.ke/m-pesa',
  'M-Pesa is Africa''s largest mobile money network operated by Safaricom, serving 50M+ active users across Kenya, Tanzania, Ethiopia and neighbouring markets, with emerging stablecoin-corridor integrations plugging Ethereum settlement into mobile money endpoints.',
  'M-Pesa belongs in Regional Payment Networks because it is the dominant regional rail for East Africa and is increasingly the required termination point for any stablecoin-based remittance corridor that uses Ethereum as the settlement layer into that region.',
  'Practitioners should think of M-Pesa less as a crypto platform and more as the default last-mile endpoint for Ethereum-based corridors into East Africa; partnership access and FX pricing through aggregators are the binding constraints, not blockchain throughput.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('nubank', NULL, 19,
  'Nu Holdings Ltd.',
  'https://www.nubank.com.br',
  'Nubank is the largest digital bank in Latin America with 90M+ customers across Brazil, Mexico, and Colombia, embedding native crypto trading and stablecoin custody inside its core consumer banking app.',
  'Nubank qualifies as a Regional Payment Network because its product is architected around specific LatAm markets, with stablecoin access used as a USD-hedge savings primitive reachable by consumers in those regions via Ethereum-based custody.',
  'Nubank is the most important distribution channel for stablecoin adoption in LatAm retail; practitioners should track product rollouts (e.g. USDC yield, B3 integrations) as leading indicators of LatAm on-chain penetration.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('mercadopago', NULL, 19,
  'Mercado Libre, Inc.',
  'https://www.mercadopago.com',
  'Mercado Pago is the payments arm of Mercado Libre and a primary e-commerce and P2P rail across Latin America, offering native crypto trading and stablecoin custody inside its consumer app and embedding Ethereum-based settlement into regional commerce flows.',
  'Mercado Pago fits Regional Payment Networks as a LatAm-native payment rail where stablecoin and Ethereum integration is used to serve a concrete geographic corridor (Argentina, Brazil, Mexico, Chile) that other global networks underserve.',
  'Mercado Pago''s structural advantage is distribution, not product: practitioners should monitor stablecoin balances and pass-through volumes as a proxy for organic LatAm demand independent of MELI e-commerce activity.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('lemon', NULL, 19,
  'Lemon Cash',
  'https://www.lemon.me',
  'Lemon Cash is an Argentine crypto super-app used widely as a primary USD hedge by local consumers, with USDT functioning as a de facto unit of account on top of peso-denominated income and payments.',
  'Lemon is a Regional Payment Network because its architecture is explicitly tied to the Argentine FX regime, and Ethereum (via USDT and other stablecoins) is the materially enabling layer for dollar savings and payments in-country.',
  'Lemon is a prime example of stablecoin-as-savings in a high-inflation jurisdiction; practitioners should evaluate its resilience in scenarios where Argentine FX controls tighten or loosen meaningfully.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('grab', NULL, 19,
  'Grab Holdings Limited',
  'https://www.grab.com/sg/finance',
  'Grab Financial is the financial-services arm of Southeast Asia super-app Grab, layering wallets, cross-border transfers, and evolving stablecoin distribution on top of a ride-hail and delivery user base of 180M+ across SEA.',
  'Grab Financial qualifies as a Regional Payment Network because it is deliberately constrained to SEA markets and is an increasingly credible endpoint for Ethereum-based stablecoin corridors into the region''s consumer and SMB economy.',
  'Grab''s crypto surface is earlier-stage than Nubank or Mercado Pago but benefits from super-app distribution; practitioners should monitor regulatory partnerships (MAS) and stablecoin product launches as leading signals.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('aza', NULL, 19,
  'AZA Group Ltd. (BitPesa)',
  'https://azafinance.com',
  'AZA Finance (formerly BitPesa) is an African B2B cross-border payments platform that uses crypto and stablecoins on Ethereum as an intermediate settlement layer to move value between African currencies and major global counterparties.',
  'AZA belongs in Regional Payment Networks because its operational focus is B2B African corridors, with Ethereum acting as the settlement layer that makes those corridors commercially viable against traditional correspondent banking costs.',
  'AZA is less consumer-visible than M-Pesa but important for institutional African flow; practitioners should benchmark its corridor coverage, FX spreads, and compliance posture against regional banks and global stablecoin issuers.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true),
('cedar', NULL, 19,
  'Cedar, Inc.',
  'https://cedar.money',
  'Cedar is a MENA-focused stablecoin payments infrastructure provider that uses Ethereum as its settlement rail to move USD-denominated value between the U.S., the Middle East, and adjacent emerging markets for SMB and enterprise corridors.',
  'Cedar fits Regional Payment Networks because geographic focus on MENA is a hard design constraint of its rail, and Ethereum-based stablecoin settlement is the core mechanism enabling cross-border value transfer within and out of that region.',
  'Cedar is an emerging entrant worth tracking as a bellwether for MENA stablecoin adoption; practitioners should pay close attention to licensing progress in UAE and Saudi as a proxy for viability.',
  'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes',
  true);

-- =========================================================================
-- 6) Insert On-Ramp / Institutional Rails / Regional Networks classifications
-- =========================================================================
INSERT INTO public.entity_classifications (
  entity_id, subsector_id, maintaining_organization, website,
  description, reason_for_inclusion, practitioners_note,
  practitioner_validation_check, is_primary
)
SELECT
  COALESCE(c.explicit_entity_id, i.entity_id) AS entity_id,
  c.subsector_id,
  c.maintaining_organization,
  c.website,
  c.description,
  c.reason_for_inclusion,
  c.practitioners_note,
  c.practitioner_validation_check,
  c.is_primary
FROM m2_new_classifications c
LEFT JOIN m2_inserted i ON i.natural_key = c.natural_key
WHERE COALESCE(c.explicit_entity_id, i.entity_id) IS NOT NULL;

-- =========================================================================
-- 7) Enrich existing Chipper row (entity_id 383) — rename + fill master data
-- =========================================================================
UPDATE public.entities
SET entity_name      = 'Chipper Cash',
    canonical_website= 'https://chippercash.com',
    logo_url         = 'https://logo.clearbit.com/chippercash.com',
    year_founded     = 2018,
    hq_location      = 'San Francisco, USA / Lagos, Nigeria',
    funding_stage    = 'Series C',
    tags             = ARRAY['p2p','africa','remittance','fintech']::text[],
    long_description = 'Chipper Cash is a pan-African P2P payments app enabling cross-border transfers, bill payments, and stablecoin-denominated balances across multiple African markets, using crypto rails to bridge currency corridors historically served by correspondent banking.',
    status           = 'active',
    updated_at       = now()
WHERE entity_id = 383
  AND entity_name = 'Chipper';

-- Enrich Chipper''s existing Regional Payment Networks classification (if present and blank)
UPDATE public.entity_classifications ec
SET maintaining_organization = COALESCE(NULLIF(ec.maintaining_organization, ''), 'Chipper Inc.'),
    website                  = COALESCE(NULLIF(ec.website, ''), 'https://chippercash.com'),
    description              = COALESCE(NULLIF(ec.description, ''),
      'Chipper Cash is a pan-African P2P payments app enabling cross-border transfers, bill payments, and stablecoin balances across Nigeria, Ghana, Kenya, Uganda, South Africa and other African markets.'),
    reason_for_inclusion     = COALESCE(NULLIF(ec.reason_for_inclusion, ''),
      'Chipper Cash belongs in Regional Payment Networks because its operating perimeter is intentionally African, with stablecoin and Ethereum rails materially enabling cheap cross-border settlement inside and out of the continent.'),
    practitioners_note       = COALESCE(NULLIF(ec.practitioners_note, ''),
      'Practitioners should model Chipper primarily as a distribution layer for stablecoin-based remittances into Africa; underwriting is as much about licensing and banking partners as about product quality.'),
    practitioner_validation_check = COALESCE(NULLIF(ec.practitioner_validation_check, ''),
      'Is geographic focus a hard design constraint of the payment network, and does Ethereum materially enable settlement within that region? Yes'),
    updated_at               = now()
WHERE ec.entity_id = 383
  AND ec.subsector_id = 19;

-- =========================================================================
-- 8) Enrich existing BUIDL entity (entity_id 423) master data
-- =========================================================================
UPDATE public.entities
SET canonical_website = COALESCE(canonical_website, 'https://securitize.io/primary-market/blackrock-buidl'),
    logo_url          = COALESCE(logo_url, 'https://logo.clearbit.com/blackrock.com'),
    year_founded      = COALESCE(year_founded, 2024),
    hq_location       = COALESCE(hq_location, 'New York, USA'),
    funding_stage     = COALESCE(funding_stage, 'Institutional product'),
    token_symbol      = COALESCE(token_symbol, 'BUIDL'),
    tags              = COALESCE(tags, ARRAY['rwa','stablecoin','institutional','tokenized-treasury']::text[]),
    long_description  = COALESCE(long_description,
      'BUIDL is BlackRock''s tokenized USD Institutional Digital Liquidity Fund issued via Securitize on Ethereum, with reserves in U.S. Treasuries, cash, and repurchase agreements, and NAV targeting one dollar per share.'),
    status            = COALESCE(status, 'active'),
    updated_at        = now()
WHERE entity_id = 423;

COMMIT;
