// Conversões físicas e financeiras usadas por todo o motor.
// Convenção adotada: 1 arroba de carcaça = 15 kg de carcaça (padrão do mercado
// brasileiro de boi gordo, usado por CEPEA e B3). Não confundir com a "arroba
// de peso vivo" (30 kg vivo ≈ 15 kg de carcaça a 50% de rendimento).

export const KG_POR_ARROBA = 15;
export const DIAS_ANO = 365;
export const DIAS_MES = DIAS_ANO / 12;
export const TAMANHO_CONTRATO_BGI = 330; // arrobas líquidas por contrato (B3)

export function pesoCarcacaKg(pesoVivoKg, rendimentoCarcaca) {
  return pesoVivoKg * rendimentoCarcaca;
}

export function kgParaArrobas(kgCarcaca) {
  return kgCarcaca / KG_POR_ARROBA;
}

export function arrobasParaKg(arrobas) {
  return arrobas * KG_POR_ARROBA;
}

/** Arrobas de carcaça de um animal a partir do peso vivo e do rendimento (0–1). */
export function arrobasCarcaca(pesoVivoKg, rendimentoCarcaca) {
  return kgParaArrobas(pesoCarcacaKg(pesoVivoKg, rendimentoCarcaca));
}

/** Taxa composta equivalente para um período em dias corridos. */
export function taxaPeriodo(taxaAnual, dias) {
  if (dias <= 0) return 0;
  return Math.pow(1 + taxaAnual, dias / DIAS_ANO) - 1;
}

/** Anualiza um retorno de período (dias corridos). Retorna NaN para perda total. */
export function anualizar(retornoPeriodo, dias) {
  if (dias <= 0) return 0;
  if (retornoPeriodo <= -1) return -1;
  return Math.pow(1 + retornoPeriodo, DIAS_ANO / dias) - 1;
}

export function taxaMensal(taxaAnual) {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

/** Arredonda para centavos de forma estável (evita 0,1+0,2). */
export function centavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Divisão protegida: retorna `fallback` quando o divisor é zero ou não finito. */
export function divSegura(a, b, fallback = 0) {
  return b === 0 || !Number.isFinite(b) ? fallback : a / b;
}
