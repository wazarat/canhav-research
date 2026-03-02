# Quick Example: Adding Your Own Company

## Step-by-Step Guide

### 1. Open the Data File
Navigate to: `lib/companiesData.ts`

### 2. Find the companiesData Array
Look for this section (around line 16):

```typescript
export const companiesData: Company[] = [
  // Companies are listed here
```

### 3. Add Your Company
Scroll to the bottom of the array (before the closing `]`) and add:

```typescript
  // YOUR CUSTOM COMPANIES - Add them here
  { 
    name: "My New Company",
    sector: "DeFi Systems Architecture",
    subsector: "Lending Markets",
    website: "https://mynewcompany.com",
    description: "Revolutionary DeFi lending protocol",
    tags: ["DeFi", "Lending", "Innovation"],
    yearFounded: 2024,
    fundingStage: "Seed",
    teamSize: "1-10",
    headquarters: "Remote"
  },
```

### 4. Save the File
Press `Cmd+S` (Mac) or `Ctrl+S` (Windows)

### 5. See Your Changes
If the dev server is running (`npm run dev`), your company will appear immediately at http://localhost:3000/market-map

---

## Example: Adding Multiple Companies at Once

```typescript
export const companiesData: Company[] = [
  // ... existing companies ...
  
  // YOUR COMPANIES START HERE
  { 
    name: "Company One",
    sector: "DeFi Systems Architecture",
    subsector: "Lending Markets",
    website: "https://company1.com",
    description: "First company description",
    tags: ["DeFi", "Lending"],
    yearFounded: 2023
  },
  { 
    name: "Company Two",
    sector: "Rollup & Scaling Frameworks",
    subsector: "ZK Rollups",
    website: "https://company2.com",
    description: "Second company description",
    tags: ["ZK", "Scaling"],
    yearFounded: 2024
  },
  { 
    name: "Company Three",
    sector: "Data & Consensus Infrastructure",
    subsector: "RPC & Node Providers",
    website: "https://company3.com",
    description: "Third company description",
    tags: ["Infrastructure", "Nodes"],
    yearFounded: 2022
  },
]
```

---

## Example: Creating a New Sector & Subsector

```typescript
  // NEW SECTOR: AI & Machine Learning
  { 
    name: "AI Protocol",
    sector: "AI & Machine Learning",           // NEW SECTOR
    subsector: "On-Chain AI Models",           // NEW SUBSECTOR
    website: "https://aiprotocol.com",
    description: "Decentralized AI inference",
    tags: ["AI", "ML", "Protocol"],
    yearFounded: 2024,
    fundingStage: "Series A"
  },
  { 
    name: "ML Network",
    sector: "AI & Machine Learning",           // SAME NEW SECTOR
    subsector: "Training Infrastructure",      // ANOTHER NEW SUBSECTOR
    website: "https://mlnetwork.com",
    description: "Distributed ML training",
    tags: ["AI", "Training", "Infrastructure"],
    yearFounded: 2023
  },
```

The system will automatically:
- Create the new sector "AI & Machine Learning"
- Add it to the filter buttons
- Assign it a color
- Create the subsectors under it

---

## Common Mistakes to Avoid

### ❌ Wrong: Missing Comma
```typescript
  { name: "Company A", sector: "...", subsector: "..." }  // Missing comma!
  { name: "Company B", sector: "...", subsector: "..." },
```

### ✅ Correct: Always Add Comma
```typescript
  { name: "Company A", sector: "...", subsector: "..." },  // Comma here
  { name: "Company B", sector: "...", subsector: "..." },  // And here
```

### ❌ Wrong: Inconsistent Sector Names
```typescript
  { name: "Company A", sector: "DeFi Systems", subsector: "..." },
  { name: "Company B", sector: "DeFi Systems Architecture", subsector: "..." },
  // These will create TWO different sectors!
```

### ✅ Correct: Exact Same Names
```typescript
  { name: "Company A", sector: "DeFi Systems Architecture", subsector: "..." },
  { name: "Company B", sector: "DeFi Systems Architecture", subsector: "..." },
  // Both in the same sector
```

---

## Minimal Company Entry (Only Required Fields)

If you just want to add a company quickly:

```typescript
  { 
    name: "Quick Company",
    sector: "DeFi Systems Architecture",
    subsector: "Lending Markets"
  },
```

That's it! Everything else is optional.

---

## Full Company Entry (All Fields)

For maximum information:

```typescript
  { 
    name: "Full Featured Company",
    sector: "DeFi Systems Architecture",
    subsector: "Lending Markets",
    website: "https://fullcompany.com",
    description: "Complete description of what this company does and why it matters",
    logo: "/logos/fullcompany.png",
    tags: ["DeFi", "Lending", "Ethereum", "Protocol", "Innovation"],
    yearFounded: 2021,
    fundingStage: "Series B",
    teamSize: "50-100",
    headquarters: "San Francisco, CA"
  },
```
