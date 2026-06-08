import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fix() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- FORCING OPERATORS UPDATE ---');
  
  // 1. Delete all
  const { error: delError } = await supabase.from('operadores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) console.error('Error deleting:', delError);

  // 2. Insert 8
  const analysts = [
    'Rodolfo', 'Mauro', 'Ana Julia', 'Davidson', 'Thiago', 'Rafael', 'Bianca', 'Pablo'
  ];
  
  const { data, error: insError } = await supabase.from('operadores').insert(
    analysts.map(nome => ({ nome, status: 'Ativo', horario_trabalho: '08:00 - 17:00' }))
  ).select();

  if (insError) {
    console.error('Error inserting analysts:', insError);
  } else {
    console.log('Inserted analysts:', data?.length);
  }

  console.log('--- TRYING TO FIX PERMISSIONS ---');
  // We can't run RAW SQL via the client easily unless there is an RPC.
  // But we can try to UPSERT bitrix_schedules to see if it even works.
  
  const { error: bitrixError } = await supabase.from('bitrix_schedules').upsert({
    user_id: 'test_system',
    user_name: 'System Test',
    active: true
  });

  if (bitrixError) {
    console.error('Error on bitrix_schedules upsert:', bitrixError);
  } else {
    console.log('SUCCESS on bitrix_schedules upsert!');
  }
}

fix();