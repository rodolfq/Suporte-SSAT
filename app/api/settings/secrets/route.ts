import { NextRequest, NextResponse } from 'next/server';
import { requireMasterAdmin } from '@/lib/api-auth';
import { setSecret } from '@/lib/db/secrets';

export async function POST(req: NextRequest) {
  try {
    const { keyName, value } = await req.json();

    if (!keyName || value === undefined) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    // Apenas o administrador master pode salvar chaves de sistema
    if (!requireMasterAdmin(req)) {
      return NextResponse.json({ error: 'Apenas o administrador master pode alterar chaves de sistema' }, { status: 403 });
    }

    await setSecret(keyName, value);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro na API de Secrets:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
