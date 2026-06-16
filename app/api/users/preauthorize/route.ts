import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEFAULT_USER_PERMISSIONS = {
  view_general: true,
  view_tickets_dash: true,
  view_odoo_dash: false,
  view_comparison: true,
  view_ranking: true,
  view_raw_data: false,
  view_odoo_tickets: false,
  view_bitrix_tickets: false,
  view_metrics: false,
  view_performance_charts: false,
  view_sla_metrics: false,
  view_satisfaction_data: false,
  view_training: false,
  view_queue: false,
  upload_data: false,
  manage_users: false,
  export_reports: false,
  sync_external_data: false,
  delete_data: false,
  edit_collaborators: false
};

const DEFAULT_ADMIN_PERMISSIONS = {
  view_general: true,
  view_tickets_dash: true,
  view_odoo_dash: true,
  view_comparison: true,
  view_ranking: true,
  view_raw_data: true,
  view_odoo_tickets: true,
  view_bitrix_tickets: true,
  view_metrics: true,
  view_performance_charts: true,
  view_sla_metrics: true,
  view_satisfaction_data: true,
  view_training: true,
  view_queue: true,
  upload_data: true,
  manage_users: true,
  export_reports: true,
  sync_external_data: true,
  delete_data: true,
  edit_collaborators: true
};

export async function POST(req: Request) {
  try {
    const { email, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase Admin não configurado' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado: Token ausente' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Não autorizado: Token inválido' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem pré-autorizar usuários' }, { status: 403 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const permissions = role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS;

    // Create a temporary user in Supabase Auth first (required by FK constraint)
    const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: trimmedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: role || 'user' }
    });

    let userId = newUser?.user?.id;

    // If user already exists in auth, get their existing ID
    if (createError || !userId) {
      const errorMsg = createError?.message || '';
      const isDuplicate = !userId && (errorMsg.includes('already exists') || errorMsg.includes('duplicate key') || errorMsg.includes('User already exists'));
      
      if (isDuplicate || !userId) {
        // Try to find the existing user
        let foundUser = null;
        let page = 1;
        while (!foundUser && page <= 10) {
          const { data: authUsers } = await supabase.auth.admin.listUsers({ page });
          foundUser = authUsers?.users?.find(u => u.email === trimmedEmail);
          page++;
        }
        if (foundUser) {
          userId = foundUser.id;
        }
      }
      
      if (!userId) {
        return NextResponse.json({ error: `Erro ao criar usuário: ${createError?.message || 'ID não retornado'}` }, { status: 500 });
      }
    }

    // Use upsert to handle both cases: new user or existing user
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: trimmedEmail,
        role: role || 'user',
        status: 'inactive',
        permissions
      }, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Usuário pré-autorizado com sucesso' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}