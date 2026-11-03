// Estado da simulação aberta + recálculo centralizado. A interface só lê `resultados`.
import { PREMISSAS_PADRAO, ESQUEMA_LOTE } from '../engine/premissas.js';
import { MODELO_A_PADRAO, MODELO_C_PADRAO, ESQUEMA_MODELO_A, ESQUEMA_MODELO_C, compararModelos } from '../engine/modelos.js';
import { PATRIMONIO_PADRAO, ESQUEMA_PATRIMONIO, projetarPatrimonio } from '../engine/patrimonio.js';
import { HEDGE_PADRAO, ESQUEMA_HEDGE, simularHedge } from '../engine/hedge.js';
import { CENARIOS_PADRAO, aplicarChoques, rodarCenarios } from '../engine/cenarios.js';
import { calcularLote } from '../engine/lote.js';
import { analisarPrecos } from '../engine/estrategias.js';
import { validar } from '../engine/validacao.js';
import { LOGISTICA_PADRAO, normalizarLogistica } from './abas-regiao.js';

export const VERSAO_FORMATO = 1;

export const ESQUEMAS = { lote: ESQUEMA_LOTE, modeloA: ESQUEMA_MODELO_A, modeloC: ESQUEMA_MODELO_C, patrimonio: ESQUEMA_PATRIMONIO, hedge: ESQUEMA_HEDGE };

export function estadoInicial() {
  return {
    versao: VERSAO_FORMATO,
    nome: 'Plano R$ 250 mil → fazenda',
    filtros: { cenario: 'base', modelo: 'B', logistica: { ...LOGISTICA_PADRAO } },
    lote: { ...PREMISSAS_PADRAO },
    modeloA: { ...MODELO_A_PADRAO },
    modeloC: { ...MODELO_C_PADRAO },
    patrimonio: { ...PATRIMONIO_PADRAO },
    hedge: { ...HEDGE_PADRAO },
    choques: structuredClone(CENARIOS_PADRAO)
  };
}

/** Normaliza um estado vindo de arquivo/armazenamento: só campos conhecidos, validados. */
export function normalizarEstado(bruto) {
  const base = estadoInicial();
  if (!bruto || typeof bruto !== 'object') return { estado: base, erros: ['Arquivo sem dados válidos.'] };
  const erros = [];
  const out = { ...base, nome: typeof bruto.nome === 'string' ? bruto.nome.slice(0, 120) : base.nome };
  for (const [k, esq] of Object.entries(ESQUEMAS)) {
    const r = validar(esq, bruto[k] || {});
    out[k] = r.valores;
    erros.push(...r.erros.map(e => `${k}: ${e.mensagem}`));
  }
  const f = bruto.filtros || {};
  out.filtros = {
    cenario: ['pessimista', 'base', 'otimista'].includes(f.cenario) ? f.cenario : 'base',
    modelo: ['A', 'B', 'C'].includes(f.modelo) ? f.modelo : 'B',
    logistica: normalizarLogistica(f.logistica)
  };
  if (bruto.choques && typeof bruto.choques === 'object') {
    for (const id of ['pessimista', 'otimista']) {
      const c = bruto.choques[id]?.choques;
      if (c && typeof c === 'object') {
        for (const [v, x] of Object.entries(c)) if (Number.isFinite(x) && v in out.choques[id].choques) out.choques[id].choques[v] = x;
      }
    }
  }
  return { estado: out, erros };
}

/** Premissas do lote já com os choques do cenário escolhido no filtro. */
export function loteNoCenario(estado) {
  return aplicarChoques(estado.lote, estado.choques[estado.filtros.cenario].choques);
}

/** Recalcula tudo o que é barato. Os cálculos pesados (Monte Carlo, caminhos) ficam sob demanda. */
export function recalcular(estado) {
  const erros = [];
  const val = {};
  for (const [k, esq] of Object.entries(ESQUEMAS)) {
    const r = validar(esq, estado[k]);
    val[k] = r.valores;
    erros.push(...r.erros);
  }
  if (erros.length) return { ok: false, erros };
  try {
    const pCen = aplicarChoques(val.lote, estado.choques[estado.filtros.cenario].choques);
    const lote = calcularLote(pCen);
    const loteDiaria = calcularLote({ ...pCen, modoCobranca: pCen.modoCobranca === 'diaria' ? 'arroba_produzida' : 'diaria', cabecasFixas: lote.cabecas });
    const projecao = projetarPatrimonio({ ...pCen, cabecasFixas: 0 }, val.patrimonio, val.modeloC);
    const modelos = compararModelos(pCen, val.modeloA, val.modeloC);
    const cenarios = rodarCenarios(val.lote, estado.choques);
    const hedge = simularHedge({ ...val.hedge, arrobasExpostas: val.hedge.arrobasExpostas || lote.arrobasVendidas });
    const precos = analisarPrecos(val.lote);
    return { ok: true, erros: [], p: pCen, lote, loteAlternativo: loteDiaria, projecao, modelos, cenarios, hedge, precos, val };
  } catch (e) {
    return { ok: false, erros: [{ campo: '', mensagem: e.message }] };
  }
}
