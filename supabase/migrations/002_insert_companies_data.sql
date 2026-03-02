-- Insert all existing market map companies into the database

-- Core Protocol Architecture - Consensus Layer
INSERT INTO companies (name, sector, subsector, website, description, tags, year_founded, funding_stage) VALUES
('Beacon Chain', 'Core Protocol Architecture', 'Consensus Layer', 'https://ethereum.org', 'Ethereum''s proof-of-stake consensus mechanism', ARRAY['PoS', 'Consensus', 'Core'], 2020, 'Protocol'),
('Prysm', 'Core Protocol Architecture', 'Consensus Layer', 'https://prysmaticlabs.com', 'Go implementation of Ethereum consensus client', ARRAY['Client', 'Go', 'Validator'], 2019, 'Protocol'),
('Lighthouse', 'Core Protocol Architecture', 'Consensus Layer', 'https://lighthouse.sigmaprime.io', 'Rust-based Ethereum consensus client', ARRAY['Client', 'Rust', 'Performance'], 2019, 'Protocol'),
('Teku', 'Core Protocol Architecture', 'Consensus Layer', 'https://consensys.net/knowledge-base/ethereum-2/teku', 'Enterprise-grade Java consensus client', ARRAY['Client', 'Java', 'Enterprise'], 2019, 'Protocol'),
('Nimbus', 'Core Protocol Architecture', 'Consensus Layer', 'https://nimbus.team', 'Lightweight consensus client for resource-constrained devices', ARRAY['Client', 'Lightweight', 'Mobile'], 2018, 'Protocol');

-- Core Protocol Architecture - Execution Layer
INSERT INTO companies (name, sector, subsector, website, description, tags, year_founded, funding_stage) VALUES
('Geth', 'Core Protocol Architecture', 'Execution Layer', 'https://geth.ethereum.org', 'Official Go implementation of Ethereum execution client', ARRAY['Client', 'Go', 'EVM'], 2014, 'Protocol'),
('Nethermind', 'Core Protocol Architecture', 'Execution Layer', 'https://nethermind.io', '.NET-based high-performance execution client', ARRAY['Client', '.NET', 'Performance'], 2017, 'Series A'),
('Erigon', 'Core Protocol Architecture', 'Execution Layer', 'https://github.com/ledgerwatch/erigon', 'Efficiency-focused Ethereum implementation', ARRAY['Client', 'Go', 'Efficiency'], 2019, 'Protocol'),
('Besu', 'Core Protocol Architecture', 'Execution Layer', 'https://besu.hyperledger.org', 'Enterprise Java execution client by Hyperledger', ARRAY['Client', 'Java', 'Enterprise'], 2018, 'Protocol'),
('Reth', 'Core Protocol Architecture', 'Execution Layer', 'https://github.com/paradigmxyz/reth', 'Paradigm''s Rust execution client', ARRAY['Client', 'Rust', 'Modular'], 2022, 'Protocol');

-- Core Protocol Architecture - Validators & Staking Providers
INSERT INTO companies (name, sector, subsector, website) VALUES
('Lido', 'Core Protocol Architecture', 'Validators & Staking Providers', 'https://lido.fi'),
('Rocket Pool', 'Core Protocol Architecture', 'Validators & Staking Providers', 'https://rocketpool.net'),
('StakeWise', 'Core Protocol Architecture', 'Validators & Staking Providers', 'https://stakewise.io'),
('Kiln', 'Core Protocol Architecture', 'Validators & Staking Providers', 'https://kiln.fi'),
('Puffer Finance', 'Core Protocol Architecture', 'Validators & Staking Providers', 'https://puffer.fi');

-- Core Protocol Architecture - MEV & Block Builders
INSERT INTO companies (name, sector, subsector, website) VALUES
('Flashbots', 'Core Protocol Architecture', 'MEV & Block Builders', 'https://flashbots.net'),
('Blocknative', 'Core Protocol Architecture', 'MEV & Block Builders', 'https://blocknative.com'),
('Eden Network', 'Core Protocol Architecture', 'MEV & Block Builders', 'https://edennetwork.io');

-- Rollup & Scaling Frameworks - Optimistic Rollups
INSERT INTO companies (name, sector, subsector, website) VALUES
('Arbitrum', 'Rollup & Scaling Frameworks', 'Optimistic Rollups', 'https://arbitrum.io'),
('Optimism', 'Rollup & Scaling Frameworks', 'Optimistic Rollups', 'https://optimism.io'),
('Base', 'Rollup & Scaling Frameworks', 'Optimistic Rollups', 'https://base.org'),
('Blast', 'Rollup & Scaling Frameworks', 'Optimistic Rollups', 'https://blast.io');

