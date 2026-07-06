import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';

export async function GET(request: Request) {
  const customApiKey = request.headers.get('X-Odoo-API-Key');
  
  const url = process.env.ODOO_URL || 'https://systemsat.odoo.com';
  const db = process.env.ODOO_DB || 'systemsat';
  const username = process.env.ODOO_USERNAME || 'rodolfo.quintanilha@systemsat.com.br';
  const apiKey = customApiKey || process.env.ODOO_API_KEY || 'db4f5457cda7eea61b32868d74cf1320ee1d14db';

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const port = urlObj.port ? parseInt(urlObj.port) : 443;

    const commonClient = xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/common' });
    
    const uid = await new Promise<number>((resolve, reject) => {
      commonClient.methodCall('authenticate', [db, username, apiKey, {}], (error, value) => {
        if (error) {
          console.error('Auth error:', error);
          reject(error);
        } else resolve(value);
      });
    });

    if (!uid) {
      return NextResponse.json({ error: 'Falha na autenticação com o Odoo' }, { status: 401 });
    }

    const objectClient = xmlrpc.createSecureClient({ host, port, path: '/xmlrpc/2/object' });
    
    // Fetch all stages first to determine which ones are active (fold = false and not named "Resolvido", etc.)
    const stages = await new Promise<any[]>((resolve, reject) => {
      objectClient.methodCall('execute_kw', [
        db, uid, apiKey, 'helpdesk.stage', 'search_read', [[]], { fields: ['id', 'name', 'fold'] }
      ], (error, value) => {
        if (error) {
          console.error('Odoo stages fetch error:', error);
          reject(error);
        } else resolve(value);
      });
    });

    const activeStageIds = (stages || [])
      .filter(s => !s.fold && !['Resolvido', 'Fechado', 'Done', 'Closed'].includes(s.name))
      .map(s => s.id);

    const model = 'helpdesk.ticket';
    const domain = [
      ['stage_id', 'in', activeStageIds]
    ];
    // Fields requested by user: name (titulo), user_id (responsável), id (numero do chamado)
    // Plus create_date and write_date for sorting/updates
    const fields = ['id', 'name', 'user_id', 'stage_id', 'priority', 'create_date', 'write_date', 'team_id'];

    const limit = 100;
    let offset = 0;
    let allTickets: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const tickets = await new Promise<any[]>((resolve, reject) => {
        objectClient.methodCall('execute_kw', [
          db, uid, apiKey, model, 'search_read', [domain], 
          { 
            fields, 
            limit, 
            offset,
            order: 'write_date desc' // Sort by last update
          }
        ], (error, value) => {
          if (error) {
            console.error('Odoo execute_kw error:', error);
            reject(error);
          } else resolve(value);
        });
      });

      if (tickets && tickets.length > 0) {
        allTickets = [...allTickets, ...tickets];
        offset += limit;
        if (tickets.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Map Odoo fields to our OdooTicket interface
    const mappedTickets = allTickets.map(t => {
      const ticket_id = t.id;
      const link = `${url}/web#id=${ticket_id}&model=helpdesk.ticket&view_type=form`;
      
      return {
        id: ticket_id,
        name: t.name || 'Sem assunto',
        priority: String(t.priority || '0'),
        subject: t.name || 'Sem assunto',
        team: t.team_id ? t.team_id[1] : 'Sem Equipe',
        assignee: t.user_id ? t.user_id[1] : 'Não Atribuído',
        client: 'Desconhecido',
        sla_deadline: null,
        created_at: t.create_date || null,
        last_updated: t.write_date || null,
        stage: t.stage_id ? t.stage_id[1] : 'Sem Estágio',
        link: link,
        properties: t
      };
    });

    return NextResponse.json(mappedTickets);
  } catch (error: any) {
    console.error('Erro na integração com Odoo:', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao buscar tickets do Odoo' }, { status: 500 });
  }
}