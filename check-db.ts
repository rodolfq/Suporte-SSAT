import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- DB ACCESS DEBUGGER ---');
console.log('URL:', supabaseUrl);
console.log('Service Role Key Present:', !!serviceRoleKey);
console.log('Anon Key Present:', !!anonKey);

const supabase = createClient(supabaseUrl!, serviceRoleKey || anonKey!);

async function check() {
  const tablesToTest = ['profiles', 'operadores', 'escalas_por_data', 'bitrix_schedules', 'uploads', 'app_secrets'];
  
  for (const table of tablesToTest) {
    console.log(`\nTesting table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.error(`  ERROR on ${table}:`, error.message, error.code);
    } else {
      console.log(`  SUCCESS on ${table}! Found ${data.length} records.`);
      if (data.length > 0) {
        console.log(`  First record keys: ${Object.keys(data[0]).join(', ')}`);
        if (table === 'operadores') {
          console.log(`  Operadores list: ${data.map((o: any) => o.nome).join(', ')}`);
        }
      }
    }
  }

  console.log('\n--- Checking Information Schema ---');
  const { data: schemaTables, error: sErr } = await supabase
    .from('information_schema.tables' as any)
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (sErr) {
    console.error('  ERROR on information_schema:', sErr.message, sErr.code);
  } else {
    console.log('  Tables in public schema:', schemaTables.map((t: any) => t.table_name).join(', '));
  }
}

check();