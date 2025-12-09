// Individual companies data for the market map
export interface Company {
  name: string
  sector: string
  subsector: string
  website?: string
  description?: string
  logo?: string
}

export const companiesData: Company[] = [
  // Core Protocol Architecture - Consensus Layer
  { name: "Beacon Chain", sector: "Core Protocol Architecture", subsector: "Consensus Layer", website: "https://ethereum.org" },
  { name: "Prysm", sector: "Core Protocol Architecture", subsector: "Consensus Layer", website: "https://prysmaticlabs.com" },
  { name: "Lighthouse", sector: "Core Protocol Architecture", subsector: "Consensus Layer", website: "https://lighthouse.sigmaprime.io" },
  { name: "Teku", sector: "Core Protocol Architecture", subsector: "Consensus Layer", website: "https://consensys.net/knowledge-base/ethereum-2/teku" },
  { name: "Nimbus", sector: "Core Protocol Architecture", subsector: "Consensus Layer", website: "https://nimbus.team" },

  // Core Protocol Architecture - Execution Layer
  { name: "Geth", sector: "Core Protocol Architecture", subsector: "Execution Layer", website: "https://geth.ethereum.org" },
  { name: "Nethermind", sector: "Core Protocol Architecture", subsector: "Execution Layer", website: "https://nethermind.io" },
  { name: "Erigon", sector: "Core Protocol Architecture", subsector: "Execution Layer", website: "https://github.com/ledgerwatch/erigon" },
  { name: "Besu", sector: "Core Protocol Architecture", subsector: "Execution Layer", website: "https://besu.hyperledger.org" },
  { name: "Reth", sector: "Core Protocol Architecture", subsector: "Execution Layer", website: "https://github.com/paradigmxyz/reth" },

  // Core Protocol Architecture - Validators & Staking Providers
  { name: "Lido", sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", website: "https://lido.fi" },
  { name: "Rocket Pool", sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", website: "https://rocketpool.net" },
  { name: "StakeWise", sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", website: "https://stakewise.io" },
  { name: "Kiln", sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", website: "https://kiln.fi" },
  { name: "Puffer Finance", sector: "Core Protocol Architecture", subsector: "Validators & Staking Providers", website: "https://puffer.fi" },

  // Core Protocol Architecture - MEV & Block Builders
  { name: "Flashbots", sector: "Core Protocol Architecture", subsector: "MEV & Block Builders", website: "https://flashbots.net" },
  { name: "Blocknative", sector: "Core Protocol Architecture", subsector: "MEV & Block Builders", website: "https://blocknative.com" },
  { name: "Eden Network", sector: "Core Protocol Architecture", subsector: "MEV & Block Builders", website: "https://edennetwork.io" },

  // Rollup & Scaling Frameworks - Optimistic Rollups
  { name: "Arbitrum", sector: "Rollup & Scaling Frameworks", subsector: "Optimistic Rollups", website: "https://arbitrum.io" },
  { name: "Optimism", sector: "Rollup & Scaling Frameworks", subsector: "Optimistic Rollups", website: "https://optimism.io" },
  { name: "Base", sector: "Rollup & Scaling Frameworks", subsector: "Optimistic Rollups", website: "https://base.org" },
  { name: "Blast", sector: "Rollup & Scaling Frameworks", subsector: "Optimistic Rollups", website: "https://blast.io" },

  // Rollup & Scaling Frameworks - ZK Rollups
  { name: "zkSync", sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", website: "https://zksync.io" },
  { name: "Starknet", sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", website: "https://starknet.io" },
  { name: "Scroll", sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", website: "https://scroll.io" },
  { name: "Polygon zkEVM", sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", website: "https://polygon.technology/polygon-zkevm" },
  { name: "Linea", sector: "Rollup & Scaling Frameworks", subsector: "ZK Rollups", website: "https://linea.build" },

  // Rollup & Scaling Frameworks - Bridges & Messaging
  { name: "LayerZero", sector: "Rollup & Scaling Frameworks", subsector: "Bridges & Messaging", website: "https://layerzero.network" },
  { name: "Axelar", sector: "Rollup & Scaling Frameworks", subsector: "Bridges & Messaging", website: "https://axelar.network" },
  { name: "Wormhole", sector: "Rollup & Scaling Frameworks", subsector: "Bridges & Messaging", website: "https://wormhole.com" },
  { name: "Synapse", sector: "Rollup & Scaling Frameworks", subsector: "Bridges & Messaging", website: "https://synapseprotocol.com" },

  // Monetary & Access Rails - Centralized Stablecoins
  { name: "USDT", sector: "Monetary & Access Rails", subsector: "Centralized Stablecoins", website: "https://tether.to" },
  { name: "USDC", sector: "Monetary & Access Rails", subsector: "Centralized Stablecoins", website: "https://centre.io" },
  { name: "FDUSD", sector: "Monetary & Access Rails", subsector: "Centralized Stablecoins", website: "https://firstdigitalusd.com" },
  { name: "PYUSD", sector: "Monetary & Access Rails", subsector: "Centralized Stablecoins", website: "https://paypal.com" },

  // Monetary & Access Rails - Decentralized Stablecoins
  { name: "DAI", sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", website: "https://makerdao.com" },
  { name: "LUSD", sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", website: "https://liquity.org" },
  { name: "FRAX", sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", website: "https://frax.finance" },
  { name: "crvUSD", sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", website: "https://crvusd.curve.fi" },
  { name: "GHO", sector: "Monetary & Access Rails", subsector: "Decentralized Stablecoins", website: "https://aave.com" },

  // Monetary & Access Rails - Global On-Ramps
  { name: "MoonPay", sector: "Monetary & Access Rails", subsector: "Global On-Ramps", website: "https://moonpay.com" },
  { name: "Ramp Network", sector: "Monetary & Access Rails", subsector: "Global On-Ramps", website: "https://ramp.network" },
  { name: "Transak", sector: "Monetary & Access Rails", subsector: "Global On-Ramps", website: "https://transak.com" },
  { name: "Banxa", sector: "Monetary & Access Rails", subsector: "Global On-Ramps", website: "https://banxa.com" },

  // DeFi Systems Architecture - Lending Markets
  { name: "Aave", sector: "DeFi Systems Architecture", subsector: "Lending Markets", website: "https://aave.com" },
  { name: "Compound", sector: "DeFi Systems Architecture", subsector: "Lending Markets", website: "https://compound.finance" },
  { name: "Morpho", sector: "DeFi Systems Architecture", subsector: "Lending Markets", website: "https://morpho.org" },
  { name: "Euler", sector: "DeFi Systems Architecture", subsector: "Lending Markets", website: "https://euler.finance" },

  // DeFi Systems Architecture - DEXs & Liquidity Protocols
  { name: "Uniswap", sector: "DeFi Systems Architecture", subsector: "DEXs & Liquidity Protocols", website: "https://uniswap.org" },
  { name: "Curve", sector: "DeFi Systems Architecture", subsector: "DEXs & Liquidity Protocols", website: "https://curve.fi" },
  { name: "Balancer", sector: "DeFi Systems Architecture", subsector: "DEXs & Liquidity Protocols", website: "https://balancer.fi" },
  { name: "Sushi", sector: "DeFi Systems Architecture", subsector: "DEXs & Liquidity Protocols", website: "https://sushi.com" },

  // DeFi Systems Architecture - Liquid Staking Tokens
  { name: "stETH", sector: "DeFi Systems Architecture", subsector: "Liquid Staking Tokens (LSTs)", website: "https://lido.fi" },
  { name: "rETH", sector: "DeFi Systems Architecture", subsector: "Liquid Staking Tokens (LSTs)", website: "https://rocketpool.net" },
  { name: "cbETH", sector: "DeFi Systems Architecture", subsector: "Liquid Staking Tokens (LSTs)", website: "https://coinbase.com" },
  { name: "ankrETH", sector: "DeFi Systems Architecture", subsector: "Liquid Staking Tokens (LSTs)", website: "https://ankr.com" },

  // Data & Consensus Infrastructure - RPC & Node Providers
  { name: "Alchemy", sector: "Data & Consensus Infrastructure", subsector: "RPC & Node Providers", website: "https://alchemy.com" },
  { name: "Infura", sector: "Data & Consensus Infrastructure", subsector: "RPC & Node Providers", website: "https://infura.io" },
  { name: "QuickNode", sector: "Data & Consensus Infrastructure", subsector: "RPC & Node Providers", website: "https://quicknode.com" },
  { name: "Chainstack", sector: "Data & Consensus Infrastructure", subsector: "RPC & Node Providers", website: "https://chainstack.com" },

  // Data & Consensus Infrastructure - Oracles & Data Networks
  { name: "Chainlink", sector: "Data & Consensus Infrastructure", subsector: "Oracles & Data Networks", website: "https://chain.link" },
  { name: "Pyth", sector: "Data & Consensus Infrastructure", subsector: "Oracles & Data Networks", website: "https://pyth.network" },
  { name: "RedStone", sector: "Data & Consensus Infrastructure", subsector: "Oracles & Data Networks", website: "https://redstone.finance" },
  { name: "API3", sector: "Data & Consensus Infrastructure", subsector: "Oracles & Data Networks", website: "https://api3.org" },

  // Data & Consensus Infrastructure - Analytics & Intelligence
  { name: "Dune", sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", website: "https://dune.com" },
  { name: "Nansen", sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", website: "https://nansen.ai" },
  { name: "Arkham", sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", website: "https://arkham.intel" },
  { name: "Token Terminal", sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", website: "https://tokenterminal.com" },
  { name: "Glassnode", sector: "Data & Consensus Infrastructure", subsector: "Analytics & Intelligence", website: "https://glassnode.com" },

  // Advanced Compute & Integration - Real-World Assets
  { name: "Centrifuge", sector: "Advanced Compute & Integration", subsector: "Real-World Assets (RWAs)", website: "https://centrifuge.io" },
  { name: "Ondo", sector: "Advanced Compute & Integration", subsector: "Real-World Assets (RWAs)", website: "https://ondo.finance" },
  { name: "Maple", sector: "Advanced Compute & Integration", subsector: "Real-World Assets (RWAs)", website: "https://maple.finance" },
  { name: "Superstate", sector: "Advanced Compute & Integration", subsector: "Real-World Assets (RWAs)", website: "https://superstate.co" },

  // Advanced Compute & Integration - Identity & Social Graphs
  { name: "ENS", sector: "Advanced Compute & Integration", subsector: "Identity & Social Graphs", website: "https://ens.domains" },
  { name: "Lens Protocol", sector: "Advanced Compute & Integration", subsector: "Identity & Social Graphs", website: "https://lens.xyz" },
  { name: "Farcaster", sector: "Advanced Compute & Integration", subsector: "Identity & Social Graphs", website: "https://farcaster.xyz" },

  // Governance & Enterprise Framework - DAO Governance Systems
  { name: "Aragon", sector: "Governance & Enterprise Framework", subsector: "DAO Governance Systems", website: "https://aragon.org" },
  { name: "Tally", sector: "Governance & Enterprise Framework", subsector: "DAO Governance Systems", website: "https://tally.xyz" },
  { name: "Snapshot", sector: "Governance & Enterprise Framework", subsector: "DAO Governance Systems", website: "https://snapshot.org" },
  { name: "Safe", sector: "Governance & Enterprise Framework", subsector: "DAO Governance Systems", website: "https://safe.global" },

  // Governance & Enterprise Framework - Institutional Custody & Security
  { name: "Fireblocks", sector: "Governance & Enterprise Framework", subsector: "Institutional Custody & Security", website: "https://fireblocks.com" },
  { name: "Copper", sector: "Governance & Enterprise Framework", subsector: "Institutional Custody & Security", website: "https://copper.co" },
  { name: "Anchorage", sector: "Governance & Enterprise Framework", subsector: "Institutional Custody & Security", website: "https://anchorage.com" },
  { name: "BitGo", sector: "Governance & Enterprise Framework", subsector: "Institutional Custody & Security", website: "https://bitgo.com" }
]

export function getCompaniesBySector(sector: string): Company[] {
  return companiesData.filter(company => company.sector === sector)
}

export function getCompaniesBySubsector(sector: string, subsector: string): Company[] {
  return companiesData.filter(company => 
    company.sector === sector && company.subsector === subsector
  )
}

export function getAllSectors(): string[] {
  const sectors = new Set(companiesData.map(company => company.sector))
  return Array.from(sectors).sort()
}

export function getSubsectorsBySector(sector: string): string[] {
  const subsectors = new Set(
    companiesData
      .filter(company => company.sector === sector)
      .map(company => company.subsector)
  )
  return Array.from(subsectors).sort()
}
