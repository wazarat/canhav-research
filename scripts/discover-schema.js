const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.+)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabaseUrl = env.NEW_NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEW_SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function discoverSchema() {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Accept-Profile': 'masterdata',
    'Content-Type': 'application/json',
  };

  // 1. All Figment entity_ids in masterdata
  console.log('=== Figment in masterdata.entities ===');
  const figResp = await fetch(`${supabaseUrl}/rest/v1/entities?entity_name=ilike.*Figment*&select=entity_id,entity_name`, { headers });
  const figEnts = figResp.ok ? await figResp.json() : [];
  console.log(JSON.stringify(figEnts));
  const figIds = figEnts.map(e => e.entity_id);

  // 2. Check every sector detail table for Figment
  const sectorTables = [
    'core_protocol_architecture_details',
    'rollup_scaling_details',
    'defi_systems_architecture_details',
    'data_consensus_infrastructure_details',
    'advanced_compute_integration_details',
    'governance_enterprise_framework_details',
    'monetary_access_rails_details',
  ];
  
  for (const table of sectorTables) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${table}?entity_id=in.(${figIds.join(',')})&select=*`, { headers });
    if (resp.ok) {
      const rows = await resp.json();
      if (rows.length > 0) {
        console.log(`\n✅ ${table}: ${rows.length} row(s)`);
        console.log(JSON.stringify(rows[0], null, 2));
      } else {
        console.log(`\n❌ ${table}: 0 rows for Figment`);
      }
    }
  }

  // 3. Check all views for Figment
  console.log('\n=== Checking views for Figment ===');
  const views = [
    'v_rollup_scaling_clean',
    'v_defi_systems_architecture_clean',
    'v_core_protocol_architecture_clean',
    'v_data_consensus_infra_clean',
    'v_advanced_compute_integration_clean',
    'v_governance_enterprise_framework_clean',
    'v_monetary_access_rails_clean',
    'v_entity_tree',
  ];
  for (const view of views) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${view}?select=*&limit=1`, { headers });
    if (resp.ok) {
      const rows = await resp.json();
      if (rows[0]) {
        const cols = Object.keys(rows[0]);
        console.log(`\n✅ ${view} (${cols.length} cols): ${cols.join(', ')}`);
      }
    }
  }

  // 4. Row counts for every detail table
  console.log('\n=== Row counts per detail table ===');
  for (const table of sectorTables) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${table}?select=entity_id`, {
      headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
    });
    if (resp.ok) {
      console.log(`${table}: ${resp.headers.get('content-range')}`);
    }
  }

  // 5. Check core_protocol_architecture_details specifically
  console.log('\n=== core_protocol_architecture_details full check ===');
  const cpaResp = await fetch(`${supabaseUrl}/rest/v1/core_protocol_architecture_details?select=*&limit=3`, { headers });
  if (cpaResp.ok) {
    const rows = await cpaResp.json();
    console.log(`Rows returned: ${rows.length}`);
    if (rows[0]) console.log('Sample:', JSON.stringify(rows[0], null, 2));
  }

  // 6. Check the stg_ (staging) tables - they may have MORE columns
  console.log('\n=== Staging tables columns ===');
  const stgTables = [
    'stg_core_protocol_architecture_raw',
    'stg_rollup_scaling_raw',
    'stg_defi_systems_architecture_raw',
    'stg_data_consensus_infra_raw',
    'stg_advanced_compute_integration_raw',
    'stg_governance_enterprise_framework_raw',
    'stg_monetary_access_rails_raw',
  ];
  for (const table of stgTables) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers });
    if (resp.ok) {
      const rows = await resp.json();
      if (rows[0]) {
        const cols = Object.keys(rows[0]);
        console.log(`\n${table} (${cols.length} cols): ${cols.join(', ')}`);
      }
    }
  }
}

discoverSchema().catch(console.error);
