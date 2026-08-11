export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || res.statusText, res.status, body.code);
  }
  return res.json();
}

/**
 * Cache de leitura do lado do cliente.
 *
 * Resolve dois desperdícios concretos:
 *
 * 1. **Requisições simultâneas iguais.** Vários componentes montam ao mesmo
 *    tempo e pedem a mesma URL; antes cada um abria sua própria conexão. Agora
 *    a segunda chamada reaproveita a promessa que já está em voo.
 * 2. **Releituras em sequência.** Trocar de tela e voltar, ou um efeito que
 *    dispara duas vezes, refazia a mesma consulta ao banco. Uma resposta é
 *    reaproveitada por `TTL_MS` desde que nada tenha sido gravado nesse meio.
 *
 * A invalidação é conservadora: qualquer escrita (POST/PUT/PATCH/DELETE) por
 * `apiSend` limpa o cache inteiro. É grosseiro de propósito — impede que uma
 * tela mostre dado velho logo depois de uma alteração, que seria muito pior do
 * que uma requisição a mais.
 */
const TTL_MS = 10_000;

type EntradaCache = { expiraEm: number; dado: unknown };

const cache = new Map<string, EntradaCache>();
const emVoo = new Map<string, Promise<unknown>>();

// Uma leitura que começou antes de uma escrita traz dado anterior a ela. Se
// gravasse no cache ao terminar, esse dado velho sobreviveria à invalidação.
// A geração marca em que "época" a leitura começou; só cacheia se ainda for a
// mesma quando a resposta chega.
let geracao = 0;

/** Descarta tudo que estiver em cache. Chamado a cada escrita. */
export function invalidateApiCache() {
  cache.clear();
  geracao++;
}

export async function apiGet<T = any>(url: string, options?: { noCache?: boolean }): Promise<T> {
  if (options?.noCache) {
    return handle<T>(await fetch(url));
  }

  const agora = Date.now();
  const emCache = cache.get(url);
  if (emCache && emCache.expiraEm > agora) {
    return emCache.dado as T;
  }

  const jaEmVoo = emVoo.get(url);
  if (jaEmVoo) return jaEmVoo as Promise<T>;

  const geracaoInicial = geracao;
  const requisicao = (async () => {
    try {
      const dado = await handle<T>(await fetch(url));
      if (geracao === geracaoInicial) {
        cache.set(url, { expiraEm: Date.now() + TTL_MS, dado });
      }
      return dado;
    } finally {
      emVoo.delete(url);
    }
  })();

  emVoo.set(url, requisicao);
  return requisicao;
}

export async function apiSend<T = any>(url: string, method: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Depois de gravar, nenhuma leitura anterior pode ser considerada válida.
  invalidateApiCache();

  return handle<T>(res);
}
