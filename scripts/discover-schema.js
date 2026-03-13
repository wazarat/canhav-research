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

  // 1. Check entity_ids in masterdata.entities vs public.entities
  console.log('=== Comparing entity IDs between schemas ===');
  
  // masterdata.entities
  const mdResp = await fetch(`${supabaseUrl}/rest/v1/entities?select=entity_id,entity_name&limit=5&order=entity_id`, { headers });
  if (mdResp.ok) {
    const mdEnts = await mdResp.json();
    console.log('masterdata.entities sample:');
    mdEnts.forEach(e => console.log(`  id=${e.entity_id}: ${e.entity_name}`));
  }

  // public.entities  
  const pubResp = await fetch(`${supabaseUrl}/rest/v1/entities?select=entity_id,entity_name&limit=5&order=entity_id`, {
    headers: { ...headers, 'Accept-Profile': 'public' }
  });
  if (pubResp.ok) {
    const pubEnts = await pubResp.json();
    console.log('\npublic.entities sample:');
    pubEnts.forEach(e => console.log(`  id=${e.entity_id}: ${e.entity_name}`));
  }

  // 2. Check what entity_ids are in a detail table and find entity names
  console.log('\n=== defi_systems_architecture_details sample ===');
  const defiResp = await fetch(`${supabaseUrl}/rest/v1/defi_systems_architecture_details?select=entity_id&limit=5&order=entity_id`, { headers });
  if (defiResp.ok) {
    const defiRows = await defiResp.json();
    console.log('entity_ids in defi details:', defiRows.map(r => r.entity_id).join(', '));
    
    // Look up these entity names in masterdata.entities
    for (const row of defiRows) {
      const nameResp = await fetch(`${supabaseUrl}/rest/v1/entities?entity_id=eq.${row.entity_id}&select=entity_name`, { headers });
      if (nameResp.ok) {
        const names = await nameResp.json();
        console.log(`  md entity_id=${row.entity_id}: ${names[0]?.entity_name || '???'}`);
      }
    }
  }

  // 3. Look up Figment (public entity_id=14) in masterdata
  console.log('\n=== Looking up "Figment" in masterdata.entities ===');
  const figResp = await fetch(`${supabaseUrl}/rest/v1/entities?entity_name=ilike.*Figment*&select=entity_id,entity_name`, { headers });
  if (figResp.ok) {
    const figEnts = await figResp.json();
    console.log('Figment in masterdata:', JSON.stringify(figEnts));
  }

  // 4. Check data_consensus_infrastructure_details sample
  console.log('\n=== data_consensus_infrastructure_details sample ===');
  const dcResp = await fetch(`${supabaseUrl}/rest/v1/data_consensus_infrastructure_details?select=entity_id&limit=5&order=entity_id`, { headers });
  if (dcResp.ok) {
    const dcRows = await dcResp.json();
    console.log('entity_ids:', dcRows.map(r => r.entity_id).join(', '));
  }

  // 5. Count total in masterdata.entities
  const countResp = await fetch(`${supabaseUrl}/rest/v1/entities?select=entity_id&order=entity_id`, {
    headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
  });
  if (countResp.ok) {
    const range = countResp.headers.get('content-range');
    console.log(`\nmasterdata.entities count: ${range}`);
  }
}

discoverSchema().catch(console.error);
