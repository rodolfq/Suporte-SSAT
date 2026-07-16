import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import {
  listSupportData,
  upsertSupportData,
  deleteSupportDataByUploadId,
  deleteSupportDataByColaborador,
  deleteSupportDataBySource,
  deleteAllSupportData,
  updateSupportDataExclusion,
  updateSupportDataNote,
} from '@/lib/db/app-data';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const source = req.nextUrl.searchParams.get('source') || undefined;
  return NextResponse.json({ data: await listSupportData(source) });
}

export async function PUT(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows } = await req.json();
  try {
    await upsertSupportData(rows);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, is_excluded, exclusion_reason, notes } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (is_excluded !== undefined) {
    await updateSupportDataExclusion(id, is_excluded, exclusion_reason);
  }
  if (notes !== undefined) {
    await updateSupportDataNote(id, notes);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const uploadId = params.get('uploadId');
  const colaborador = params.get('colaborador');
  const source = params.get('source');
  const all = params.get('all') === 'true';
  if (all) {
    await deleteAllSupportData();
  } else if (uploadId) {
    await deleteSupportDataByUploadId(uploadId);
  } else if (colaborador) {
    await deleteSupportDataByColaborador(colaborador);
  } else if (source) {
    await deleteSupportDataBySource(source);
  } else {
    return NextResponse.json({ error: 'uploadId, colaborador, source or all is required' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
