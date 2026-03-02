# Database Schema Design for Multi-Level Columns

## 🎯 Requirements

You need a database structure that supports:
1. **Common columns** - Apply to ALL companies (name, website, etc.)
2. **Sector-specific columns** - Only for companies in specific sectors
3. **Subsector-specific columns** - Only for companies in specific subsectors

---

## 🏗️ Three Recommended Approaches

### **Approach 1: JSONB Columns (RECOMMENDED)**

**Best for**: Flexibility, easy to add new fields, no schema changes needed

#### Schema Design:
```sql
companies
├── id (UUID)
├── name (TEXT) ← Common
├── sector (TEXT) ← Common
├── subsector (TEXT) ← Common
├── website (TEXT) ← Common
├── description (TEXT) ← Common
├── tags (TEXT[]) ← Common
├── year_founded (INTEGER) ← Common
├── funding_stage (TEXT) ← Common
├── team_size (TEXT) ← Common
├── headquarters (TEXT) ← Common
├── sector_data (JSONB) ← Sector-specific columns
├── subsector_data (JSONB) ← Subsector-specific columns
└── created_at, updated_at
```

#### Example Data:

**DeFi Lending Company:**
```json
{
  "name": "Aave",
  "sector": "DeFi Systems Architecture",
  "subsector": "Lending Markets",
  "sector_data": {
    "total_value_locked": "$5.2B",
    "supported_chains": ["Ethereum", "Polygon", "Avalanche"],
    "governance_token": "AAVE",
    "audit_status": "Audited"
  },
  "subsector_data": {
    "lending_protocols": ["V2", "V3"],
    "collateral_types": ["ETH", "USDC", "DAI"],
    "interest_rate_model": "Variable",
    "flash_loan_support": true
  }
}
```

**Infrastructure Company:**
```json
{
  "name": "Alchemy",
  "sector": "Data & Consensus Infrastructure",
  "subsector": "RPC & Node Providers",
  "sector_data": {
    "api_calls_per_month": "10B+",
    "uptime_sla": "99.9%",
    "supported_networks": 20
  },
  "subsector_data": {
    "node_types": ["Archive", "Full"],
    "websocket_support": true,
    "rate_limits": "Custom",
    "free_tier": true
  }
}
```

**Pros:**
- ✅ Extremely flexible - add fields without schema changes
- ✅ Each sector/subsector can have unique fields
- ✅ Easy to query with PostgreSQL JSONB operators
- ✅ Can index JSONB fields for performance
- ✅ No NULL columns for unused fields

**Cons:**
- ⚠️ Less type safety (handled in application layer)
- ⚠️ Requires JSONB knowledge for complex queries

---

### **Approach 2: Separate Tables (NORMALIZED)**

**Best for**: Strong type safety, complex relationships, SQL joins

#### Schema Design:
```sql
-- Main table (common columns)
companies
├── id (UUID)
├── name (TEXT)
├── sector (TEXT)
├── subsector (TEXT)
├── website, description, tags, etc.

-- Sector-specific tables
defi_sector_data
├── company_id (FK → companies.id)
├── total_value_locked (TEXT)
├── governance_token (TEXT)
├── audit_status (TEXT)

infrastructure_sector_data
├── company_id (FK → companies.id)
├── api_calls_per_month (TEXT)
├── uptime_sla (TEXT)
├── supported_networks (INTEGER)

-- Subsector-specific tables
lending_markets_data
├── company_id (FK → companies.id)
├── lending_protocols (TEXT[])
├── collateral_types (TEXT[])
├── interest_rate_model (TEXT)

rpc_providers_data
├── company_id (FK → companies.id)
├── node_types (TEXT[])
├── websocket_support (BOOLEAN)
├── rate_limits (TEXT)
```

**Pros:**
- ✅ Strong type safety
- ✅ Enforced data integrity
- ✅ Easy to understand structure
- ✅ Efficient joins

**Cons:**
- ❌ Need to create new table for each sector/subsector
- ❌ Schema changes required for new fields
- ❌ More complex queries (multiple joins)
- ❌ More tables to manage

---

### **Approach 3: EAV (Entity-Attribute-Value) Pattern**

**Best for**: Maximum flexibility, dynamic attributes

#### Schema Design:
```sql
companies (main table)
├── id, name, sector, subsector, etc.

company_attributes
├── id (UUID)
├── company_id (FK → companies.id)
├── attribute_key (TEXT) -- e.g., "total_value_locked"
├── attribute_value (TEXT)
├── attribute_type (TEXT) -- "sector" or "subsector"
├── data_type (TEXT) -- "string", "number", "boolean", "array"

attribute_definitions (optional - for validation)
├── id (UUID)
├── attribute_key (TEXT)
├── applies_to_type (TEXT) -- "sector" or "subsector"
├── applies_to_value (TEXT) -- e.g., "DeFi Systems Architecture"
├── data_type (TEXT)
├── is_required (BOOLEAN)
```

