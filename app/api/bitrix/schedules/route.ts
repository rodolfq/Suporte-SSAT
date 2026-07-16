import { NextRequest, NextResponse } from 'next/server';
import { listBitrixSchedules, upsertBitrixSchedule, deleteBitrixSchedule } from '@/lib/db/app-data';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const data = await listBitrixSchedules();
    return NextResponse.json({ schedules: data }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching bitrix_schedules:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, user_name, schedule, action, active } = body;

    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

    await upsertBitrixSchedule({ user_id, user_name, schedule, action, active });
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    await deleteBitrixSchedule(userId);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
