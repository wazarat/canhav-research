# Market Map Data Management Guide

## 📍 Where is the Data Stored?

All market map data is stored in a single TypeScript file:
**`lib/companiesData.ts`**

This file contains:
- The `Company` interface (defines what fields each company can have)
- The `companiesData` array (all company records)
- Helper functions for filtering and organizing data

---

## 🏗️ Current Data Structure

Each company in the market map has these **standard columns** (fields):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Company name |
| `sector` | string | ✅ Yes | Major sector (e.g., "DeFi Systems Architecture") |
| `subsector` | string | ✅ Yes | Specific subsector (e.g., "Lending Markets") |
| `website` | string | ❌ Optional | Company website URL |
| `description` | string | ❌ Optional | Brief description |
| `logo` | string | ❌ Optional | Logo image URL |
| `tags` | string[] | ❌ Optional | Category tags for filtering |
| `yearFounded` | number | ❌ Optional | Year company was founded |
| `fundingStage` | string | ❌ Optional | Investment stage (Seed, Series A, etc.) |
| `teamSize` | string | ❌ Optional | Team size range |
| `headquarters` | string | ❌ Optional | Company location |

---

## ➕ How to Add a New Company

1. Open `lib/companiesData.ts`
2. Find the `companiesData` array
3. Add a new company object:

```typescript
export const companiesData: Company[] = [
  // ... existing companies ...
  
  // Add your new company here
  { 
    name: "New Company Name",
    sector: "DeFi Systems Architecture",
    subsector: "Lending Markets",
    website: "https://newcompany.com",
    description: "Brief description of what they do",
    tags: ["DeFi", "Lending", "Protocol"],
    yearFounded: 2024,
    fundingStage: "Series A",
    teamSize: "10-50",
    headquarters: "New York, NY"
  },
]
```

**Tips:**
- Use existing sector/subsector names for consistency
- Add tags that help with filtering
- All fields except `name`, `sector`, and `subsector` are optional

---

## ➖ How to Remove a Company

1. Open `lib/companiesData.ts`
2. Find the company in the `companiesData` array
3. Delete the entire company object (including the comma)

```typescript
// DELETE THIS ENTIRE LINE:
{ name: "Company to Remove", sector: "...", subsector: "..." },
```

---

## 🔧 How to Add Custom Columns (New Fields)

To add new standard columns that will be available for all companies:

### Step 1: Update the Company Interface

Open `lib/companiesData.ts` and modify the `Company` interface:

```typescript
export interface Company {
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
  
  // ADD YOUR NEW FIELDS HERE:
  revenue?: string              // e.g., "$1M-$10M"
  employeeCount?: number        // e.g., 25
  mainProduct?: string          // e.g., "Lending Protocol"
  twitter?: string              // e.g., "https://twitter.com/company"
  linkedin?: string             // e.g., "https://linkedin.com/company/..."
  isPublic?: boolean            // e.g., true or false
  marketCap?: string            // e.g., "$100M"
  // ... add any other fields you need
}
```

### Step 2: Add Data to Companies

Now you can add these new fields to any company:

```typescript
{ 
  name: "Aave",
  sector: "DeFi Systems Architecture",
  subsector: "Lending Markets",
  website: "https://aave.com",
  description: "Decentralized lending protocol",
  
  // NEW CUSTOM FIELDS:
  revenue: "$10M-$50M",
  employeeCount: 75,
  mainProduct: "Lending Protocol",
  twitter: "https://twitter.com/aave",
  isPublic: false,
  marketCap: "$500M"
},
```

### Step 3: Display New Fields in the UI

To show your new fields in the company detail modal, edit `components/CompanyDetailModal.tsx`:

```typescript
{company.revenue && (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenue</h3>
    <p className="text-gray-900">{company.revenue}</p>
  </div>
)}

{company.employeeCount && (
  <div>
    <h3 className="text-sm font-semibold text-gray-700 mb-1">Employees</h3>
    <p className="text-gray-900">{company.employeeCount}</p>
  </div>
)}
```

