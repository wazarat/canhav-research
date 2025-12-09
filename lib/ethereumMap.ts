import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export interface MarketMapItem {
  sector: string
  subsector: string
  definition: string
  examples: string
}

export interface GroupedMarketMap {
  [sector: string]: MarketMapItem[]
}

export function loadMarketMapData(): MarketMapItem[] {
  const csvPath = path.join(process.cwd(), 'data', 'ethereum-market-map.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  return records.map((record: any) => ({
    sector: record.Sector,
    subsector: record.Subsector,
    definition: record.Definition,
    examples: record.Examples
  }))
}

export function groupBySector(data: MarketMapItem[]): GroupedMarketMap {
  return data.reduce((acc, item) => {
    if (!acc[item.sector]) {
      acc[item.sector] = []
    }
    acc[item.sector].push(item)
    return acc
  }, {} as GroupedMarketMap)
}

export function getUniqueSectors(data: MarketMapItem[]): string[] {
  const sectors = new Set(data.map(item => item.sector))
  return Array.from(sectors).sort()
}

export function getSubsectorsBySector(data: MarketMapItem[], sector: string): string[] {
  return data
    .filter(item => item.sector === sector)
    .map(item => item.subsector)
    .sort()
}

// Generate static data for client-side use
export function generateStaticMarketMapData() {
  try {
    const data = loadMarketMapData()
    const grouped = groupBySector(data)
    const sectors = getUniqueSectors(data)
    
    return {
      data,
      grouped,
      sectors
    }
  } catch (error) {
    console.error('Error loading market map data:', error)
    return {
      data: [],
      grouped: {},
      sectors: []
    }
  }
}
