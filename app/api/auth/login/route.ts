import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/users';
import { comparePassword, signSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_TTL_SECONDS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user || !user.encrypted_password) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos. O acesso é restrito a usuários cadastrados pelo administrador.' }, { status: 401 });
    }

    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return NextResponse.json({ error: 'Este usuário está desativado.' }, { status: 403 });
    }

    const valid = await comparePassword(password, user.encrypted_password);
    if (!valid) {
      return NextResponse.json({ error: 'E-mail ou senha incorretos. O acesso é restrito a usuários cadastrados pelo administrador.' }, { status: 401 });
    }

    const token = signSessionToken({ sub: user.id, email: user.email });
    const res = NextResponse.json({ user: { id: user.id, email: user.email } });
    res.cookies.set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_TTL_SECONDS });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao conectar.' }, { status: 500 });
  }
}
