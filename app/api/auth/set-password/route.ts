import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, email, newPassword } = await req.json();

    // 1. Basic validation
    if ((!userId && !email) || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields (userId or email, newPassword)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuração do Supabase incompleta' }, { status: 500 });
    }

    // 2. Security check: Verify the requester's session
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado: Token ausente' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // 3. Check if user is the master admin or has admin role in profiles
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isMasterAdmin = user.email?.toLowerCase() === 'admin@systemsat.com.br';
    const isProfileAdmin = profile?.role === 'admin';

    if (!isMasterAdmin && !isProfileAdmin) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios de administrador' }, { status: 403 });
    }

    // 4. Proceed with password reset using Admin Auth
    let authUser = null;

    // Tenta por ID primeiro se for um UUID válido
    if (userId && userId.length > 30) {
      try {
        const { data, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!getError && data?.user) {
          authUser = data.user;
        }
      } catch (e) {
        console.log('User ID not found, searching by email...');
      }
    }

    // Se não encontrou por ID, tenta listar e filtrar por email
    if (!authUser && email) {
      try {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError) {
          authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        }
      } catch (e) {
        console.error('Error listing users:', e);
      }
    }

    if (authUser) {
      // Atualiza usuário existente
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Supabase Admin Update Error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else if (email) {
      // Cria novo usuário no Auth
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true
      });

      if (createError) {
        // Se o erro for que o usuário já existe (mas não listamos antes por algum motivo)
        if (createError.message.includes('already exists')) {
          // Tentamos uma última vez buscar e atualizar
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
          const retryUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (retryUser) {
            await supabaseAdmin.auth.admin.updateUserById(retryUser.id, { password: newPassword });
            return NextResponse.json({ success: true, message: 'Senha atualizada em usuário existente' });
          }
        }
        console.error('Supabase Admin Create Error:', createError);
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Usuário não encontrado no sistema de autenticação.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Senha definida com sucesso.' });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}