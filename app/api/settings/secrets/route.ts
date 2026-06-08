import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { setSecret } from '@/lib/secrets-server';

export async function POST(req: Request) {
  try {
    const { keyName, value } = await req.json();

    if (!keyName || value === undefined) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    // 1. Verificar autorização - Apenas o admin logado pode salvar chaves
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Precisamos do cookie de auth para validar a sessão no servidor
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Nenhum token de autenticação fornecido' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Verificar se o usuário é realmente o administrador (admin@systemsat.com.br)
    if (user.email !== 'admin@systemsat.com.br') {
      return NextResponse.json({ error: 'Apenas o administrador master pode alterar chaves de sistema' }, { status: 403 });
    }

    // 3. Salvar o segredo criptografado
    await setSecret(keyName, value, user.email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro na API de Secrets:', err);
    return NextResponse.json({ 
      error: err.message || 'Erro interno do servidor',
      details: err.code === '42P01' ? 'Tabela app_secrets não encontrada no banco de dados' : undefined
    }, { status: 500 });
  }
}