import { NextResponse } from 'next/server';
import { upsertBitrixTickets, listBitrixTicketsFiltered } from '@/lib/db/app-data';
import { getSecret } from '@/lib/db/secrets';

const ENTITY_TYPE_ID = 1086;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: any = {}, retries = 3, backoff = 1000): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 || response.status >= 500) {
        if (retries > 0) {
          console.warn(`Fetch failed with status ${response.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
          await sleep(backoff);
          return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
      }
      throw new Error(errorData.error_description || errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    if (retries > 0 && (error.name === 'TypeError' || error.message?.includes('SocketError') || error.message?.includes('closed'))) {
      console.warn(`Fetch failed: ${error.message}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await sleep(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper functions removed as they were replaced by optimized versions (fetchUsersByIds, fetchCompaniesByIds, etc.)

async function getBitrixWebhook() {
  const webhook = await getSecret('bitrix_webhook');
  if (!webhook) {
    throw new Error('Bitrix Webhook não configurado nas configurações.');
  }
  return webhook;
}

async function fetchAllStatuses() {
  const statuses: Record<string, string> = {};
  let start = 0;
  const webhook = await getBitrixWebhook();
  
  while (true) {
    const url = `${webhook}crm.status.list?start=${start}`;
    const data = await fetchWithRetry(url);
    
    if (!data.result) break;
    
    for (const s of data.result) {
      statuses[s.STATUS_ID] = s.NAME;
    }
    
    if (data.next) {
      start = data.next;
      await sleep(200);
    } else {
      break;
    }
  }
  
  return statuses;
}

async function fetchAllSmartProcessItems() {
  const items = [];
  let start = 0;
  const webhook = await getBitrixWebhook();
  
  // Fetch items updated in the last 180 days to ensure we get recent changes
  const halfYearAgo = new Date();
  halfYearAgo.setDate(halfYearAgo.getDate() - 180);
  const dateFilter = halfYearAgo.toISOString();

  while (true) {
    const url = `${webhook}crm.item.list`;
    const payload = {
      entityTypeId: ENTITY_TYPE_ID,
      select: [
        "id", 
        "title", 
        "assignedById", 
        "companyId", 
        "stageId", 
        "createdTime", 
        "updatedTime", 
        "opened",
        "ufCrm32_1749145460", // Prazo (Deadline)
        "ufCrm32_1749145337", // Classificação (Priority)
        "ufCrm32_1752692198"  // Nome da Empresa (Direct field)
      ],
      filter: {
        ">updatedTime": dateFilter
      },
      start: start
    };
    
    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!data.result || !data.result.items) {
      break;
    }
    
    items.push(...data.result.items);
    
    if (data.next) {
      start = data.next;
      await sleep(100);
    } else {
      break;
    }
  }
  
  return items;
}

async function fetchUsersByIds(userIds: number[]) {
  const users: Record<number, { name: string, avatar: string | null }> = {};
  if (userIds.length === 0) return users;

  const uniqueIds = Array.from(new Set(userIds));
  const webhook = await getBitrixWebhook();
  
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);
    for (const id of batch) {
      try {
        const url = `${webhook}user.get?ID=${id}`;
        const data = await fetchWithRetry(url);
        if (data.result && data.result[0]) {
          const u = data.result[0];
          users[id] = {
            name: `${u.NAME || ''} ${u.LAST_NAME || ''}`.trim() || `ID ${id}`,
            avatar: u.PERSONAL_PHOTO || null
          };
        }
      } catch (err) {
        console.error(`Error fetching user ${id}:`, err);
      }
    }
    await sleep(100);
  }
  
  return users;
}

async function fetchCompaniesByIds(companyIds: number[]) {
  const companies: Record<number, string> = {};
  if (companyIds.length === 0) return companies;

  const uniqueIds = Array.from(new Set(companyIds));
  const webhook = await getBitrixWebhook();
  
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);
    const url = `${webhook}crm.company.list`;
    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        select: ["ID", "TITLE"],
        filter: { "ID": batch }
      })
    });
    
    if (data.result) {
      for (const c of data.result) {
        companies[parseInt(c.ID, 10)] = c.TITLE;
      }
    }
    await sleep(100);
  }
  
  return companies;
}