-- Rollup & Scaling Frameworks - ZK Rollups
INSERT INTO companies (name, sector, subsector, website) VALUES
('zkSync', 'Rollup & Scaling Frameworks', 'ZK Rollups', 'https://zksync.io'),
('Starknet', 'Rollup & Scaling Frameworks', 'ZK Rollups', 'https://starknet.io'),
('Scroll', 'Rollup & Scaling Frameworks', 'ZK Rollups', 'https://scroll.io'),
('Polygon zkEVM', 'Rollup & Scaling Frameworks', 'ZK Rollups', 'https://polygon.technology/polygon-zkevm'),
('Linea', 'Rollup & Scaling Frameworks', 'ZK Rollups', 'https://linea.build');

-- Rollup & Scaling Frameworks - Bridges & Messaging
INSERT INTO companies (name, sector, subsector, website) VALUES
('LayerZero', 'Rollup & Scaling Frameworks', 'Bridges & Messaging', 'https://layerzero.network'),
('Axelar', 'Rollup & Scaling Frameworks', 'Bridges & Messaging', 'https://axelar.network'),
('Wormhole', 'Rollup & Scaling Frameworks', 'Bridges & Messaging', 'https://wormhole.com'),
('Synapse', 'Rollup & Scaling Frameworks', 'Bridges & Messaging', 'https://synapseprotocol.com');

-- Monetary & Access Rails - Centralized Stablecoins
INSERT INTO companies (name, sector, subsector, website) VALUES
('USDT', 'Monetary & Access Rails', 'Centralized Stablecoins', 'https://tether.to'),
('USDC', 'Monetary & Access Rails', 'Centralized Stablecoins', 'https://centre.io'),
('FDUSD', 'Monetary & Access Rails', 'Centralized Stablecoins', 'https://firstdigitalusd.com'),
('PYUSD', 'Monetary & Access Rails', 'Centralized Stablecoins', 'https://paypal.com');

-- Monetary & Access Rails - Decentralized Stablecoins
INSERT INTO companies (name, sector, subsector, website) VALUES
('DAI', 'Monetary & Access Rails', 'Decentralized Stablecoins', 'https://makerdao.com'),
('LUSD', 'Monetary & Access Rails', 'Decentralized Stablecoins', 'https://liquity.org'),
('FRAX', 'Monetary & Access Rails', 'Decentralized Stablecoins', 'https://frax.finance'),
('crvUSD', 'Monetary & Access Rails', 'Decentralized Stablecoins', 'https://crvusd.curve.fi'),
('GHO', 'Monetary & Access Rails', 'Decentralized Stablecoins', 'https://aave.com');

-- Monetary & Access Rails - Global On-Ramps
INSERT INTO companies (name, sector, subsector, website) VALUES
('MoonPay', 'Monetary & Access Rails', 'Global On-Ramps', 'https://moonpay.com'),
('Ramp Network', 'Monetary & Access Rails', 'Global On-Ramps', 'https://ramp.network'),
('Transak', 'Monetary & Access Rails', 'Global On-Ramps', 'https://transak.com'),
('Banxa', 'Monetary & Access Rails', 'Global On-Ramps', 'https://banxa.com');

-- DeFi Systems Architecture - Lending Markets
INSERT INTO companies (name, sector, subsector, website) VALUES
('Aave', 'DeFi Systems Architecture', 'Lending Markets', 'https://aave.com'),
('Compound', 'DeFi Systems Architecture', 'Lending Markets', 'https://compound.finance'),
('Morpho', 'DeFi Systems Architecture', 'Lending Markets', 'https://morpho.org'),
('Euler', 'DeFi Systems Architecture', 'Lending Markets', 'https://euler.finance');

-- DeFi Systems Architecture - DEXs & Liquidity Protocols
INSERT INTO companies (name, sector, subsector, website) VALUES
('Uniswap', 'DeFi Systems Architecture', 'DEXs & Liquidity Protocols', 'https://uniswap.org'),
('Curve', 'DeFi Systems Architecture', 'DEXs & Liquidity Protocols', 'https://curve.fi'),
('Balancer', 'DeFi Systems Architecture', 'DEXs & Liquidity Protocols', 'https://balancer.fi'),
('Sushi', 'DeFi Systems Architecture', 'DEXs & Liquidity Protocols', 'https://sushi.com');

