const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ntysfrgjwwcrtgustteb.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCouples() {
  const { data, error } = await supabase
    .from('couples')
    .select('bride_first_name, groom_first_name, contract_total, wedding_date')
    .order('wedding_date', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n2025 COUPLES - Contract Totals:\n');
  data
    .filter(c => c.wedding_date?.startsWith('2025'))
    .forEach((c, i) => {
      console.log(`${String(i+1).padStart(2, '0')}. ${c.bride_first_name} & ${c.groom_first_name}: $${c.contract_total || 'NULL'}`);
    });
}

checkCouples();
