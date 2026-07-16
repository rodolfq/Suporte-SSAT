import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { listProfiles, updateProfilePermissionsByEmail, deleteProfileByEmail } from '@/lib/db/profiles';

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await listProfiles();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { email, permissions } = await req.json();
  if (!email || !permissions) return NextResponse.json({ error: 'email e permissions são obrigatórios' }, { status: 400 });
  const profile = await updateProfilePermissionsByEmail(email, permissions);
  return NextResponse.json({ data: profile });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  await deleteProfileByEmail(email);
  return NextResponse.json({ success: true });
}