export async function POST() {
  try {
    console.log("Iniciando sincronização Bitrix (Smart Process Items)...");
    
    // 1. Fetch Smart Process Items directly (more accurate than activities)
    const items = await fetchAllSmartProcessItems();
    console.log(`Encontrados ${items.length} tickets (itens do Smart Process).`);
    
    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Nenhum ticket recente encontrado." });
    }

    // 2. Collect unique IDs for related data
    const userIds = new Set<number>();
    const companyIds = new Set<number>();
    
    items.forEach(item => {
      if (item.assignedById) userIds.add(parseInt(item.assignedById, 10));
      if (item.companyId) companyIds.add(parseInt(item.companyId, 10));
    });

    // 3. Fetch related data in parallel
    console.log(`Buscando dados relacionados: ${userIds.size} usuários, ${companyIds.size} empresas.`);
    
    const [users, statuses, companies] = await Promise.all([
      fetchUsersByIds(Array.from(userIds)),
      fetchAllStatuses(),
      fetchCompaniesByIds(Array.from(companyIds))
    ]);
    
    console.log("Processando tickets...");
    
    const formattedTickets = items.map(item => {
      const userId = parseInt(item.assignedById || 0, 10);
      const user = users[userId];
      const assigneeName = user ? user.name : null;
      const assigneeAvatar = user ? user.avatar : null;
      
      // Map stageId to status
      let status = 'open';
      const stageId = item.stageId || '';
      
      // Standard Bitrix SPA stage mapping logic
      if (stageId.includes(':SUCCESS')) status = 'resolved';
      else if (stageId.includes(':FAIL')) status = 'closed';
      else if (stageId.includes('PROGRESS') || stageId.includes('PREPARATION')) status = 'in_progress';
      
      const displayStatusFromBitrix = statuses[stageId] || stageId;
      let displayStatus = displayStatusFromBitrix;
      
      // Check for overdue (Atrasada)
      const deadline = item.ufCrm32_1749145460;
      if (deadline && status !== 'resolved' && status !== 'closed') {
        const deadlineDate = new Date(deadline);
        if (deadlineDate < new Date()) {
          displayStatus = 'Atrasada';
        }
      }
      
      const companyId = item.companyId ? parseInt(item.companyId, 10) : null;
      // Prefer the direct company name field if available, fallback to fetched companies
      const clientName = item.ufCrm32_1752692198 || ((companyId && companies[companyId]) ? companies[companyId] : 'N/A');
      
      // Map priority
      let priority = 'medium';
      const classifId = item.ufCrm32_1749145337;
      if (classifId == 648) priority = 'high';
      else if (classifId == 650) priority = 'urgent';
      else if (classifId == 646) priority = 'medium';
      
      return {
        id: `${item.id}`,
        title: item.title || 'Sem título',
        assignee: assigneeName,
        assignee_avatar: assigneeAvatar,
        status: status,
        display_status: displayStatus,
        deadline: deadline, // Store the deadline
        created_at: item.createdTime,
        updated_at: item.updatedTime,
        client: clientName,
        priority: priority
      };
    });

    await upsertBitrixTickets(formattedTickets);

    return NextResponse.json({ success: true, count: formattedTickets.length });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ 
      error: `Erro na sincronização: ${error.message || "Failed to sync tickets"}`,
      details: error.toString(),
      success: false
    }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const assignee = searchParams.get('assignee') || '';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const { data, count } = await listBitrixTicketsFiltered({
      search: search || undefined,
      status: status || undefined,
      assignee: assignee || undefined,
      startDate,
      endDate,
      page,
      limit,
    });

    // Map database fields back to frontend expected format
    const formattedData = data.map((t: any) => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee,
      assigneeAvatar: t.assignee_avatar,
      status: t.status,
      displayStatus: t.display_status,
      deadline: t.deadline,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      empresa: t.client,
      priority: t.priority
    }));

    return NextResponse.json({
      tickets: formattedData,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500, headers: corsHeaders });
  }
}