**Example Data:**
```sql
-- Company
id: 123, name: "Aave", sector: "DeFi Systems Architecture"

-- Attributes
company_id: 123, key: "total_value_locked", value: "$5.2B", type: "sector"
company_id: 123, key: "lending_protocols", value: "V2,V3", type: "subsector"
company_id: 123, key: "flash_loan_support", value: "true", type: "subsector"
```

**Pros:**
- ✅ Ultimate flexibility
- ✅ No schema changes ever needed
- ✅ Can add attributes on the fly

**Cons:**
- ❌ Complex queries
- ❌ Performance issues with large datasets
- ❌ Type safety challenges
- ❌ Harder to maintain

---

## 🏆 Recommended Approach: JSONB (Approach 1)

For your use case, **JSONB is the best choice** because:

1. **Flexibility**: Each sector/subsector can have completely different fields
2. **No Schema Changes**: Add new fields without migrations
3. **PostgreSQL Power**: Supabase uses PostgreSQL with excellent JSONB support
4. **Easy Uploads**: Can upload JSON data directly
5. **Good Performance**: JSONB is indexed and fast
6. **Type Safety**: Handle in TypeScript layer

---

## 📊 Example Sector/Subsector Column Definitions

### **DeFi Systems Architecture (Sector)**
Common columns for all DeFi companies:
```typescript
{
  total_value_locked: string,      // "$5.2B"
  governance_token: string,         // "AAVE"
  audit_status: string,             // "Audited by X"
  supported_chains: string[],       // ["Ethereum", "Polygon"]
  token_price: string,              // "$95.50"
  market_cap: string                // "$1.2B"
}
```

#### **Lending Markets (Subsector)**
Additional columns specific to lending:
```typescript
{
  lending_protocols: string[],      // ["V2", "V3"]
  collateral_types: string[],       // ["ETH", "USDC", "DAI"]
  interest_rate_model: string,      // "Variable" or "Fixed"
  flash_loan_support: boolean,
  liquidation_threshold: string,    // "80%"
  borrow_apy_range: string         // "2-8%"
}
```

#### **DEXs & Liquidity Protocols (Subsector)**
```typescript
{
  dex_type: string,                 // "AMM" or "Order Book"
  trading_volume_24h: string,       // "$500M"
  liquidity_pools: number,          // 1500
  swap_fee: string,                 // "0.3%"
  supported_tokens: number          // 5000
}
```

### **Data & Consensus Infrastructure (Sector)**
```typescript
{
  api_calls_per_month: string,      // "10B+"
  uptime_sla: string,               // "99.9%"
  supported_networks: number,       // 20
  pricing_model: string,            // "Usage-based"
  enterprise_support: boolean
}
```

#### **RPC & Node Providers (Subsector)**
```typescript
{
  node_types: string[],             // ["Archive", "Full"]
  websocket_support: boolean,
  rate_limits: string,              // "Custom"
  free_tier: boolean,
  response_time_ms: number          // 50
}
```

---

## 📤 Data Upload Methods

### **Method 1: CSV Upload with JSON Columns**

Create a CSV with these columns:
```csv
name,sector,subsector,website,sector_data,subsector_data
Aave,DeFi Systems Architecture,Lending Markets,https://aave.com,"{""tvl"":""$5.2B""}","{""protocols"":[""V2"",""V3""]}"
```

### **Method 2: JSON Bulk Upload**

Upload a JSON file:
```json
[
  {
    "name": "Aave",
    "sector": "DeFi Systems Architecture",
    "subsector": "Lending Markets",
    "website": "https://aave.com",
    "sector_data": {
      "total_value_locked": "$5.2B",
      "governance_token": "AAVE"
    },
    "subsector_data": {
      "lending_protocols": ["V2", "V3"],
      "flash_loan_support": true
    }
  }
]
```

### **Method 3: Google Sheets → Supabase**

1. Structure Google Sheet with columns
2. Use Apps Script or API to push to Supabase
3. Auto-sync on updates

### **Method 4: Admin Panel (Build Custom)**

Create a form where you:
1. Select sector → shows sector-specific fields
2. Select subsector → shows subsector-specific fields
3. Fill in data → saves to JSONB columns

---

## 🔍 Querying JSONB Data

### Get companies with specific sector data:
```sql
SELECT * FROM companies 
WHERE sector_data->>'total_value_locked' IS NOT NULL;
```

### Filter by subsector data:
```sql
SELECT * FROM companies 
WHERE subsector_data->>'flash_loan_support' = 'true';
```

### Search within arrays:
```sql
SELECT * FROM companies 
WHERE sector_data->'supported_chains' ? 'Ethereum';
```

### Index for performance:
```sql
CREATE INDEX idx_sector_data ON companies USING GIN (sector_data);
CREATE INDEX idx_subsector_data ON companies USING GIN (subsector_data);
```

---

## 🎯 Next Steps

1. Choose your approach (I recommend JSONB)
2. Define sector-specific columns for each sector
3. Define subsector-specific columns for each subsector
4. Create migration SQL
5. Build upload tool (CSV, JSON, or admin panel)

Would you like me to implement the JSONB approach with migrations and upload tools?
