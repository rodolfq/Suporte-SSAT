import { NextResponse } from 'next/server';

import { getSecret } from '@/lib/secrets-server';

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
    // 1. Get all users using pagination (Bitrix returns 50 per page)
    let allUsers: any[] = [];
    let start = 0;
    let hasNext = true;

    while (hasNext) {
      const usersData = await fetchBitrix('user.get', { 
        start
        // Removed ACTIVE: true filter to match Python script behavior
      });
      
      const pageUsers = usersData.result || [];
      allUsers = [...allUsers, ...pageUsers];
      
      if (usersData.next) {
        start = usersData.next;
      } else {
        hasNext = false;
      }
      
      // Safety break to prevent infinite loops
      if (allUsers.length > 500) break; 
    }
    
    // 2. Get timeman status for users using parallel batch requests
    const chunks = [];
    for (let i = 0; i < allUsers.length; i += 50) {
      chunks.push(allUsers.slice(i, i + 50));
    }

    const results: any[] = [];

    // Process chunks in parallel to avoid timeouts
    const chunkPromises = chunks.map(async (chunk) => {
      const batchCmd: any = {};
      chunk.forEach((u: any) => {
        batchCmd[`status_${u.ID}`] = `timeman.status?USER_ID=${u.ID}`;
      });

      try {
        const batchResponse = await fetchBitrix('batch', { cmd: batchCmd });
        const batchResult = batchResponse.result?.result || {};

        return chunk.map((u: any) => {
          const statusData = batchResult[`status_${u.ID}`];
          return {
            id: u.ID,
            name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim(),
            avatar: u.PERSONAL_PHOTO,
            status: statusData?.STATUS || 'CLOSED',
            time_start: statusData?.TIME_START,
            time_finish: statusData?.TIME_FINISH,
            duration: statusData?.DURATION,
            pause: statusData?.PAUSE,
            active: u.ACTIVE
          };
        });
      } catch (err) {
        console.error('Error in batch status fetch for chunk:', err);
        // Fallback for this chunk if batch fails
        return chunk.map((u: any) => ({
          id: u.ID,
          name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim(),
          avatar: u.PERSONAL_PHOTO,
          status: 'UNKNOWN',
          active: u.ACTIVE
        }));
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(chunkResult => {
      results.push(...chunkResult);
    });
    
    return NextResponse.json({ users: results });
  } catch (error: any) {
    console.error('Error fetching timeman status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();
    
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }
    
    let method = '';
    if (action === 'close') method = 'timeman.close';
    else if (action === 'pause') method = 'timeman.pause';
    else if (action === 'open') method = 'timeman.open';
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
    const result = await fetchBitrix(method, { USER_ID: userId });
    
    return NextResponse.json({ success: true, result: result.result });
  } catch (error: any) {
    console.error(`Error performing timeman ${req.method}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}