-- DeFi Systems Architecture - Liquid Staking Tokens
INSERT INTO companies (name, sector, subsector, website) VALUES
('stETH', 'DeFi Systems Architecture', 'Liquid Staking Tokens (LSTs)', 'https://lido.fi'),
('rETH', 'DeFi Systems Architecture', 'Liquid Staking Tokens (LSTs)', 'https://rocketpool.net'),
('cbETH', 'DeFi Systems Architecture', 'Liquid Staking Tokens (LSTs)', 'https://coinbase.com'),
('ankrETH', 'DeFi Systems Architecture', 'Liquid Staking Tokens (LSTs)', 'https://ankr.com');

-- Data & Consensus Infrastructure - RPC & Node Providers
INSERT INTO companies (name, sector, subsector, website) VALUES
('Alchemy', 'Data & Consensus Infrastructure', 'RPC & Node Providers', 'https://alchemy.com'),
('Infura', 'Data & Consensus Infrastructure', 'RPC & Node Providers', 'https://infura.io'),
('QuickNode', 'Data & Consensus Infrastructure', 'RPC & Node Providers', 'https://quicknode.com'),
('Chainstack', 'Data & Consensus Infrastructure', 'RPC & Node Providers', 'https://chainstack.com');

-- Data & Consensus Infrastructure - Oracles & Data Networks
INSERT INTO companies (name, sector, subsector, website) VALUES
('Chainlink', 'Data & Consensus Infrastructure', 'Oracles & Data Networks', 'https://chain.link'),
('Pyth', 'Data & Consensus Infrastructure', 'Oracles & Data Networks', 'https://pyth.network'),
('RedStone', 'Data & Consensus Infrastructure', 'Oracles & Data Networks', 'https://redstone.finance'),
('API3', 'Data & Consensus Infrastructure', 'Oracles & Data Networks', 'https://api3.org');

-- Data & Consensus Infrastructure - Analytics & Intelligence
INSERT INTO companies (name, sector, subsector, website) VALUES
('Dune', 'Data & Consensus Infrastructure', 'Analytics & Intelligence', 'https://dune.com'),
('Nansen', 'Data & Consensus Infrastructure', 'Analytics & Intelligence', 'https://nansen.ai'),
('Arkham', 'Data & Consensus Infrastructure', 'Analytics & Intelligence', 'https://arkham.intel'),
('Token Terminal', 'Data & Consensus Infrastructure', 'Analytics & Intelligence', 'https://tokenterminal.com'),
('Glassnode', 'Data & Consensus Infrastructure', 'Analytics & Intelligence', 'https://glassnode.com');

-- Advanced Compute & Integration - Real-World Assets
INSERT INTO companies (name, sector, subsector, website) VALUES
('Centrifuge', 'Advanced Compute & Integration', 'Real-World Assets (RWAs)', 'https://centrifuge.io'),
('Ondo', 'Advanced Compute & Integration', 'Real-World Assets (RWAs)', 'https://ondo.finance'),
('Maple', 'Advanced Compute & Integration', 'Real-World Assets (RWAs)', 'https://maple.finance'),
('Superstate', 'Advanced Compute & Integration', 'Real-World Assets (RWAs)', 'https://superstate.co');

-- Advanced Compute & Integration - Identity & Social Graphs
INSERT INTO companies (name, sector, subsector, website) VALUES
('ENS', 'Advanced Compute & Integration', 'Identity & Social Graphs', 'https://ens.domains'),
('Lens Protocol', 'Advanced Compute & Integration', 'Identity & Social Graphs', 'https://lens.xyz'),
('Farcaster', 'Advanced Compute & Integration', 'Identity & Social Graphs', 'https://farcaster.xyz');

-- Governance & Enterprise Framework - DAO Governance Systems
INSERT INTO companies (name, sector, subsector, website) VALUES
('Aragon', 'Governance & Enterprise Framework', 'DAO Governance Systems', 'https://aragon.org'),
('Tally', 'Governance & Enterprise Framework', 'DAO Governance Systems', 'https://tally.xyz'),
('Snapshot', 'Governance & Enterprise Framework', 'DAO Governance Systems', 'https://snapshot.org'),
('Safe', 'Governance & Enterprise Framework', 'DAO Governance Systems', 'https://safe.global');

-- Governance & Enterprise Framework - Institutional Custody & Security
INSERT INTO companies (name, sector, subsector, website) VALUES
('Fireblocks', 'Governance & Enterprise Framework', 'Institutional Custody & Security', 'https://fireblocks.com'),
('Copper', 'Governance & Enterprise Framework', 'Institutional Custody & Security', 'https://copper.co'),
('Anchorage', 'Governance & Enterprise Framework', 'Institutional Custody & Security', 'https://anchorage.com'),
('BitGo', 'Governance & Enterprise Framework', 'Institutional Custody & Security', 'https://bitgo.com');
