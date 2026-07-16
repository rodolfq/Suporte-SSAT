import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getUserByEmail, createUser } from '@/lib/db/users';
import { upsertProfile } from '@/lib/db/profiles';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, permissions } = await req.json();

    if (!email || !role || !password) {
      return NextResponse.json({ error: 'Email, senha e role são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios de administrador' }, { status: 403 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await getUserByEmail(normalizedEmail);
    if (!user) {
      const passwordHash = await hashPassword(password);
      user = await createUser(normalizedEmail, passwordHash);
    }

    await upsertProfile({
      id: user.id,
      email: normalizedEmail,
      role,
      status: 'active',
      permissions: permissions || {},
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
