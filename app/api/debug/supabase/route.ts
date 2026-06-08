import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  const results = {
    env: {
      url_configured: !!supabaseUrl,
      anon_key_configured: !!supabaseAnonKey,
      service_role_configured: !!serviceRoleKey,
    },
    tests: {
      anon_key: { success: false, message: 'Não testado' },
      service_role: { success: false, message: 'Não testado' },
    }
  };

  try {
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      // Tenta um select simples na tabela profiles que geralmente existe
      const { error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error) {
        results.tests.anon_key = { 
          success: false, 
          message: `${error.message}${error.hint ? ` (${error.hint})` : ''}`
        };
      } else {
        results.tests.anon_key = { success: true, message: 'Conexão Anon OK' };
      }
    } else {
      results.tests.anon_key = { success: false, message: 'URL ou Anon Key ausentes' };
    }

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
      
      if (error) {
        results.tests.service_role = { 
          success: false, 
          message: `${error.message}${error.hint ? ` (${error.hint})` : ''}`
        };
      } else {
        results.tests.service_role = { success: true, message: 'Conexão Service Role OK' };
      }
    } else {
      results.tests.service_role = { success: false, message: 'Service Role Key ausente' };
    }
  } catch (err: any) {
    results.tests.anon_key.message = 'ERRO EXCEÇÃO: ' + err.message;
  }

  return NextResponse.json(results);
}