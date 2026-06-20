import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

// Configurações do Firebase idênticas ao projeto automatiza-esteira
const firebaseConfig = {
    apiKey: "AIzaSyBrHOHIZE8zre7wpGOb8qYCgcSlmUuZu4c",
    authDomain: "automatiza-esteira.firebaseapp.com",
    projectId: "automatiza-esteira",
    storageBucket: "automatiza-esteira.firebasestorage.app",
    messagingSenderId: "498529833842",
    appId: "1:498529833842:web:b2a2e568aa39db1a0543eb",
    measurementId: "G-QTS0C3907Y",
};

// Evita re-inicializar o Firebase no Next.js durante Hot Reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export interface LancamentoPonto {
    id?: string;
    treinadorId: string;
    treinadorNome: string;
    tipoAcao: "treinamento" | "nova_doc" | "att_doc" | "ferramenta_aut" | "chamado_falha";
    pontos: number;
    descricao: string;
    dataLancamento: number;
    criadoPorId: string;
    criadoPorNome: string;
    // Campos adicionais de treinamento
    treinamentoEmpresa?: string;
    treinamentoTema?: string;
    treinamentoDataSolicitacao?: string;
    treinamentoDataRealizacao?: string;
    treinamentoTempoAgenda?: string;
    treinamentoSolicitante?: string;
    treinamentoNotas?: number[];
    treinamentoNotaMedia?: number | null;
}

// Busca todos os lançamentos de pontos
export async function obterPontosGamificacao(): Promise<LancamentoPonto[]> {
    try {
        const q = query(collection(db, "gamificacao_pontos"), orderBy("dataLancamento", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<LancamentoPonto, "id">),
        }));
    } catch (error) {
        console.error("Erro ao buscar pontos do Firestore:", error);
        return [];
    }
}
