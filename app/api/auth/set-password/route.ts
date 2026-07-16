import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getUserById, getUserByEmail, createUser, updateUserPassword } from '@/lib/db/users';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId, email, newPassword } = await req.json();

    if ((!userId && !email) || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields (userId or email, newPassword)' }, { status: 400 });
    }

    if (!(await requireAdmin(req))) {
      return NextResponse.json({ error: 'Acesso negado: Requer privilégios de administrador' }, { status: 403 });
    }

    let user = null;
    if (userId && userId.length > 30) {
      user = await getUserById(userId);
    }
    if (!user && email) {
      user = await getUserByEmail(email);
    }

    const passwordHash = await hashPassword(newPassword);

    if (user) {
      await updateUserPassword(user.id, passwordHash);
    } else if (email) {
      await createUser(email, passwordHash);
    } else {
      return NextResponse.json({ error: 'Usuário não encontrado no sistema de autenticação.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Senha definida com sucesso.' });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
