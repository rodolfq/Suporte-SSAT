import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  const supabaseClient = supabaseAdmin;
  if (!supabaseClient) return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });

  try {
    const { data, error } = await supabaseClient
      .from('bitrix_schedules')
      .select('*');

    if (error) {
      if (error.code === '42P01') {
        console.warn('Relation bitrix_schedules does not exist in Supabase. Returning empty array safely.');
        return NextResponse.json({ schedules: [], warning: 'Table does not exist' }, { headers: corsHeaders });
      }
      console.error('Supabase error fetching bitrix_schedules:', error);
      throw error;
    }
    return NextResponse.json({ schedules: data || [] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Catch error in bitrix schedules GET:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  const supabaseClient = supabaseAdmin;
  if (!supabaseClient) return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });

  try {
    const body = await req.json();
    const { user_id, user_name, schedule, action, active } = body;

    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

    const { data, error } = await supabaseClient
      .from('bitrix_schedules')
      .upsert({
        user_id,
        user_name,
        schedule,
        action,
        active,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: Request) {
  const supabaseClient = supabaseAdmin;
  if (!supabaseClient) return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const { error } = await supabaseClient
      .from('bitrix_schedules')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}