// Client-side market map data
export const marketMapData = [
  { sector: "Core Protocol Architecture", subsector: "Consensus Layer", definition: "Ethereum's proof-of-stake mechanism securing blocks coordinating validators and finalizing transactions", examples: "Beacon Chain, Prysm, Lighthouse, Teku, Nimbus" },
  { sector: "Core Protocol Architecture", subsector: "Execution Layer", definition: "The computational environment that executes smart contracts and updates network state.", examples: "EVM, Geth, Nethermind, Erigon, Besu, Reth" },
  { sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", definition: "Entities that stake ETH propose and attest blocks and secure the network.", examples: "Lido, Rocket Pool, Ethereum StakeWise, Kiln, Puffer Finance" },
  { sector: "Core Protocol Architecture", subsector: "MEV & Block Builders", definition: "Systems optimizing transaction ordering preventing frontrunning and maximizing network efficiency", examples: "Flashbots, Blocknative, Eden Network" },
  { sector: "Core Protocol Architecture", subsector: "Network Upgrades", definition: "Protocol-level improvements enabling scalability security and performance.", examples: "EIP-4844, Fusaka Upgrade, PeerDAS" },
  
  { sector: "Rollup & Scaling Frameworks", subsector: "Optimistic Rollups", definition: "Scaling systems batching transactions with fraud-proof mechanisms for cheap fast execution.", examples: "Arbitrum, Optimism, Base, Blast, Linchain" },
  { sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", definition: "Rollups verifying transactions with zero-knowledge proofs for high security and instant finality.", examples: "zkSync, Starknet, Scroll, Polygon zkEVM, Linea, Soneium" },
  { sector: "Rollup & Scaling Frameworks", subsector: "L3 & Appchain Frameworks", definition: "Customizable rollup environments allowing applications to run their own sovereign chains.", examples: "OP Stack, Arbitrum Orbit, ZK Stack" },
  { sector: "Rollup & Scaling Frameworks", subsector: "Bridges & Messaging", definition: "Infrastructure enabling cross-chain communication and liquidity flow.", examples: "LayerZero, Axelar, Wormhole, Synapse, Across" },
  { sector: "Rollup & Scaling Frameworks", subsector: "Data Availability Networks", definition: "Layers providing scalable storage and verification for L2 rollups.", examples: "Ethereum DA, EigenDA, Celestia, Avail" },
  
  { sector: "Monetary & Access Rails", subsector: "Centralized Stablecoins", definition: "Fiat-backed digital dollars used for payments collateral and settlement.", examples: "USDT, USDC, FDUSD, PYUSD" },
  { sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", definition: "Crypto-native stablecoins backed by on-chain collateral or algorithmic mechanisms.", examples: "DAI, LUSD, FRAX, crvUSD, GHO" },
  { sector: "Monetary & Access Rails", subsector: "Synthetic & Yield-bearing Dollars", definition: "Stable assets derived through hedging or tokenized yield.", examples: "USDe, sDAI, XSGD, CADC, OXDR" },
  { sector: "Monetary & Access Rails", subsector: "Global On-Ramps", definition: "Gateways for converting fiat into stablecoins or crypto.", examples: "MoonPay, Ramp Network, Transak, Banxa" },
  { sector: "Monetary & Access Rails", subsector: "Institutional Payment Rails", definition: "APIs enabling enterprises and fintechs to integrate stablecoin flows.", examples: "Circle API, Coinbase Pay, Fireblocks Payments" },
  { sector: "Monetary & Access Rails", subsector: "Cross-Border Remittance", definition: "Local fiat access and remittance solutions.", examples: "Overtime, Tether, African mobile-money bridges" },
  
  { sector: "DeFi Systems Architecture", subsector: "Lending Markets", definition: "DeFi credit markets enabling borrowing and lending using crypto collateral.", examples: "Aave, Compound, Morpho, Euler, Silo" },
  { sector: "DeFi Systems Architecture", subsector: "DEXs & Liquidity Protocols", definition: "Decentralized trading venues and liquidity layers enabling permissionless swaps.", examples: "Uniswap, Curve, Balancer, Sushi, Maverick" },
  { sector: "DeFi Systems Architecture", subsector: "Yield & Structured Markets", definition: "Protocols offering fixed/variable yield interest-rate swaps or automated strategies.", examples: "Pendle, Yearn, IPOR, Ribbon+evo" },
  { sector: "DeFi Systems Architecture", subsector: "Liquid Staking Tokens (LSTs)", definition: "Tokenized staked ETH usable as collateral across DeFi.", examples: "stETH, rETH, ankrETH, cbETH" },
  { sector: "DeFi Systems Architecture", subsector: "Restaking Systems", definition: "Using staked ETH to secure external services for additional yield.", examples: "EigenLayer, Karak, Etherfi" },
  { sector: "DeFi Systems Architecture", subsector: "Synthetic & Derivatives", definition: "Protocols offering synthetic assets and decentralized derivatives.", examples: "Synthetix, Ethena, UMA, Lyra" },
  
  { sector: "Data & Consensus Infrastructure", subsector: "RPC & Node Providers", definition: "Services enabling apps and wallets to read/write blockchain data.", examples: "Alchemy, Infura, QuickNode, Chainstack, Ankr, Helius" },
  { sector: "Data & Consensus Infrastructure", subsector: "Oracles & Data Networks", definition: "External data feeds used by smart contracts for pricing proofs and computation.", examples: "Chainlink, Pyth, RedStone, API3" },
  { sector: "Data & Consensus Infrastructure", subsector: "Data Availability Systems", definition: "Networks that store relay data and enable efficient verification.", examples: "Ethereum DA, EigenDA, Celestia, Avail" },
  { sector: "Data & Consensus Infrastructure", subsector: "Indexing & Query Engines", definition: "Tools that turn raw on-chain data into queryable formats.", examples: "The Graph, SubQuery" },
  { sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", definition: "Platforms analyzing wallets flows markets and fundamentals.", examples: "Dune, Nansen, Arkham, Token Terminal, Glassnode" },
  
  { sector: "Advanced Compute & Integration", subsector: "AI Agents & Autonomous Systems", definition: "On-chain agents capable of executing transactions and strategies autonomously.", examples: "Morpheus AI, Fetchai, Bittensor, Ondo" },
  { sector: "Advanced Compute & Integration", subsector: "Real-World Assets (RWAs)", definition: "Tokenized treasuries credit and financial instruments anchored on Ethereum.", examples: "Centrifuge, Ondo, Maple, Superstate" },
  { sector: "Advanced Compute & Integration", subsector: "Identity & Social Graphs", definition: "Decentralized identifiers and social networks built on Ethereum.", examples: "ENS, Lens Protocol, Farcaster" },
  { sector: "Advanced Compute & Integration", subsector: "DePIN Physical Infrastructure", definition: "Decentralized networks for compute storage mapping and wireless.", examples: "Aethir, Akash, Filecoin, Helium, Hivemapper" },
  { sector: "Advanced Compute & Integration", subsector: "Cross-Chain Compute", definition: "Systems enabling verifiable compute for AI and rollups.", examples: "EigenLayer AVS, zkML protocols" },
  
  { sector: "Governance & Enterprise Framework", subsector: "DAO Governance Systems", definition: "Tools governing proposals voting treasuries and multi-sig operations.", examples: "Aragon, Tally, Snapshot, Safe, OZ Defender" },
  { sector: "Governance & Enterprise Framework", subsector: "Enterprise Blockchain Adoption", definition: "Corporate and government platforms using Ethereum for settlement and automation.", examples: "ConsenSys, Polygon Enterprise, EY OpsChaIn" },
  { sector: "Governance & Enterprise Framework", subsector: "CBDCs & Public Sector Pilots", definition: "Government-led digital currency or tokenization initiatives built on Ethereum.", examples: "EU MICA pilots, MAS (Singapore), Brazil CBDC, UAE mBridge" },
  { sector: "Governance & Enterprise Framework", subsector: "Compliance & Regulatory Infrastructure", definition: "Platforms ensuring that institutions can use Ethereum while meeting regulatory APIs.", examples: "Chainalysis, TRM Labs, Notabene, Elliptic" },
  { sector: "Governance & Enterprise Framework", subsector: "Institutional Custody & Security", definition: "Secure MPC and bank-grade custody for institutions.", examples: "Fireblocks, Copper, Anchorage, BitGo" }
]

export function getSubsectorsBySector(sector: string): string[] {
  return marketMapData
    .filter(item => item.sector === sector)
    .map(item => item.subsector)
    .sort()
}
