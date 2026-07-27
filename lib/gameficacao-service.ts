import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';

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

// Busca todos os lançamentos de pontos (fetch único, sob demanda)
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

// Mantém os lançamentos de pontos em tempo real via listener do Firestore.
// Depois do snapshot inicial, o SDK só transmite os documentos que mudaram,
// o que é bem mais barato do que refazer um getDocs da coleção inteira a
// cada poucos segundos - e ainda chega mais rápido que qualquer polling.
// Retorna a função de unsubscribe (chamar no cleanup do efeito do chamador).
export function assinarPontosGamificacao(
    onData: (pontos: LancamentoPonto[]) => void,
    onError?: (error: unknown) => void
): () => void {
    const q = query(collection(db, "gamificacao_pontos"), orderBy("dataLancamento", "desc"));
    return onSnapshot(
        q,
        (snapshot) => {
            onData(snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<LancamentoPonto, "id">),
            })));
        },
        (error) => {
            console.error("Erro ao assinar pontos do Firestore:", error);
            onError?.(error);
        }
    );
}
