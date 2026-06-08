import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWeekend, 
  format 
} from 'date-fns';

export interface TrainingRow {
  atividade: string; // "Treinamento" or "Apoio Técnico"
  cliente: string;
  csatMedio: number;
  csat1: number;
  csat2: number;
  csat3: number;
  csat4: number;
  csat5: number;
  nota: number;
  dataRealizado: Date | null;
  dataPedido: Date | null;
  treinamento: string;
  solicitante: string;
  areaOrigem: string;
  tipoCliente: string; // "Implantação" or "Ongoing"
  qdteInicial: number;
  qdteFinal: number;
  pessoasTreinadas: number;
  tempo: number; // minutes
  uteis: number;
  participantes: string;
  colaborador: string; // Derived from sheet name
}

export interface CollaboratorTrainingStats {
  name: string;
  trainingsCount: number;
  techSupportCount: number;
  totalTimeHours: number;
  capacityUsedPercent: number;
  statusRealizados: number;
  statusCancelados: number;
  statusAusentes: number;
}

export interface TrainingDashboardStats {
  collaborators: CollaboratorTrainingStats[];
  totalRealizados: number;
  totalCancelados: number;
  totalAusentes: number;
  totalAgendas: number;
  statusDistribution: {
    realizados: number;
    cancelados: number;
    ausentes: number;
  };
}

// Helper to calculate working days in a month (excluding weekends)
export function getWorkingDaysInMonth(date: Date): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  return days.filter(day => !isWeekend(day)).length;
}

export async function fetchTrainingCSV(url: string, collaboratorName: string): Promise<TrainingRow[]> {
  if (!url) return [];
  
  try {
    // Basic URL normalization: If it's a regular sheet link, try to convert to CSV export
    let targetUrl = url.trim();
    if (targetUrl.includes('docs.google.com/spreadsheets/d/') && !targetUrl.includes('output=csv') && !targetUrl.includes('format=csv')) {
      // Extract ID and GID
      const idMatch = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = targetUrl.match(/gid=([0-9]+)/);
      if (idMatch) {
        const id = idMatch[1];
        const gid = gidMatch ? gidMatch[1] : '0';
        targetUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
      }
    }

    // Use the proxy to avoid CORS issues
    const proxyUrl = `/api/training/proxy?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to fetch CSV for ${collaboratorName}`);
    }
    
    const text = await response.text();
    if (!text || text.trim().startsWith('<!DOCTYPE html>')) {
      throw new Error(`Invalid CSV content for ${collaboratorName}. Check if the sheet is published to the web.`);
    }

    return parseTrainingCSV(text, collaboratorName);
  } catch (error: any) {
    console.error(`Error fetching training data for ${collaboratorName}:`, error);
    throw error;
  }
}

