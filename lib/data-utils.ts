import fuzzysort from 'fuzzysort';
import * as XLSX from 'xlsx';

export interface SupportData {
  id?: string;
  colaborador: string;
  cliente: string;
  tempoResposta: number | null; // in minutes
  duracao: number | null; // in minutes
  avaliacao: number; // 1-5
  atendimentos: number; // Always 1 per row if valid
  mensagens: number; // Number of messages for filtering
  data: Date;
  source?: 'chat' | 'odoo' | 'bitrix';
  uploadId?: string;
  isExcluded?: boolean;
  exclusionReason?: string;
  rawData?: any;
  // Odoo specific fields
  stage?: string;
  slaDeadline?: Date | null;
  sourceFile?: string;
  importedAt?: string;
  // New fields for detailed chat metrics
  criadoEm?: Date | null;
  agenteRespondeuEm?: Date | null;
  agenteEncerrouEm?: Date | null;
  duracaoSegundos?: number | null;
  tempoRespostaSegundos?: number | null;
  avaliadoPelosClientes?: string | null;
  notes?: string | null;
}

export interface ProcessedResult {
  processed: SupportData[];
  allRows: SupportData[]; // Includes excluded rows for period calculation and raw view
  raw: RawSpreadsheetRow[];
  period: {
    start: Date;
    end: Date;
  };
  indicators?: {
    totalImported: number;
    totalIgnored: number;
    totalProcessed: number;
    totalDuplicates: number;
  };
  logs?: any[];
}

export interface ResponseRateBonusTier {
  id: string;
  minPercentage: number;
  bonusPoints: number;
}

export interface PointsBreakdown {
  volume: { count: number; points: number };
  quality: {
    fiveStars: { count: number; points: number };
    oneStar: { count: number; points: number };
    other: { count: number; points: number };
  };
  speed: {
    under1m: { count: number; points: number };
    under3m: { count: number; points: number };
    over3m: { count: number; points: number };
  };
  responseRateBonus: { tierId?: string; minPercentage?: number; bonusPoints: number };
  total: number;
}

export interface RankingPointsConfig {
  volume: number;
  fiveStars: number;
  oneStar: number;
  speedUnder1m: number;
  speedUnder3m: number;
  speedOver3m: number;
  volumeLimit: number;
  responseRateBonusTiers: ResponseRateBonusTier[];
}

export interface CollaboratorStats {
  name: string;
  avatarUrl?: string;
  avatarOptions?: any;
  totalAtendimentos: number;
  totalEvaluations: number;
  avgResponseTime: number;
  avgDuracao: number;
  avgRating: number;
  totalPoints: number;
  pointsBreakdown?: PointsBreakdown;
  score: number;
  rank?: number;
  badge?: 'Ouro' | 'Prata' | 'Bronze' | null;
  badges?: string[];
  goals?: {
    id: string;
    title: string;
    target: number;
    current: number;
    deadline: string;
  }[];
  metrics?: {
    speed: number;
    quality: number;
    volume: number;
    engagement: number;
  };
  responseRate?: number;
}

export const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
];

export interface CustomerStats {
  name: string;
  totalAtendimentos: number;
  totalEvaluations: number;
  responseRate: number;
}

export interface DashboardStats {
  totalAtendimentos: number;
  avgResponseTime: number;
  avgDuracao: number;
  avgRating: number;
  totalCollaborators: number;
  period: { start: Date; end: Date };
  totalAtendimentosValidos?: number;
  topEvaluatedCollaborators: CollaboratorStats[];
  leastEvaluatedCollaborators: CollaboratorStats[];
  mostResponsiveCustomers: CustomerStats[];
  leastResponsiveCustomers: CustomerStats[];
  allCustomers: CustomerStats[];
  fastestStarters: CollaboratorStats[];
  slowestStarters: CollaboratorStats[];
  hourlyDistribution: { hour: number; count: number }[];
}

const COLUMN_MAPPINGS = {
  id: ['#', 'ID', 'Chat ID', 'Ticket ID', 'Protocolo', 'Referência', 'Código', 'Nº', 'Num', 'No.', 'Chat'],
  colaborador: ['Colaborador', 'Agente', 'Atendente', 'Analista', 'Nome', 'Operador', 'Usuário do sistema', 'Atribuído a', 'Responsável', 'olaborador', 'laborador'],
  cliente: ['Cliente', 'Customer', 'Usuário', 'Nome do cliente', 'Destinatário', 'Empresa', 'Nome da Empresa'],
  tempoResposta: ['Tempo inicial de resposta', 'Tempo resposta', 'Primeira resposta', 'Response Time', 'SLA', 'Tempo inicial', 'Aguardando início', 'Tempo de resposta'],
  avaliacao: ['Avaliado pelos clientes', 'Avaliação cliente', 'Nota cliente', 'Rating', 'CSAT', 'Avaliação', 'Nota'],
  mensagens: ['Mensagens', 'Atendimentos', 'Tickets', 'Volume', 'Conversas', 'Interações', 'Qtd Mensagens', 'Qtd'],
  data: ['Criado em', 'Data', 'Timestamp', 'Date', 'Created At', 'Data de Criação', 'Data/Hora'],
  stage: ['Estágio', 'Stage', 'Status', 'Situação'],
  slaDeadline: ['SLA Deadline', 'Prazo SLA', 'Limite SLA', 'Vencimento SLA']
};

