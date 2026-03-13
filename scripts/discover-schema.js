const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEW_NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, supabaseKey);

async function discoverSchema() {
  // Test joined query: entity_classifications → entities + subsectors → sectors
  console.log('--- Testing joined query ---');
  const { data, error } = await client
    .from('entity_classifications')
    .select(`
      entity_classification_id,
      entities ( entity_id, entity_name ),
      subsectors ( subsector_id, subsector_name, sectors ( sector_id, sector_name ) ),
      maintaining_organization,
      website,
      description
    `)
    .limit(5);

  if (error) {
    console.log('Join error:', error.message);
    // Fallback: manual join approach
    console.log('\n--- Trying manual join ---');
    const { data: ec, error: ecErr } = await client.from('entity_classifications').select('*').limit(3);
    if (ecErr) { console.log('EC error:', ecErr.message); return; }
    
    for (const row of ec) {
      const { data: entity } = await client.from('entities').select('*').eq('entity_id', row.entity_id).single();
      const { data: subsector } = await client.from('subsectors').select('*').eq('subsector_id', row.subsector_id).single();
      let sectorName = '?';
      if (subsector) {
        const { data: sector } = await client.from('sectors').select('*').eq('sector_id', subsector.sector_id).single();
        sectorName = sector?.sector_name || '?';
      }
      console.log(`  ${entity?.entity_name} → ${sectorName} → ${subsector?.subsector_name}`);
    }
  } else {
    console.log(`Joined query success! ${data.length} rows`);
    data.forEach(row => console.log(JSON.stringify(row, null, 2)));
  }

  // Count total classifications
  const { count } = await client.from('entity_classifications').select('*', { count: 'exact', head: true });
  console.log(`\n📊 Total entity_classifications: ${count}`);
}

discoverSchema().catch(console.error);
