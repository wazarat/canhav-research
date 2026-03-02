# 🚀 Supabase Setup Instructions

Your Supabase credentials have been integrated! Follow these steps to complete the setup.

---

## ✅ Step 1: Environment Variables (COMPLETED)

Your `.env.local` file has been created with:
- `NEXT_PUBLIC_SUPABASE_URL`: https://egesqobnveubddfpzrkp.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: For server-side operations

---

## 📊 Step 2: Run SQL Migrations in Supabase Dashboard

### **A. Create the Companies Table**

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project: `egesqobnveubddfpzrkp`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration 001**
   - Open the file: `supabase/migrations/001_create_companies_table.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run" (or press `Cmd+Enter`)
   - ✅ You should see: "Success. No rows returned"

### **B. Insert Company Data**

1. **Create a New Query**
   - Click "New Query" again

2. **Run Migration 002**
   - Open the file: `supabase/migrations/002_insert_companies_data.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click "Run"
   - ✅ You should see: "Success. Rows affected: 87" (or similar)

---

## 🔍 Step 3: Verify Data in Supabase

1. **Go to Table Editor**
   - Click "Table Editor" in the left sidebar
   - You should see a table called `companies`

2. **Check the Data**
   - Click on the `companies` table
   - You should see 87+ companies listed
   - Verify columns: name, sector, subsector, website, etc.

3. **Test a Query (Optional)**
   - Go back to SQL Editor
   - Run this query:
   ```sql
   SELECT COUNT(*) FROM companies;
   ```
   - Should return: 87 (or your total count)

---

## 🧪 Step 4: Test the Application

1. **Restart the Dev Server** (if running)
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Visit the Market Map**
   - Go to: http://localhost:3000/market-map
   - You should see:
     - Loading spinner initially
     - All companies loaded from Supabase
     - Filters and search working
     - Company detail modal working

3. **Check Browser Console**
   - Press F12 to open DevTools
   - Look for any errors
   - Should see successful Supabase queries

---

## 🎯 What's Been Configured

### **Files Created/Updated:**

✅ **`.env.local`** - Supabase credentials
✅ **`lib/supabase.ts`** - Supabase client (already exists)
✅ **`lib/companiesDataSupabase.ts`** - Functions to fetch from Supabase
✅ **`components/MarketMap.tsx`** - Updated to use Supabase
✅ **`supabase/migrations/001_create_companies_table.sql`** - Table schema
✅ **`supabase/migrations/002_insert_companies_data.sql`** - Initial data

### **Database Schema:**

```sql
companies table:
├── id (UUID, auto-generated)
├── name (TEXT, required)
├── sector (TEXT, required)
├── subsector (TEXT, required)
├── website (TEXT)
├── description (TEXT)
├── logo (TEXT)
├── tags (TEXT[])
├── year_founded (INTEGER)
├── funding_stage (TEXT)
├── team_size (TEXT)
├── headquarters (TEXT)
├── created_at (TIMESTAMP, auto)
└── updated_at (TIMESTAMP, auto)
```

---

## 🔐 Security Settings

Your table has **Row Level Security (RLS)** enabled with:
- ✅ **Public Read Access** - Anyone can view companies
- 🔒 **Authenticated Write Access** - Only logged-in users can add/edit/delete

---

## 📝 Managing Companies After Setup

### **Add a Company via Supabase Dashboard:**

1. Go to Table Editor → `companies`
2. Click "Insert row"
3. Fill in:
   - `name` (required)
   - `sector` (required)
   - `subsector` (required)
   - Other fields (optional)
4. Click "Save"
5. Refresh your website - new company appears!

### **Add a Company via SQL:**

```sql
INSERT INTO companies (name, sector, subsector, website, description, tags, year_founded, funding_stage)
VALUES (
  'New Company',
  'DeFi Systems Architecture',
  'Lending Markets',
  'https://newcompany.com',
  'Description here',
  ARRAY['DeFi', 'Lending'],
  2024,
  'Seed'
);
```

---

## 🐛 Troubleshooting

### **Issue: Companies not loading on website**

**Check 1: Environment variables loaded**
```bash
# Restart dev server
npm run dev
```

**Check 2: Browser console**
- Open DevTools (F12)
- Look for Supabase errors
- Check Network tab for failed requests

**Check 3: Supabase table exists**
- Go to Supabase → Table Editor
- Verify `companies` table exists with data

### **Issue: "Permission denied" errors**

Run this in SQL Editor to temporarily disable RLS (testing only):
```sql
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

### **Issue: Data not showing after insert**

- Refresh the page
- Check browser console for errors
- Verify data in Supabase Table Editor

---

## 🎨 Next Steps: Add JSONB Columns (Optional)

If you want to add sector-specific and subsector-specific columns:

1. **Run this migration:**
```sql
ALTER TABLE companies 
ADD COLUMN sector_data JSONB DEFAULT '{}',
ADD COLUMN subsector_data JSONB DEFAULT '{}';

CREATE INDEX idx_sector_data ON companies USING GIN (sector_data);
CREATE INDEX idx_subsector_data ON companies USING GIN (subsector_data);
```

2. **Add data:**
```sql
UPDATE companies 
SET sector_data = '{"total_value_locked": "$5.2B", "governance_token": "AAVE"}'
WHERE name = 'Aave';
```

See `DATABASE_SCHEMA_DESIGN.md` for full JSONB implementation guide.

---

## ✅ Setup Checklist

- [x] Environment variables added to `.env.local`
- [ ] Ran migration 001 (create table)
- [ ] Ran migration 002 (insert data)
- [ ] Verified data in Supabase Table Editor
- [ ] Tested market map page loads
- [ ] Tested search and filters work
- [ ] Tested company detail modal

---

## 📚 Documentation Files

- **`SUPABASE_MIGRATION_GUIDE.md`** - Complete migration guide
- **`DATABASE_SCHEMA_DESIGN.md`** - JSONB schema design for sector/subsector columns
- **`MARKET_MAP_DATA_GUIDE.md`** - Original data management guide

---

## 🆘 Need Help?

- **Supabase Dashboard**: https://app.supabase.com
- **Your Project**: https://egesqobnveubddfpzrkp.supabase.co
- **Supabase Docs**: https://supabase.com/docs
- **SQL Files**: `supabase/migrations/`