export const cleanHeader = (header: string): string => {
  if (!header) return '';
  let cleaned = String(header).trim();
  
  // Remove BOM and other non-printable chars at the start
  cleaned = cleaned.replace(/^[\uFEFF\u00EF\u00BB\u00BF\uFFFD\?]+/, '');
  
  // Handle common encoding artifacts
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Fix broken UTF-8 (ISO-8859-1 interpretation of UTF-8 bytes)
  if (cleaned.includes('Ð') || cleaned.includes('â') || cleaned.includes('Ã')) {
    try {
      const bytes = new Uint8Array(cleaned.split('').map(c => c.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      if (!/[\uFFFD]/.test(decoded)) {
        cleaned = decoded;
      }
    } catch (e) {}
  }
  
  return cleaned;
};

export const normalize = (s: string) => {
  if (!s) return '';
  
  // First clean the string from encoding artifacts
  let normalized = cleanHeader(String(s));
  
  // Convert Cyrillic characters to Latin equivalents for matching
  // С (U+0421) -> C, о (U+043E) -> o, л (U+043B) -> l, etc.
  const cyrillicMap: Record<string, string> = {
    '\u0421': 'C', // Cyrillic С
    '\u043E': 'o', // Cyrillic о
    '\u043B': 'l', // Cyrillic л
    '\u0430': 'a', // Cyrillic а
    '\u0432': 'v', // Cyrillic в
    '\u0438': 'i', // Cyrillic и
    '\u0440': 'p', // Cyrillic р
    '\u043D': 'n', // Cyrillic н
    '\u0434': 'd', // Cyrillic д
    '\u0442': 't', // Cyrillic т
    '\u043C': 'm', // Cyrillic м
    '\u043A': 'k', // Cyrillic к
  };
  normalized = normalized.replace(/[\u0400-\u04FF]/g, char => cyrillicMap[char] || char);
  
  normalized = normalized.toLowerCase();
  
  // Remove accents
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove all non-alphanumeric for robust matching, but keep '#' as it's a common ID header
  const result = normalized.replace(/[^a-z0-9#]/g, '');
  return result || normalized; // Fallback to normalized if result is empty (e.g. only symbols)
};

function parseCSV(text: string, delimiter: string) {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    const row: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

export interface RawSpreadsheetRow {
  [key: string]: any;
}

export interface ParseResult {
  processed: SupportData[];
  raw: RawSpreadsheetRow[];
}

export async function processOdooSpreadsheet(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        let workbook;
        
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        
        if (isCSV) {
          const text = new TextDecoder().decode(data);
          const delimiters = [',', ';', '\t', '|'];
          let bestDelimiter = ',';
          let maxCols = 0;
          const firstLine = text.split('\n')[0];
          
          for (const d of delimiters) {
            const cols = firstLine.split(d).length;
            if (cols > maxCols) {
              maxCols = cols;
              bestDelimiter = d;
            }
          }
          
          const rows = parseCSV(text, bestDelimiter);
          const ws = XLSX.utils.aoa_to_sheet(rows);
          workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
        } else {
          try {
            workbook = XLSX.read(data, { type: 'array', cellDates: true });
          } catch (readErr: any) {
            const errorMsg = String(readErr?.message || readErr || '');
            const isHtmlError = errorMsg.includes('Invalid HTML') || errorMsg.includes('could not find <table>');
            
            // Fallback: try to parse as CSV if it's a text file misidentified as binary or HTML
            try {
              const text = new TextDecoder().decode(data);
              // Simple check if it's likely text
              const isLikelyText = isHtmlError || !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 1000));
              
              if (isLikelyText) {
                const delimiters = [',', ';', '\t', '|'];
                let bestDelimiter = ',';
                let maxCols = 0;
                const firstLine = text.split('\n')[0];
                for (const d of delimiters) {
                  const cols = firstLine.split(d).length;
                  if (cols > maxCols) { maxCols = cols; bestDelimiter = d; }
                }
                
                const rows = parseCSV(text, bestDelimiter);
                if (rows.length > 0) {
                  const ws = XLSX.utils.aoa_to_sheet(rows);
                  workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
                } else {
                  throw readErr;
                }
              } else {
                throw readErr;
              }
            } catch (fallbackErr) {
              throw readErr;
            }
          }
        }
        
        let worksheet = null;
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
          if (range && range.e.r >= 0) {
            worksheet = ws;
            break;
          }
        }
        if (!worksheet) worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Get raw rows to find header and clean it
        const rawRowsForJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
        if (!rawRowsForJson || rawRowsForJson.length === 0) {
          return resolve([]);
        }
        
        // Find header row for Odoo (usually row 0, but let's be safe)
        let headerIndex = 0;
        const odooExpectedHeaders = ['Sequência', 'ID', 'Assunto', 'Cliente', 'Equipe', 'Atribuído', 'Estágio'];
        
        for (let i = 0; i < Math.min(rawRowsForJson.length, 10); i++) {
          const row = rawRowsForJson[i];
          if (!row || !Array.isArray(row)) continue;
          const rowText = row.map(c => normalize(String(c || '')));
          const matches = odooExpectedHeaders.filter(h => rowText.some(cell => cell.includes(normalize(h)))).length;
          if (matches >= 3) {
            headerIndex = i;
            break;
          }
        }
        
        const headerRow = rawRowsForJson[headerIndex].map(h => cleanHeader(String(h || '')));
        const dataRows = rawRowsForJson.slice(headerIndex + 1);
        
        const jsonData = dataRows.map(row => {
          const obj: any = {};
          headerRow.forEach((header, i) => {
            if (header) obj[header] = row[i];
          });
          return obj;
        }).filter(obj => Object.values(obj).some(v => v !== undefined && v !== null && v !== ''));

        if (jsonData.length === 0) {
          throw new Error('A planilha está vazia ou não possui dados válidos.');
        }

        const parsedTickets = jsonData.map((row: any) => {
          const getRawVal = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
            return key ? row[key] : undefined;
          };

          const getVal = (possibleKeys: string[]) => {
            const val = getRawVal(possibleKeys);
            if (val === undefined || val === null) return '';
            return String(val);
          };

          const parseExcelDate = (possibleKeys: string[]) => {
            const val = getRawVal(possibleKeys);
            if (val === undefined || val === null || val === '' || String(val).trim() === '') return null;
            
            if (typeof val === 'number') {
              const date = new Date((val - 25569) * 86400 * 1000);
              return isNaN(date.getTime()) ? null : date.toISOString();
            }
            
            try {
              const date = new Date(val);
              if (!isNaN(date.getTime())) return date.toISOString();
            } catch (e) {}
            
            const strVal = String(val).trim();
            return strVal ? strVal : null;
          };

          const parseProperties = (possibleKeys: string[]) => {
            const val = getRawVal(possibleKeys);
            if (val === undefined || val === null || val === '') return null;
            
            const strVal = String(val).trim();
            if (!strVal) return null;

            if (strVal.startsWith('{') && strVal.endsWith('}')) {
              try {
                const cleaned = strVal
                  .replace(/'/g, '"')
                  .replace(/: False/g, ': false')
                  .replace(/: True/g, ': true')
                  .replace(/: None/g, ': null');
                return JSON.parse(cleaned);
              } catch (e) {
                return strVal;
              }
            }
            return strVal;
          };

          const createdAt = parseExcelDate(['Criado em', 'Data de criação', 'Created At', 'Data', 'Date', 'Data de abertura']);
          
          return {
            id: getVal(['Sequência de IDs de chamados', 'ID', 'Sequência', 'Ticket ID', 'Id do chamado', 'Referência', 'Nº', 'Protocolo']),
            priority: getVal(['Prioridade', 'Priority']),
            subject: getVal(['Assunto', 'Título', 'Subject', 'Title', 'Nome', 'Chamado', 'Descrição curta']),
            team: getVal(['Equipe', 'Team', 'Departamento', 'Setor']),
            assignee: getVal(['Atribuído a', 'Responsável', 'Assignee', 'Atendente', 'Analista']),
            client: getVal(['Cliente', 'Empresa', 'Customer', 'Client', 'Parceiro']),
            sla_deadline: parseExcelDate(['Prazo do SLA', 'SLA', 'SLA Deadline', 'Limite SLA', 'Vencimento SLA', 'Prazo']),
            created_at: createdAt || new Date().toISOString(),
            last_updated: parseExcelDate(['Última atualização em', 'Atualizado em', 'Last Updated', 'Updated At', 'Data de alteração']),
            properties: parseProperties(['Propriedades', 'Properties', 'Campos extras']),
            stage: getVal(['Estágio', 'Status', 'Stage', 'Situação', 'Fase']),
          };
        }).filter(c => c.id);

        // Post-process to ensure subject is not empty and ID is clean
        const processedTickets = parsedTickets.map(t => {
          let id = String(t.id || '').trim();
          const subject = (t.subject || '').trim();

          // Fallback: If ID is missing or looks like a UUID, try to extract from subject (#12345)
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          if (!id || isUuid || id.length > 15) {
            const match = subject.match(/\(#(\d+)\)/) || subject.match(/#(\d+)/);
            if (match) {
              // If there are multiple matches, the one in parentheses is usually the Odoo ID
              const parenMatch = subject.match(/\(#(\d+)\)/);
              id = parenMatch ? parenMatch[1] : match[1];
            }
          }

          // Final cleanup: remove any non-numeric characters if it's supposed to be a numeric ID
          // but only if it's not already a valid ID format
          if (id && /^\d+$/.test(id.replace(/[^0-9]/g, ''))) {
            const numericOnly = id.replace(/[^0-9]/g, '');
            if (numericOnly.length > 0) id = numericOnly;
          }

          return {
            ...t,
            id: id || `odoo-${Math.random().toString(36).substr(2, 9)}`,
            subject: subject || `Chamado #${id}`
          };
        });

        resolve(processedTickets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function processSpreadsheet(file: File): Promise<ProcessedResult> {
  const filename = file.name;
  const importedAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        
        let workbook;
        const isCSV = filename.toLowerCase().endsWith('.csv');
        
        if (isCSV) {
          const text = new TextDecoder().decode(data);
          const delimiters = [',', ';', '\t', '|'];
          let bestDelimiter = ',';
          let maxCols = 0;
          const firstLine = text.split('\n')[0];
        
          for (const d of delimiters) {
            const cols = firstLine.split(d).length;
            if (cols > maxCols) {
              maxCols = cols;
              bestDelimiter = d;
            }
          }
          
          const rows = parseCSV(text, bestDelimiter);
          const ws = XLSX.utils.aoa_to_sheet(rows);
          workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
        } else {
          try {
            workbook = XLSX.read(data, { type: 'array', cellDates: true });
          } catch (readErr: any) {
            const errorMsg = String(readErr?.message || readErr || '');
            const isHtmlError = errorMsg.includes('Invalid HTML') || errorMsg.includes('could not find <table>');

            // Fallback for CSV disguised as XLS or misidentified formats
            try {
              const text = new TextDecoder().decode(data);
              // Simple check if it's likely text
              const isLikelyText = isHtmlError || !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text.slice(0, 1000));

              if (isLikelyText) {
                const delimiters = [',', ';', '\t', '|'];
                let bestDelimiter = ',';
                let maxCols = 0;
                const firstLine = text.split('\n')[0];
                for (const d of delimiters) {
                  const cols = firstLine.split(d).length;
                  if (cols > maxCols) { maxCols = cols; bestDelimiter = d; }
                }
                
                const rows = parseCSV(text, bestDelimiter);
                if (rows.length > 0) {
                  const ws = XLSX.utils.aoa_to_sheet(rows);
                  workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, ws, "Sheet1");
                } else {
                  throw readErr;
                }
              } else {
                throw readErr;
              }
            } catch (fallbackErr) {
              throw readErr;
            }
          }
        }
        
        let worksheet = null;
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
          if (range && range.e.r >= 0) {
            worksheet = ws;
            break;
          }
        }
        if (!worksheet) worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Get raw rows to find header and clean it
        const rawRowsForJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
        if (rawRowsForJson.length === 0) return resolve({ processed: [], allRows: [], raw: [], period: { start: new Date(), end: new Date() } });

        console.log('[Spreadsheet] First 5 rows of raw data:', rawRowsForJson.slice(0, 5));

        // Find header row (the one with most matches to our expected columns)
        let headerIndex = -1;
        let maxMatches = 0;
        
        for (let i = 0; i < Math.min(rawRowsForJson.length, 30); i++) {
          const row = rawRowsForJson[i];
          if (!row || !Array.isArray(row) || row.length < 2) continue;
          
          let matches = 0;
          const rowText = row.map(c => normalize(String(c || '')));
          
          for (const variations of Object.values(COLUMN_MAPPINGS)) {
            if (variations.some(v => {
              const nv = normalize(v);
              return nv !== '' && rowText.some(cell => cell === nv || cell.includes(nv));
            })) {
              matches++;
            }
          }
          
          if (matches > maxMatches) {
            maxMatches = matches;
            headerIndex = i;
          }
          if (matches >= 5) break; 
        }

        // Fallback: if no good header found, use the first row that has at least 3 non-empty cells
        if (headerIndex === -1 || maxMatches < 2) {
          console.log('[Spreadsheet] No clear header found, using fallback detection');
          for (let i = 0; i < Math.min(rawRowsForJson.length, 10); i++) {
            const row = rawRowsForJson[i];
            if (row && Array.isArray(row) && row.filter(c => String(c || '').trim().length > 0).length >= 3) {
              headerIndex = i;
              break;
            }
          }
        }

        if (headerIndex === -1) headerIndex = 0;
        console.log(`[Spreadsheet] Using row ${headerIndex} as header (Matches: ${maxMatches})`);

        const headerRow = rawRowsForJson[headerIndex].map(h => cleanHeader(String(h || '')));
        const dataRows = rawRowsForJson.slice(headerIndex + 1);
        
        console.log('[Spreadsheet] Cleaned headers:', headerRow);
        
        const json = dataRows.map(row => {
          const obj: any = {};
          headerRow.forEach((header, i) => {
            if (header) obj[header] = row[i];
          });
          return obj;
        }).filter(obj => Object.values(obj).some(v => v !== undefined && v !== null && v !== ''));

        if (json.length === 0) return resolve({ processed: [], allRows: [], raw: [], period: { start: new Date(), end: new Date() } });

        // Detect columns using the keys from the first row of json
        const keys = Object.keys(json[0]);
        const detectedColumns: Record<string, string> = {};
        const usedKeys = new Set<string>();

        console.log('[Spreadsheet] Detected keys:', keys);

        // 1. Exact matches (highest priority - check variations in order)
        for (const [target, variations] of Object.entries(COLUMN_MAPPINGS)) {
          for (const variation of variations) {
            const normalizedVariation = normalize(variation);
            const foundKey = keys.find(k => !usedKeys.has(k) && normalize(k) === normalizedVariation);
            if (foundKey) {
              detectedColumns[target] = foundKey;
              usedKeys.add(foundKey);
              console.log(`[Spreadsheet] Mapped "${target}" to column "${foundKey}" (Exact)`);
              break;
            }
          }
        }

        // 2. Partial matches for remaining targets
        for (const [target, variations] of Object.entries(COLUMN_MAPPINGS)) {
          if (detectedColumns[target]) continue;
          
          for (const variation of variations) {
            const normalizedVariation = normalize(variation);
            if (normalizedVariation.length < 3) continue;

            const foundKey = keys.find(k => !usedKeys.has(k) && normalize(k).includes(normalizedVariation));
            if (foundKey) {
              detectedColumns[target] = foundKey;
              usedKeys.add(foundKey);
              console.log(`[Spreadsheet] Mapped "${target}" to column "${foundKey}" (Partial)`);
              break;
            }
          }
        }

        // 2. Partial matches (medium priority)
        for (const [target, variations] of Object.entries(COLUMN_MAPPINGS)) {
          if (detectedColumns[target]) continue;
          
          for (const variation of variations) {
            const normalizedVariation = normalize(variation);
            const foundKey = keys.find(k => {
              if (usedKeys.has(k)) return false;
              const nk = normalize(k);
              if (!nk || nk.length < 3) return false;
// Special case for "Colaborador" which often gets corrupted at the start
               // Exclude timestamp columns with 'agente' (encerrou/respondeu) - they should NOT map to colaborador
               if (target === 'colaborador' && (nk.endsWith('olaborador') || nk.endsWith('laborador') || nk.includes('agente'))) {
                 // Skip if it's a timestamp column (encerrou/respondeu em)
                 if (nk.includes('encerrou') || nk.includes('respondeu')) return false;
                 return true;
               }
              return nk.includes(normalizedVariation) || normalizedVariation.includes(nk);
            });

            if (foundKey) {
              detectedColumns[target] = foundKey;
              usedKeys.add(foundKey);
              break;
            }
          }
        }

        // 3. Fuzzy match as last resort
        for (const [target, variations] of Object.entries(COLUMN_MAPPINGS)) {
          if (detectedColumns[target]) continue;

          const availableKeys = keys.filter(k => !usedKeys.has(k) && normalize(k));
          if (availableKeys.length === 0) continue;

          const results = variations.flatMap(v => fuzzysort.go(normalize(v), availableKeys.map(normalize)));
          if (results.length > 0) {
            const bestMatch = results.sort((a, b) => b.score - a.score)[0].target;
            const foundKey = availableKeys.find(k => normalize(k) === bestMatch);
            if (foundKey) {
              detectedColumns[target] = foundKey;
              usedKeys.add(foundKey);
            }
          }
        }

        // Determine if time columns are in seconds or minutes based on average value
        const isColumnInSeconds = (colKey: string) => {
          const colName = detectedColumns[colKey];
          if (!colName) return true;
          
          const colNameLower = colName.toLowerCase();
          if (colNameLower.includes('min')) return false;
          if (colNameLower.includes('seg') || colNameLower.includes('sec')) return true;
          
          let sum = 0;
          let count = 0;
          for (let i = 0; i < Math.min(json.length, 100); i++) {
            const val = json[i][colName];
            if (val !== undefined && val !== null && !String(val).includes(':') && !String(val).includes('m') && !String(val).includes('s')) {
              const num = parseFloat(String(val).replace(',', '.'));
              if (!isNaN(num) && num > 0) {
                sum += num;
                count++;
              }
            }
          }
          if (count > 0) {
            const avg = sum / count;
            // Typical response time: if avg > 60, likely seconds (large values). If avg < 5, likely seconds (small response times).
            // If 5-60, ambiguous - default to seconds for safety
            if (avg > 60) return true; // Large values are almost always seconds
            if (avg < 5) return true; // Small values are response times in seconds
          }
          return true; // Default to seconds
        };

        const tempoInSeconds = isColumnInSeconds('tempoResposta');
        const duracaoInSeconds = isColumnInSeconds('duracao');

        // Detect date format (DD/MM/YYYY vs MM/DD/YYYY)
        let dateFormat: 'DMY' | 'MDY' = 'DMY'; // Default to DMY for Brazil
        const dateCol = detectedColumns['data'];
        if (dateCol) {
          for (let i = 0; i < Math.min(json.length, 100); i++) {
            const val = String(json[i][dateCol] || '');
            const match = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
            if (match) {
              const p1 = parseInt(match[1]);
              const p2 = parseInt(match[2]);
              if (p1 > 12) { dateFormat = 'DMY'; break; }
              if (p2 > 12) { dateFormat = 'MDY'; break; }
            }
          }
        }

        const allRows: SupportData[] = json.map(row => {
          const val = (key: string) => {
            const colName = detectedColumns[key];
            return colName ? row[colName] : undefined;
          };
          
          const parseTimeValue = (raw: any, inSeconds: boolean) => {
            if (raw === undefined || raw === null || String(raw).trim() === '' || String(raw).trim() === '-') return null;
            
            const str = String(raw).trim().toLowerCase();
            
            // Handle formats like "1m 20s", "1h 20m 30s", "50s", "1m"
            if (str.includes('h') || str.includes('m') || str.includes('s')) {
              let minutes = 0;
              
              const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*h/);
              if (hoursMatch) minutes += parseFloat(hoursMatch[1]) * 60;
              
              const minsMatch = str.match(/(\d+(?:\.\d+)?)\s*m/);
              if (minsMatch) minutes += parseFloat(minsMatch[1]);
              
              const secsMatch = str.match(/(\d+(?:\.\d+)?)\s*s/);
              if (secsMatch) minutes += parseFloat(secsMatch[1]) / 60;
              
              if (minutes > 0 || str.includes('0m') || str.includes('0s')) {
                return minutes;
              }
            }
            
            // Handle HH:MM:SS or MM:SS
            if (str.includes(':')) {
              const parts = str.split(':').map(Number);
              if (parts.length === 3) {
                return (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
              } else if (parts.length === 2) {
                return (parts[0] || 0) + (parts[1] || 0) / 60;
              }
            }

            const num = parseFloat(str.replace(',', '.')) || 0;
            
            // Handle Excel serial time (fraction of a day)
            // If it's a number type from XLSX and it's a fraction < 1, it's likely a time
            if (typeof raw === 'number' && num > 0 && num < 1) {
              return num * 24 * 60;
            }

            return inSeconds ? num / 60 : num;
          };

          const tempo = parseTimeValue(val('tempoResposta'), tempoInSeconds);
          const duracao = parseTimeValue(val('duracao'), duracaoInSeconds);

          let dateVal = val('data');
          let parsedDate: Date | null = null;
          
          if (dateVal instanceof Date) {
            parsedDate = dateVal;
          } else if (typeof dateVal === 'string' && dateVal.trim()) {
            const cleanDate = dateVal.trim();
            
            // Explicitly handle DD/MM/YYYY or MM/DD/YYYY based on detection
            const ddmmyyyyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
            const match = cleanDate.match(ddmmyyyyRegex);
            
            if (match) {
              let day, month;
              if (dateFormat === 'DMY') {
                day = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
              } else {
                month = parseInt(match[1]) - 1;
                day = parseInt(match[2]);
              }
              let year = parseInt(match[3]);
              if (match[3].length === 2) year += 2000;
              
              const hour = match[4] ? parseInt(match[4]) : 0;
              const min = match[5] ? parseInt(match[5]) : 0;
              const sec = match[6] ? parseInt(match[6]) : 0;
              
              const d = new Date(year, month, day, hour, min, sec);
              if (!isNaN(d.getTime())) {
                parsedDate = d;
              }
            }
            
            // Fallback to standard parsing if regex didn't match or failed
            if (!parsedDate) {
              const d = new Date(cleanDate);
              if (!isNaN(d.getTime())) {
                parsedDate = d;
              }
            }
          } else if (typeof dateVal === 'number') {
            // Handle Excel serial dates
            parsedDate = XLSX.SSF.parse_date_code(dateVal) as any;
            if (parsedDate) {
              const d = new Date((parsedDate as any).y, (parsedDate as any).m - 1, (parsedDate as any).d, (parsedDate as any).H, (parsedDate as any).M, (parsedDate as any).S);
              parsedDate = d;
            }
          }

          const finalDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : null;

          let slaDeadline: Date | null = null;
          const rawSla = val('slaDeadline');
          if (rawSla instanceof Date) {
            slaDeadline = rawSla;
          } else if (typeof rawSla === 'string' && rawSla.trim()) {
            const d = new Date(rawSla);
            if (!isNaN(d.getTime())) slaDeadline = d;
          }

          const rawMensagens = val('mensagens');
          const numMensagens = parseInt(String(rawMensagens)) || 0;
          let collabName = String(val('colaborador') || '').trim();
          
          // Normalization for truncated collaborator names (e.g., "oborador")
          if (collabName.toLowerCase().includes('oborador')) {
            collabName = collabName.replace(/oborador/gi, '').trim();
            if (!collabName) collabName = 'Desconhecido';
          }
          
          const rowId = val('id') ? String(val('id')).trim() : undefined;
          
          const { isExcluded, reason: exclusionReason } = isRowExcluded({
            id: rowId,
            mensagens: numMensagens,
            colaborador: collabName,
            data: finalDate || undefined
          });

          // Extract raw seconds values for display in raw data view
          let rawDuracaoSegundos: number | null = null;
          let rawTempoRespostaSegundos: number | null = null;
          if (detectedColumns['duracao']) {
            const rawDuracao = val('duracao');
            if (rawDuracao !== undefined && rawDuracao !== null && String(rawDuracao).trim() !== '' && String(rawDuracao).trim() !== '-') {
              rawDuracaoSegundos = duracaoInSeconds ? parseFloat(String(rawDuracao).replace(',', '.')) : parseFloat(String(rawDuracao).replace(',', '.')) * 60;
            }
          }
          if (detectedColumns['tempoResposta']) {
            const rawTempo = val('tempoResposta');
            if (rawTempo !== undefined && rawTempo !== null && String(rawTempo).trim() !== '' && String(rawTempo).trim() !== '-') {
              rawTempoRespostaSegundos = tempoInSeconds ? parseFloat(String(rawTempo).replace(',', '.')) : parseFloat(String(rawTempo).replace(',', '.')) * 60;
            }
          }

          return {
            id: rowId,
            colaborador: collabName,
            cliente: String(val('cliente') || 'Desconhecido').trim(),
            tempoResposta: tempo,
            duracao: duracao,
            avaliacao: parseFloat(val('avaliacao')) || 0,
            atendimentos: 1,
            mensagens: numMensagens,
            data: finalDate || new Date(0),
            stage: val('stage') ? String(val('stage')) : undefined,
            slaDeadline,
            isExcluded,
            exclusionReason,
            duracaoSegundos: rawDuracaoSegundos,
            tempoRespostaSegundos: rawTempoRespostaSegundos,
            rawData: { ...row },
            source: 'chat',
            sourceFile: filename,
            importedAt: importedAt
          };
        });

        const processedData = allRows.filter(r => !r.isExcluded);
        
        const validDates = allRows.map(r => r.data.getTime()).filter(t => !isNaN(t));
        const period = {
          start: new Date(Math.min(...validDates)),
          end: new Date(Math.max(...validDates))
        };

        const indicators = {
          totalImported: processedData.length,
          totalIgnored: allRows.length - processedData.length,
          totalProcessed: allRows.length,
          totalDuplicates: 0
        };

        const logs = allRows
          .filter(r => r.isExcluded)
          .map(r => ({
            row: r.rawData,
            reason: r.exclusionReason
          }));

        resolve({
          processed: processedData,
          allRows,
          raw: json,
          period,
          indicators,
          logs
        });
      } catch (err) {
        console.error('Spreadsheet parsing error:', err);
        reject(err);
      }
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      reject(err);
    };
    reader.readAsArrayBuffer(file);
  });
}

export function isRowExcluded(row: Partial<SupportData>): { isExcluded: boolean; reason: string } {
  const numMensagens = row.mensagens || 0;
  const collabName = String(row.colaborador || '').trim();
  const rowDate = row.data;

  // RULE: Discard records with 0 messages (usually just headers or empty rows)
  if (numMensagens === 0) {
    return { isExcluded: true, reason: 'Sem mensagens' };
  }
  
  // RULE: Discard records with invalid or missing date ("Criado em")
  if (!rowDate || isNaN(rowDate.getTime()) || rowDate.getTime() === 0) {
    return { isExcluded: true, reason: 'Data inválida' };
  }
  
  // Basic validation for collaborator name
  if (!collabName || collabName.length < 3 || 
      collabName.toLowerCase() === 'undefined' || 
      collabName.toLowerCase() === 'null' ||
      collabName.toLowerCase() === 'invalido' ||
      collabName.toLowerCase() === 'inválido') {
    return { isExcluded: true, reason: 'Colaborador inválido' };
  }
  
  const forbiddenNames = ['total', 'média', 'media', 'grand total', 'subtotal', 'resultado'];
  if (forbiddenNames.some(f => collabName.toLowerCase().includes(f))) {
    return { isExcluded: true, reason: 'Nome reservado' };
  }

  return { isExcluded: false, reason: '' };
}

export function calculateStats(data: SupportData[], config?: RankingPointsConfig): { collaborators: CollaboratorStats[], dashboard: DashboardStats } {
  const volumeWeight = config?.volume !== undefined ? config.volume : 1;
  const fiveStarsWeight = config?.fiveStars !== undefined ? config.fiveStars : 10;
  const oneStarWeight = config?.oneStar !== undefined ? config.oneStar : -90;
  const speedUnder1mWeight = config?.speedUnder1m !== undefined ? config.speedUnder1m : 5;
  const speedUnder3mWeight = config?.speedUnder3m !== undefined ? config.speedUnder3m : 0.5;
  const speedOver3mWeight = config?.speedOver3m !== undefined ? config.speedOver3m : -1;

const collabMap = new Map<string, { 
     ratings: number[], 
     times: number[], 
     duracoes: number[], 
     count: number, 
     evaluationCount: number,
     points: number,
     breakdown: PointsBreakdown
   }>();
  const customerMap = new Map<string, { count: number, evaluations: number }>();
  const hourlyMap = new Map<number, number>();
  for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);

  const allDates = data.map(d => d.data.getTime()).filter(t => !isNaN(t) && t > 0);
  const period = allDates.length > 0 ? {
    start: new Date(Math.min(...allDates)),
    end: new Date(Math.max(...allDates))
  } : {
    start: new Date(),
    end: new Date()
  };

  const filteredData = data.filter(d => {
    // If the database already has an exclusion status, respect it
    if (d.isExcluded !== undefined && d.isExcluded) return false;
    
    // Safety check for name (covers existing data or data without explicit exclusion flag)
    const name = String(d.colaborador || '').trim();
    if (name.length < 3) return false;
    
    const lowerName = name.toLowerCase();
    if (['undefined', 'null', 'invalido', 'inválido'].includes(lowerName)) return false;
    if (['total', 'média', 'media', 'grand total', 'subtotal', 'resultado'].some(f => lowerName.includes(f))) return false;

    // Finally check the general exclusion logic
    const { isExcluded } = isRowExcluded(d);
    return !isExcluded;
  });

  filteredData.forEach(d => {
    // Collaborator stats
    if (!collabMap.has(d.colaborador)) {
collabMap.set(d.colaborador, { 
         ratings: [], times: [], duracoes: [], count: 0, evaluationCount: 0, points: 0,
         breakdown: {
           volume: { count: 0, points: 0 },
           quality: {
             fiveStars: { count: 0, points: 0 },
             oneStar: { count: 0, points: 0 },
             other: { count: 0, points: 0 }
           },
           speed: {
             under1m: { count: 0, points: 0 },
             under3m: { count: 0, points: 0 },
             over3m: { count: 0, points: 0 }
           },
           responseRateBonus: { bonusPoints: 0 },
           total: 0
         }
       });
    }
    const stats = collabMap.get(d.colaborador)!;
    
       // 1. Volume Points
       const volumePoints = volumeWeight * d.atendimentos;
       // Apply volume limit if configured (volumeLimit > 0 means limit is active)
       let limitedVolumePoints = volumePoints;
       if (config?.volumeLimit && config.volumeLimit > 0) {
         // Get current volume points for this collaborator
         const currentVolumePoints = stats.breakdown.volume.points;
         // Calculate how many more points can be added before reaching limit
         const remainingLimit = Math.max(0, config.volumeLimit - currentVolumePoints);
         // Limit the points to add to the remaining limit
         limitedVolumePoints = Math.min(volumePoints, remainingLimit);
       }
       
       stats.points += limitedVolumePoints;
       stats.breakdown.volume.count += d.atendimentos;
       stats.breakdown.volume.points += limitedVolumePoints;

    // 2. Quality Points
    if (d.avaliacao > 0) {
      stats.evaluationCount++;
      for (let i = 0; i < d.atendimentos; i++) {
        stats.ratings.push(d.avaliacao);
      }
      if (d.avaliacao === 5) {
        stats.points += fiveStarsWeight * d.atendimentos;
        stats.breakdown.quality.fiveStars.count += d.atendimentos;
        stats.breakdown.quality.fiveStars.points += fiveStarsWeight * d.atendimentos;
      } else if (d.avaliacao === 1) {
        stats.points += oneStarWeight * d.atendimentos;
        stats.breakdown.quality.oneStar.count += d.atendimentos;
        stats.breakdown.quality.oneStar.points += oneStarWeight * d.atendimentos;
      } else {
        stats.breakdown.quality.other.count += d.atendimentos;
      }
    }

    // 3. Speed Points
    if (d.tempoResposta !== null && d.tempoResposta >= 0) {
      if (d.tempoResposta < 1) {
        stats.points += speedUnder1mWeight * d.atendimentos;
        stats.breakdown.speed.under1m.count += d.atendimentos;
        stats.breakdown.speed.under1m.points += speedUnder1mWeight * d.atendimentos;
      } else if (d.tempoResposta < 3) {
        stats.points += speedUnder3mWeight * d.atendimentos;
        stats.breakdown.speed.under3m.count += d.atendimentos;
        stats.breakdown.speed.under3m.points += speedUnder3mWeight * d.atendimentos;
      } else {
        stats.points += speedOver3mWeight * d.atendimentos;
        stats.breakdown.speed.over3m.count += d.atendimentos;
        stats.breakdown.speed.over3m.points += speedOver3mWeight * d.atendimentos;
      }
    }

    if (d.tempoResposta !== null) {
      for (let i = 0; i < d.atendimentos; i++) {
        stats.times.push(d.tempoResposta);
      }
    }
    if (d.duracao !== null) {
      for (let i = 0; i < d.atendimentos; i++) {
        stats.duracoes.push(d.duracao);
      }
    }
    stats.count += d.atendimentos;
    stats.breakdown.total = stats.points;

    // Customer stats
    if (!customerMap.has(d.cliente)) {
      customerMap.set(d.cliente, { count: 0, evaluations: 0 });
    }
    const cStats = customerMap.get(d.cliente)!;
    cStats.count += d.atendimentos;
    if (d.avaliacao > 0) cStats.evaluations++;

    // Hourly distribution
    const hour = d.data.getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + d.atendimentos);
  });

  const collaborators: CollaboratorStats[] = Array.from(collabMap.entries()).map(([name, stats]) => {
    const totalAtendimentosWithRating = stats.ratings.length;
    const totalEvaluations = stats.evaluationCount;
    const responseRate = stats.count > 0 ? (totalEvaluations / stats.count) * 100 : 0;
    const avgRating = totalAtendimentosWithRating > 0 ? stats.ratings.reduce((a, b) => a + b, 0) / totalAtendimentosWithRating : 0;
    
    const totalAtendimentosWithTime = stats.times.length;
    const avgResponseTime = totalAtendimentosWithTime > 0 ? stats.times.reduce((a, b) => a + b, 0) / totalAtendimentosWithTime : 0;
    
    const totalAtendimentosWithDuracao = stats.duracoes.length;
    const avgDuracao = totalAtendimentosWithDuracao > 0 ? stats.duracoes.reduce((a, b) => a + b, 0) / totalAtendimentosWithDuracao : 0;
    
    // Calculate response rate bonus
    const responseRateBonusTiers = config?.responseRateBonusTiers || [];
    const sortedTiers = [...responseRateBonusTiers].sort((a, b) => b.minPercentage - a.minPercentage);
    const applicableTier = sortedTiers.find(tier => responseRate >= tier.minPercentage);
    const bonusPoints = applicableTier ? applicableTier.bonusPoints : 0;
    
    // Add bonus to points
    const finalPoints = stats.points + bonusPoints;
    stats.breakdown.responseRateBonus = {
      tierId: applicableTier?.id,
      minPercentage: applicableTier?.minPercentage,
      bonusPoints
    };
    stats.breakdown.total = finalPoints;
    
    return {
      name,
      totalAtendimentos: stats.count,
      totalEvaluations,
      avgRating,
      avgResponseTime,
      avgDuracao,
      totalPoints: finalPoints,
      pointsBreakdown: stats.breakdown,
      score: 0, // Will calculate below
      responseRate
    };
  });

  const customers: CustomerStats[] = Array.from(customerMap.entries()).map(([name, stats]) => ({
    name,
    totalAtendimentos: stats.count,
    totalEvaluations: stats.evaluations,
    responseRate: stats.count > 0 ? (stats.evaluations / stats.count) * 100 : 0
  }));

  // Normalize for score
  const maxVolume = Math.max(...collaborators.map(c => c.totalAtendimentos), 1);
  const minTime = Math.min(...collaborators.map(c => c.avgResponseTime), 1);
  const maxTime = Math.max(...collaborators.map(c => c.avgResponseTime), 1);
  
  const maxPoints = Math.max(...collaborators.map(c => c.totalPoints), 1);
  const minPoints = Math.min(...collaborators.map(c => c.totalPoints), 0);

  // Score is now a normalized percentage (0-100) based on total points
  collaborators.forEach(c => {
    if (maxPoints === minPoints) {
      c.score = 100;
    } else {
      c.score = Math.max(0, ((c.totalPoints - minPoints) / (maxPoints - minPoints)) * 100);
    }

    const normalizedVolume = c.totalAtendimentos / maxVolume;
    const normalizedSpeed = maxTime === minTime ? 1 : (maxTime - c.avgResponseTime) / (maxTime - minTime);
    
    c.metrics = {
      speed: Math.round(normalizedSpeed * 100),
      quality: Math.round((c.avgRating / 5) * 100),
      volume: Math.round(normalizedVolume * 100),
      engagement: Math.round((c.totalEvaluations / Math.max(c.totalAtendimentos, 1)) * 100)
    };
  });

  collaborators.sort((a, b) => b.totalPoints - a.totalPoints);
  collaborators.forEach((c, i) => {
    c.rank = i + 1;
    if (i === 0) c.badge = 'Ouro';
    else if (i === 1) c.badge = 'Prata';
    else if (i === 2) c.badge = 'Bronze';
    else c.badge = null;
  });

  const dashboard: DashboardStats = {
    totalAtendimentos: filteredData.reduce((acc, d) => acc + d.atendimentos, 0),
    avgResponseTime: filteredData.filter(d => d.tempoResposta !== null).reduce((acc, d) => acc + ((d.tempoResposta ?? 0) * d.atendimentos), 0) / Math.max(filteredData.filter(d => d.tempoResposta !== null).reduce((acc, d) => acc + d.atendimentos, 0), 1),
    avgDuracao: filteredData.filter(d => d.duracao !== null).reduce((acc, d) => acc + ((d.duracao ?? 0) * d.atendimentos), 0) / Math.max(filteredData.filter(d => d.duracao !== null).reduce((acc, d) => acc + d.atendimentos, 0), 1),
    avgRating: filteredData.filter(d => d.avaliacao > 0).length > 0 ? filteredData.filter(d => d.avaliacao > 0).reduce((acc, d) => acc + d.avaliacao, 0) / filteredData.filter(d => d.avaliacao > 0).length : 0,
    totalCollaborators: collaborators.length,
    period,
    totalAtendimentosValidos: filteredData.length,
    topEvaluatedCollaborators: [...collaborators].sort((a, b) => b.totalEvaluations - a.totalEvaluations).slice(0, 5),
    leastEvaluatedCollaborators: [...collaborators].sort((a, b) => a.totalEvaluations - b.totalEvaluations).slice(0, 5),
    mostResponsiveCustomers: [...customers].sort((a, b) => b.responseRate - a.responseRate).slice(0, 5),
    leastResponsiveCustomers: [...customers].sort((a, b) => a.responseRate - b.responseRate).slice(0, 5),
    allCustomers: [...customers].sort((a, b) => b.totalAtendimentos - a.totalAtendimentos),
    fastestStarters: [...collaborators].sort((a, b) => a.avgResponseTime - b.avgResponseTime).slice(0, 5),
    slowestStarters: [...collaborators].sort((a, b) => b.avgResponseTime - a.avgResponseTime).slice(0, 5),
    hourlyDistribution: Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour)
  };

  return { collaborators, dashboard };
}

export function generateInsights(collaborators: CollaboratorStats[], dashboard: DashboardStats): string[] {
  const insights: string[] = [];
  
  if (collaborators.length === 0) return [];

  const bestRating = [...collaborators].sort((a, b) => b.avgRating - a.avgRating)[0];
  const bestSpeed = [...collaborators].sort((a, b) => a.avgResponseTime - b.avgResponseTime)[0];
  const bestVolume = [...collaborators].sort((a, b) => b.totalAtendimentos - a.totalAtendimentos)[0];

  insights.push(`${bestSpeed.name} inicia o atendimento ${Math.round(((dashboard.avgResponseTime - bestSpeed.avgResponseTime) / dashboard.avgResponseTime) * 100)}% mais rápido que a média do time.`);
  
  const belowAvgRating = collaborators.filter(c => c.avgRating < dashboard.avgRating).length;
  if (belowAvgRating > 0) {
    insights.push(`${belowAvgRating} colaboradores estão abaixo da média de avaliação.`);
  }

  insights.push(`${bestVolume.name} possui o maior volume de atendimentos (${bestVolume.totalAtendimentos}).`);
  insights.push(`${bestRating.name} possui a melhor avaliação do time (${bestRating.avgRating.toFixed(1)}).`);

  return insights;
}