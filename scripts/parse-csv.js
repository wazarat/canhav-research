const fs = require('fs');

// Proper CSV parser that handles quoted fields
function parseCSV(content) {
  const rows = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

// Canonical sector names
const VALID_SECTORS = new Set([
  'Core Protocol Architecture',
  'Rollup & Scaling Frameworks',
  'Monetary & Access Rails',
  'DeFi Systems Architecture',
  'Data & Consensus Infrastructure',
  'Advanced Compute & Integration',
  'Governance & Enterprise Framework',
]);

// Map CSV sector values to canonical names
const SECTOR_MAP = {
  'DeFi Systems & Architecture': 'DeFi Systems Architecture',
  'DeFi Systems Architecture': 'DeFi Systems Architecture',
  'Core Protocol Architecture': 'Core Protocol Architecture',
  'Rollup & Scaling Frameworks': 'Rollup & Scaling Frameworks',
  'Monetary & Access Rails': 'Monetary & Access Rails',
  'Data & Consensus Infrastructure': 'Data & Consensus Infrastructure',
  'Advanced Compute & Integration': 'Advanced Compute & Integration',
  'Governance & Enterprise Framework': 'Governance & Enterprise Framework',
};

// Read the CSV file
const csvContent = fs.readFileSync('public/data/companiesv1.csv', 'utf-8');
const rows = parseCSV(csvContent);

// Skip header and parse data
const companies = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (row.length < 3) continue;

  const entity = row[0].replace(/^["']|["']$/g, '').trim();
  const rawSector = row[1].replace(/^["']|["']$/g, '').trim();
  const subsector = row[2].replace(/^["']|["']$/g, '').trim();

  const sector = SECTOR_MAP[rawSector];

  if (!entity || !sector || !subsector) continue;
  if (!VALID_SECTORS.has(sector)) continue;

  companies.push({ name: entity, sector, subsector });
}

// Generate TypeScript file
const tsContent = `// Auto-generated from companiesv1.csv
export interface Company {
  name: string
  sector: string
  subsector: string
}

export const companiesData: Company[] = ${JSON.stringify(companies, null, 2)}

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
`;

// Write to file
fs.writeFileSync('lib/companiesData.ts', tsContent);
console.log(`✅ Generated lib/companiesData.ts with ${companies.length} companies`);