function parseTrainingCSV(csv: string, collaboratorName: string): TrainingRow[] {
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
  const rows = lines.slice(1);

  return rows.map(line => {
    const values = parseCSVLine(line);
    const row: any = { colaborador: collaboratorName };

    headers.forEach((header, index) => {
      const val = values[index] || '';
      switch (header) {
        case 'ATIVIDADE': row.atividade = val; break;
        case 'CLIENTE': row.cliente = val; break;
        case 'CSAT MÉDIO': row.csatMedio = parseFloat(val) || 0; break;
        case 'CSAT1': row.csat1 = parseInt(val) || 0; break;
        case 'CSAT2': row.csat2 = parseInt(val) || 0; break;
        case 'CSAT3': row.csat3 = parseInt(val) || 0; break;
        case 'CSAT4': row.csat4 = parseInt(val) || 0; break;
        case 'CSAT5': row.csat5 = parseInt(val) || 0; break;
        case 'NOTA': row.nota = parseFloat(val) || 0; break;
        case 'DATA (REALIZADO)': row.dataRealizado = parseDate(val); break;
        case 'DATA (PEDIDO)': row.dataPedido = parseDate(val); break;
        case 'TREINAMENTO': row.treinamento = val; break;
        case 'SOLICITANTE': row.solicitante = val; break;
        case 'ÁREA DE ORIGEM': row.areaOrigem = val; break;
        case 'TIPO DE CLIENTE': row.tipoCliente = val; break;
        case 'QDTE INICIAL': row.qdteInicial = parseInt(val) || 0; break;
        case 'QDTE FINAL': row.qdteFinal = parseInt(val) || 0; break;
        case 'PESSOAS TREINADAS': row.pessoasTreinadas = parseInt(val) || 0; break;
        case 'TEMPO': row.tempo = parseTime(val); break;
        case 'ÚTEIS': row.uteis = parseInt(val) || 0; break;
        case 'PARTICIPANTES': row.participantes = val; break;
      }
    });

    return row as TrainingRow;
  }).filter(r => r.atividade);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseTime(val: string): number {
  if (!val) return 0;
  // Handle formats like "01:30", "90", or "1.5"
  if (val.includes(':')) {
    const [h, m] = val.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return parseFloat(val) || 0;
}

export function calculateTrainingStats(allRows: TrainingRow[]): TrainingDashboardStats {
  const collabMap = new Map<string, TrainingRow[]>();
  allRows.forEach(row => {
    const rows = collabMap.get(row.colaborador) || [];
    rows.push(row);
    collabMap.set(row.colaborador, rows);
  });

  const workingDays = getWorkingDaysInMonth(new Date());
  const capacityTotalMinutes = 8 * 60 * workingDays;

  const collaborators: CollaboratorTrainingStats[] = Array.from(collabMap.entries()).map(([name, rows]) => {
    const trainings = rows.filter(r => r.atividade === 'Treinamento');
    const techSupport = rows.filter(r => r.atividade === 'Apoio Técnico');
    const totalTime = rows.reduce((acc, r) => acc + r.tempo, 0);

    // Status counts
    const realizados = rows.filter(r => r.treinamento?.toLowerCase().includes('realizado') || r.atividade === 'Treinamento').length;
    // Note: The prompt says "Realizados", "Cancelados", "Ausentes". 
    // I might need to check a specific column for status if it exists, 
    // but the prompt says "Consolidado com dados de todas as guias: Realizados, Cancelados, Ausentes".
    // I'll assume there's a status in the TREINAMENTO or ATIVIDADE column or similar.
    // Let's look at the prompt again: "Realizados", "Cancelados (antes do início)", "Ausentes (cliente não compareceu)".
    // I'll assume these are values in the 'TREINAMENTO' column or a status column if I missed it.
    // Actually, "TREINAMENTO" column might contain the status or the name of the training.
    // I'll look for these keywords in the 'treinamento' field.
    
    const cancelados = rows.filter(r => r.treinamento?.toLowerCase().includes('cancelado')).length;
    const ausentes = rows.filter(r => r.treinamento?.toLowerCase().includes('ausente')).length;

    return {
      name,
      trainingsCount: trainings.length,
      techSupportCount: techSupport.length,
      totalTimeHours: totalTime / 60,
      capacityUsedPercent: (totalTime / capacityTotalMinutes) * 100,
      statusRealizados: realizados,
      statusCancelados: cancelados,
      statusAusentes: ausentes
    };
  });

  const totalRealizados = collaborators.reduce((acc, c) => acc + c.statusRealizados, 0);
  const totalCancelados = collaborators.reduce((acc, c) => acc + c.statusCancelados, 0);
  const totalAusentes = collaborators.reduce((acc, c) => acc + c.statusAusentes, 0);

  return {
    collaborators,
    totalRealizados,
    totalCancelados,
    totalAusentes,
    totalAgendas: totalRealizados + totalCancelados + totalAusentes,
    statusDistribution: {
      realizados: totalRealizados,
      cancelados: totalCancelados,
      ausentes: totalAusentes
    }
  };
}