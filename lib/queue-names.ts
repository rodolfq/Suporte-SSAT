/**
 * Comparação de nomes entre a tabela `operadores` (fila de chamados) e a lista
 * de colaboradores vinda dos dados importados.
 *
 * Os dois cadastros usam grafias diferentes para a mesma pessoa: a fila guarda
 * o primeiro nome ("Rafael") e a lista de colaboradores traz o nome completo
 * ("Rafael Leal"). Sem essa normalização, incluir um colaborador na fila
 * criaria um operador duplicado.
 */

export function normalizeName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Considera o mesmo analista quando os nomes são iguais ou quando um é prefixo
 * do outro em limite de palavra ("Rafael" x "Rafael Leal"). O limite de palavra
 * evita casar "Ana Julia" com "Ana Paula".
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.startsWith(`${nb} `) || nb.startsWith(`${na} `);
}
