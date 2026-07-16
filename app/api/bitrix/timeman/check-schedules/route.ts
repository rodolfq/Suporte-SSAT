import { NextResponse } from 'next/server';
import { listBitrixSchedules } from '@/lib/db/app-data';
import { getSecret } from '@/lib/db/secrets';

async function fetchBitrix(method: string, params: any = {}) {
  const webhook = await getSecret('bitrix_webhook');
  if (!webhook) {
    throw new Error('Bitrix Webhook não configurado. Verifique as configurações.');
  }

  const url = `${webhook}${method}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || error.error || `Bitrix error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Bitrix request timed out');
    }
    throw error;
  }
}

export async function GET() {
  try {
    // 1. Get all active schedules
    const allSchedules = await listBitrixSchedules();
    const schedules = allSchedules.filter((s: any) => s.active);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No active schedules found' });
    }

    // 2. Get current day and time
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const actionsTaken = [];

    for (const schedule of schedules) {
      const targetTime = schedule.schedule?.[currentDay];
      if (!targetTime) continue;

      // Check if current time is >= target time
      // We use a small window to avoid missing it, but also avoid repeating it too much
      // Actually, if we check every minute, we can just check if currentTime === targetTime
      if (currentTime === targetTime) {
        try {
          // Check current status first to avoid unnecessary calls
          const statusData = await fetchBitrix('timeman.status', { USER_ID: schedule.user_id });
          const currentStatus = statusData.result?.STATUS;

          if (currentStatus === 'OPENED' || (schedule.action === 'close' && currentStatus === 'PAUSED')) {
            const method = schedule.action === 'pause' ? 'timeman.pause' : 'timeman.close';
            await fetchBitrix(method, { USER_ID: schedule.user_id });
            actionsTaken.push({ user: schedule.user_name, action: schedule.action });
          }
        } catch (err: any) {
          console.error(`Error processing schedule for ${schedule.user_name}:`, err);
        }
      }
    }

    return NextResponse.json({ success: true, actionsTaken });
  } catch (error: any) {
    console.error('Error in check-schedules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}