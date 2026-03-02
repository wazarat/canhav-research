import { supabase } from './supabase'

// Company interface matching the database schema
export interface Company {
  id?: string
  name: string
  sector: string
  subsector: string
  website?: string
  description?: string
  logo?: string
  tags?: string[]
  yearFounded?: number
  fundingStage?: 'Seed' | 'Series A' | 'Series B' | 'Series C+' | 'Public' | 'Protocol'
  teamSize?: string
  headquarters?: string
  created_at?: string
  updated_at?: string
}

// Database type (snake_case for Supabase)
export interface CompanyDB {
  id?: string
  name: string
  sector: string
  subsector: string
  website?: string
  description?: string
  logo?: string
  tags?: string[]
  year_founded?: number
  funding_stage?: string
  team_size?: string
  headquarters?: string
  created_at?: string
  updated_at?: string
}

// Convert database format to app format
function dbToCompany(db: CompanyDB): Company {
  return {
    id: db.id,
    name: db.name,
    sector: db.sector,
    subsector: db.subsector,
    website: db.website,
    description: db.description,
    logo: db.logo,
    tags: db.tags,
    yearFounded: db.year_founded,
    fundingStage: db.funding_stage as Company['fundingStage'],
    teamSize: db.team_size,
    headquarters: db.headquarters,
    created_at: db.created_at,
    updated_at: db.updated_at,
  }
}

// Convert app format to database format
function companyToDb(company: Company): Partial<CompanyDB> {
  return {
    name: company.name,
    sector: company.sector,
    subsector: company.subsector,
    website: company.website,
    description: company.description,
    logo: company.logo,
    tags: company.tags,
    year_founded: company.yearFounded,
    funding_stage: company.fundingStage,
    team_size: company.teamSize,
    headquarters: company.headquarters,
  }
}

// Fetch all companies from Supabase
export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching companies:', error)
    return []
  }

  return (data as CompanyDB[]).map(dbToCompany)
}

// Get companies by sector
export async function getCompaniesBySector(sector: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('sector', sector)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching companies by sector:', error)
    return []
  }

  return (data as CompanyDB[]).map(dbToCompany)
}

// Get companies by subsector
export async function getCompaniesBySubsector(sector: string, subsector: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('sector', sector)
    .eq('subsector', subsector)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching companies by subsector:', error)
    return []
  }

  return (data as CompanyDB[]).map(dbToCompany)
}

// Get all unique sectors
export async function getAllSectors(): Promise<string[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('sector')

  if (error) {
    console.error('Error fetching sectors:', error)
    return []
  }

  const sectors = new Set((data as CompanyDB[]).map(c => c.sector))
  return Array.from(sectors).sort()
}

// Get subsectors for a specific sector
export async function getSubsectorsBySector(sector: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('subsector')
    .eq('sector', sector)

  if (error) {
    console.error('Error fetching subsectors:', error)
    return []
  }

  const subsectors = new Set((data as CompanyDB[]).map(c => c.subsector))
  return Array.from(subsectors).sort()
}

// Add a new company
export async function addCompany(company: Company): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .insert([companyToDb(company)])
    .select()
    .single()

  if (error) {
    console.error('Error adding company:', error)
    return null
  }

  return dbToCompany(data as CompanyDB)
}

// Update a company
export async function updateCompany(id: string, company: Partial<Company>): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .update(companyToDb(company as Company))
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating company:', error)
    return null
  }

  return dbToCompany(data as CompanyDB)
}

// Delete a company
export async function deleteCompany(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting company:', error)
    return false
  }

  return true
}

// Search companies by name or description
export async function searchCompanies(query: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,subsector.ilike.%${query}%`)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error searching companies:', error)
    return []
  }

  return (data as CompanyDB[]).map(dbToCompany)
}
