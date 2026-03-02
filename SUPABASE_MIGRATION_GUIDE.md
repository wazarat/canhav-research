# Supabase Migration Guide - Market Map Data

This guide will help you migrate your market map data from the TypeScript file to Supabase database.

## 📋 Prerequisites

- Supabase account and project set up
- Environment variables configured (`.env.local`)
- Supabase credentials ready

---

## 🚀 Step-by-Step Migration

### Step 1: Set Up Environment Variables

Make sure you have these in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase project settings under **API**.

---

### Step 2: Run SQL Migrations in Supabase

1. **Go to your Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration 001 - Create Table**
   - Copy the contents of `supabase/migrations/001_create_companies_table.sql`
   - Paste into the SQL editor
   - Click "Run" or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - You should see: "Success. No rows returned"

4. **Run Migration 002 - Insert Data**
   - Copy the contents of `supabase/migrations/002_insert_companies_data.sql`
   - Paste into a new query
   - Click "Run"
   - You should see: "Success. Rows affected: 87" (or similar)

---

### Step 3: Verify Data in Supabase

1. **Check the Table**
   - Go to "Table Editor" in Supabase
   - You should see a new table called `companies`
   - Click on it to view all 87+ companies

2. **Test a Query**
   - In SQL Editor, run:
   ```sql
   SELECT COUNT(*) FROM companies;
   ```
   - Should return: 87 (or your total company count)

3. **Check Sectors**
   - Run:
   ```sql
   SELECT DISTINCT sector FROM companies ORDER BY sector;
   ```
   - Should show all 7 sectors

---

### Step 4: Update Your Code (Already Done!)

The following files have been created/updated:

✅ **`lib/companiesDataSupabase.ts`** - New file with Supabase functions
✅ **`components/MarketMap.tsx`** - Updated to fetch from Supabase
✅ **Loading & error states added** - Better UX

---

### Step 5: Test the Application

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to the market map**:
   - Go to: http://localhost:3000/market-map

3. **You should see**:
   - Loading spinner initially
   - All companies loaded from Supabase
   - All filters and search working
   - Company detail modal working

---

## 🎯 What Changed?

### Before (Static Data)
- Data stored in `lib/companiesData.ts`
- Had to edit code to add/remove companies
- Changes required code deployment

### After (Supabase Database)
- Data stored in Supabase `companies` table
- Can add/remove companies via Supabase dashboard
- No code changes needed for data updates
- Real-time updates possible

---

## 📝 Managing Companies in Supabase

### Adding a New Company

**Option 1: Via Supabase Dashboard**
1. Go to Table Editor → `companies`
2. Click "Insert row"
3. Fill in the fields:
   - `name` (required)
   - `sector` (required)
   - `subsector` (required)
   - `website`, `description`, `tags`, etc. (optional)
4. Click "Save"

**Option 2: Via SQL**
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

### Editing a Company

1. Go to Table Editor → `companies`
2. Find the company row
3. Click on any field to edit
4. Press Enter to save

### Deleting a Company

1. Go to Table Editor → `companies`
2. Find the company row
3. Click the trash icon on the right
4. Confirm deletion

---

## 🔍 Available Functions

The new `lib/companiesDataSupabase.ts` provides these functions:

```typescript
// Fetch all companies
await getAllCompanies()

// Get companies by sector
await getCompaniesBySector('DeFi Systems Architecture')

// Get companies by subsector
await getCompaniesBySubsector('DeFi Systems Architecture', 'Lending Markets')

// Get all sectors
await getAllSectors()

// Get subsectors for a sector
await getSubsectorsBySector('DeFi Systems Architecture')

// Add a new company
await addCompany(companyObject)

// Update a company
await updateCompany(id, updatedFields)

// Delete a company
await deleteCompany(id)

// Search companies
await searchCompanies('lending')
```

---

## 🔐 Security (Row Level Security)

The table has RLS enabled with these policies:

- ✅ **Public read access** - Anyone can view companies
- 🔒 **Authenticated write access** - Only logged-in users can add/edit/delete

To allow public writes (not recommended):
```sql
CREATE POLICY "Allow public insert" ON companies
  FOR INSERT TO public
  WITH CHECK (true);
```

---

## 🎨 Database Schema

```sql
companies
├── id (UUID, Primary Key)
├── name (TEXT, Required)
├── sector (TEXT, Required)
├── subsector (TEXT, Required)
├── website (TEXT)
├── description (TEXT)
├── logo (TEXT)
├── tags (TEXT[])
├── year_founded (INTEGER)
├── funding_stage (TEXT)
├── team_size (TEXT)
├── headquarters (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Indexes:**
- `idx_companies_sector` - Fast sector filtering
- `idx_companies_subsector` - Fast subsector filtering
- `idx_companies_name` - Fast name searches
- `idx_companies_tags` - Fast tag filtering (GIN index)

---

## 🐛 Troubleshooting

### Companies not loading?

**Check 1: Environment variables**
```bash
# Make sure these are set in .env.local
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Check 2: Supabase connection**
- Open browser console (F12)
- Look for error messages
- Check Network tab for failed requests

**Check 3: Table exists**
- Go to Supabase → Table Editor
- Verify `companies` table exists
- Check if it has data

### RLS blocking access?

If you see "permission denied" errors:
```sql
-- Temporarily disable RLS (for testing only)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
```

### Data not showing after insert?

- Refresh the page
- Check browser console for errors
- Verify data in Supabase Table Editor

---

## 🔄 Rollback (If Needed)

If you want to go back to the static data:

1. **Revert MarketMap.tsx**
   ```typescript
   // Change import back to:
   import { companiesData, getAllSectors } from '../lib/companiesData'
   
   // Remove useEffect and loading states
   // Use companiesData directly
   ```

2. **Keep both options**
   - You can keep both files
   - Switch between them as needed
   - Useful for testing

---

## ✅ Migration Checklist

- [ ] Environment variables set in `.env.local`
- [ ] Ran migration 001 (create table)
- [ ] Ran migration 002 (insert data)
- [ ] Verified data in Supabase Table Editor
- [ ] Tested market map page loads
- [ ] Tested search and filters work
- [ ] Tested company detail modal
- [ ] Tested adding a company via Supabase
- [ ] Tested editing a company via Supabase
- [ ] Tested deleting a company via Supabase

---

## 📚 Next Steps

1. **Add authentication** (optional)
   - Allow users to submit companies
   - Admin panel for approvals

2. **Add real-time subscriptions** (optional)
   ```typescript
   supabase
     .channel('companies')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, 
       payload => {
         // Refresh companies when data changes
       }
     )
     .subscribe()
   ```

3. **Add company logos**
   - Upload logos to Supabase Storage
   - Store URLs in `logo` field

4. **Add more fields**
   - Extend the Company interface
   - Add columns to the database
   - Update the UI to display them

---

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **SQL Reference**: https://www.postgresql.org/docs/
- **Migration files**: `supabase/migrations/`
- **TypeScript functions**: `lib/companiesDataSupabase.ts`