---

## 📂 How to Manage Sectors & Subsectors

### Current Sectors:
1. Core Protocol Architecture
2. Rollup & Scaling Frameworks
3. Monetary & Access Rails
4. DeFi Systems Architecture
5. Data & Consensus Infrastructure
6. Advanced Compute & Integration
7. Governance & Enterprise Framework

### Adding a New Sector:

Just use a new sector name when adding companies:

```typescript
{ 
  name: "New Company",
  sector: "Your New Sector Name",  // New sector!
  subsector: "Your Subsector",
  // ... other fields
},
```

The system automatically detects all unique sectors and subsectors.

### Adding a New Subsector:

Simply use a new subsector name within an existing sector:

```typescript
{ 
  name: "New Company",
  sector: "DeFi Systems Architecture",  // Existing sector
  subsector: "Your New Subsector",      // New subsector!
  // ... other fields
},
```

---

## 🎨 Customizing Subsector Display

Each subsector automatically gets:
- A color-coded indicator dot
- Filtering capability
- Grouping in "Grouped View" mode

The colors are assigned automatically based on the sector. You can customize colors in `components/MarketMap.tsx` by modifying the `sectorColors` array.

---

## 💾 Alternative: Using a Database (Future Enhancement)

Currently, data is stored in a TypeScript file. For easier management, you could migrate to:

### Option 1: JSON File
- Store data in `data/companies.json`
- Easier to edit without TypeScript knowledge
- Can be updated via API

### Option 2: Database (Supabase)
- Already have Supabase installed
- Create a `companies` table
- Add/edit/delete via admin panel or API
- Real-time updates

### Option 3: CMS (Content Management System)
- Use a headless CMS like Contentful or Strapi
- Non-technical team members can manage data
- Version control and workflows

---

## 🚀 Quick Reference: Common Tasks

### Add a company:
1. Open `lib/companiesData.ts`
2. Add object to `companiesData` array
3. Save file (changes appear immediately in dev mode)

### Remove a company:
1. Open `lib/companiesData.ts`
2. Delete the company object
3. Save file

### Add a new field to all companies:
1. Update `Company` interface in `lib/companiesData.ts`
2. Add field to company objects (optional)
3. Update `CompanyDetailModal.tsx` to display it

### Change sector/subsector names:
1. Find all companies with that sector/subsector
2. Update the name consistently across all
3. Save file

---

## 📝 Example: Complete Company Entry

```typescript
{ 
  name: "Example Protocol",
  sector: "DeFi Systems Architecture",
  subsector: "Lending Markets",
  website: "https://example.com",
  description: "Decentralized lending protocol for digital assets",
  logo: "/logos/example.png",
  tags: ["DeFi", "Lending", "Ethereum", "Protocol"],
  yearFounded: 2021,
  fundingStage: "Series B",
  teamSize: "50-100",
  headquarters: "San Francisco, CA",
  
  // Custom fields (if you added them):
  revenue: "$10M-$50M",
  employeeCount: 75,
  twitter: "https://twitter.com/example",
  linkedin: "https://linkedin.com/company/example"
},
```

---

## ⚠️ Important Notes

1. **Always use consistent sector/subsector names** - Typos create duplicate categories
2. **Required fields**: `name`, `sector`, `subsector` must always be provided
3. **Tags are powerful**: Use them for advanced filtering
4. **Changes are immediate**: In dev mode (`npm run dev`), saving the file updates the UI
5. **Commit changes**: Remember to `git add`, `git commit`, and `git push` after updates

---

## 🆘 Need Help?

- **File location**: `lib/companiesData.ts`
- **UI component**: `components/MarketMap.tsx`
- **Detail modal**: `components/CompanyDetailModal.tsx`
- **Current company count**: 134+ companies
- **Current sectors**: 7 major sectors
