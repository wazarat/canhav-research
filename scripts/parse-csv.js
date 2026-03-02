const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('public/data/companiesv1.csv', 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

// Skip header and parse data
const companies = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Simple CSV parsing - split by comma
  const parts = line.split(',');
  
  if (parts.length >= 3) {
    const entity = parts[0].trim();
    const sector = parts[1].trim();
    const subsector = parts[2].trim();
    
    if (entity && sector && subsector) {
      companies.push({
        name: entity,
        sector: sector,
        subsector: subsector
      });
    }
  }
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
