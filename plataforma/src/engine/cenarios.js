// Cenários, sensibilidade, pontos de equilíbrio e Monte Carlo sobre o lote.
// Os choques são HIPÓTESES editáveis, não previsões.
import { calcularLote } from './lote.js';
import { indiceSharpe } from './rendaFixa.js';
import { ESQUEMA_LOTE } from './premissas.js';

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

/** Choques: multiplicativos (fração) ou aditivos (pontos/dias), por variável. */
export const VARIAVEIS = {
  precoVenda: { rotulo: 'Preço da arroba', tipo: 'mult', aplicar: (p, x) => { p.precoVendaArroba *= 1 + x; } },
  precoCompra: { rotulo: 'Preço do boi magro', tipo: 'mult', aplicar: (p, x) => { p.precoCompraCab *= 1 + x; } },
  gmd: { rotulo: 'GMD', tipo: 'mult', aplicar: (p, x) => { p.gmdKg = Math.max(0, p.gmdKg * (1 + x)); } },
  custoBoitel: { rotulo: 'Custo do boitel / alimentação', tipo: 'mult', aplicar: (p, x) => { p.precoArrobaProduzida *= 1 + x; p.alimentacaoDia *= 1 + x; p.servicoDia *= 1 + x; } },
  rcSaida: { rotulo: 'Rendimento de carcaça (p.p.)', tipo: 'add', aplicar: (p, x) => { p.rcSaida = limitar(p.rcSaida + x, 0.3, 0.7); } },
  mortalidade: { rotulo: 'Mortalidade (p.p.)', tipo: 'add', aplicar: (p, x) => { p.mortalidadePct = limitar(p.mortalidadePct + x, 0, 1); } },
  diasCiclo: { rotulo: 'Duração do ciclo (dias)', tipo: 'add', aplicar: (p, x) => { p.diasCiclo = Math.round(limitar(p.diasCiclo + x, 1, 400)); } },
  frete: { rotulo: 'Frete e outras despesas', tipo: 'mult', aplicar: (p, x) => { p.freteEntradaCab *= 1 + x; p.freteSaidaCab *= 1 + x; p.outrasDespesasCab *= 1 + x; p.sanidadeCab *= 1 + x; } },
  cdi: { rotulo: 'CDI (p.p.)', tipo: 'add', aplicar: (p, x) => { p.cdiAnual = limitar(p.cdiAnual + x, 0, 1); } },
  prazoRecebimento: { rotulo: 'Atraso no recebimento (dias)', tipo: 'add', aplicar: (p, x) => { p.prazoRecebimentoDias = Math.round(limitar(p.prazoRecebimentoDias + x, 0, 365)); } }
};

export const CENARIOS_PADRAO = {
  pessimista: { nome: 'Pessimista', choques: { precoVenda: -0.15, precoCompra: 0.10, gmd: -0.15, custoBoitel: 0.15, rcSaida: -0.02, mortalidade: 0.02, frete: 0.20, cdi: 0.02, prazoRecebimento: 30 } },
  base: { nome: 'Base', choques: {} },
  otimista: { nome: 'Otimista', choques: { precoVenda: 0.10, precoCompra: -0.05, gmd: 0.05, custoBoitel: -0.05, rcSaida: 0.01, mortalidade: -0.005, frete: 0, cdi: -0.01, prazoRecebimento: 0 } }
};

export function aplicarChoques(p, choques = {}) {
  const q = { ...p };
  for (const [k, x] of Object.entries(choques)) {
    if (!VARIAVEIS[k] || !Number.isFinite(x) || x === 0) continue;
    VARIAVEIS[k].aplicar(q, x);
  }
  // Um choque não pode levar o valor para fora da faixa aceita pelo motor (ex.: GMD 2,9 + 10%)
  for (const [k, d] of Object.entries(ESQUEMA_LOTE)) {
    if (typeof q[k] !== 'number' || q[k] === p[k]) continue;
    if (d.max !== undefined) q[k] = Math.min(d.max, q[k]);
    if (d.min !== undefined) q[k] = Math.max(d.min, q[k]);
  }
  return q;
}

/** Roda os três cenários mantendo o MESMO número de cabeças do cenário base. */
export function rodarCenarios(p, cenarios = CENARIOS_PADRAO) {
  const base = calcularLote(p);
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : base.cabecas;
  const out = {};
  for (const [id, c] of Object.entries(cenarios)) {
    out[id] = { nome: c.nome, choques: c.choques, resultado: calcularLote({ ...aplicarChoques(p, c.choques), cabecasFixas: n }) };
  }
  return out;
}

/** Tornado: impacto no lucro líquido de cada variável isolada (−d / +d). */
export function tornado(p, deltas = { precoVenda: 0.1, precoCompra: 0.1, gmd: 0.1, custoBoitel: 0.1, rcSaida: 0.01, mortalidade: 0.01, diasCiclo: 15, frete: 0.2, prazoRecebimento: 30 }, metrica = 'lucroLiquido') {
  const base = calcularLote(p);
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : base.cabecas;
  const pFix = { ...p, cabecasFixas: n };
  const ref = base[metrica];
  const linhas = Object.entries(deltas).map(([k, d]) => {
    const baixo = calcularLote(aplicarChoques(pFix, { [k]: -d }))[metrica];
    const alto = calcularLote(aplicarChoques(pFix, { [k]: d }))[metrica];
    return { variavel: k, rotulo: VARIAVEIS[k].rotulo, delta: d, tipo: VARIAVEIS[k].tipo, baixo: baixo - ref, alto: alto - ref, amplitude: Math.abs(alto - baixo) };
  });
  return { referencia: ref, cabecas: n, linhas: linhas.sort((a, b) => b.amplitude - a.amplitude) };
}

/** Grade 2D: preço de venda × preço de compra → lucro líquido. */
export function gradeSensibilidade(p, vendas = [-0.2, -0.1, 0, 0.1, 0.2], compras = [-0.1, 0, 0.1, 0.2]) {
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : calcularLote(p).cabecas;
  return compras.map(dc => ({
    compra: p.precoCompraCab * (1 + dc), dc,
    valores: vendas.map(dv => {
      const r = calcularLote(aplicarChoques({ ...p, cabecasFixas: n }, { precoVenda: dv, precoCompra: dc }));
      return { venda: p.precoVendaArroba * (1 + dv), dv, lucroLiquido: r.lucroLiquido, roiCiclo: r.roiCiclo };
    })
  }));
}

/**
 * Valor de `campo` que zera a `metrica`, por bisseção (resultado monótono no intervalo).
 * Retorna null se não houver troca de sinal entre lo e hi.
 */
export function resolverEquilibrio(p, campo, lo, hi, metrica = 'lucroOperacional', iter = 80) {
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : calcularLote(p).cabecas;
  if (n === 0) return null; // sem animais não há equilíbrio a calcular
  const f = x => calcularLote({ ...p, cabecasFixas: n, [campo]: x })[metrica];
  let a = lo, b = hi, fa = f(a), fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if (Math.sign(fa) === Math.sign(fb)) return null;
  for (let i = 0; i < iter; i++) {
    const m = (a + b) / 2, fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; fb = fm; }
  }
  return (a + b) / 2;
}

// --- Monte Carlo ---
export function geradorSemente(seed = 42) {
  let s = seed >>> 0;
  return () => { // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function amostraTriangular(u, min, moda, max) {
  if (max === min) return min;
  const c = (moda - min) / (max - min);
  return u < c ? min + Math.sqrt(u * (max - min) * (moda - min)) : max - Math.sqrt((1 - u) * (max - min) * (max - moda));
}

/** Distribuições padrão: triangulares (mín, moda, máx) dos choques. HIPÓTESES do usuário. */
export const DISTRIBUICOES_PADRAO = {
  precoVenda: [-0.20, 0, 0.15],
  precoCompra: [-0.05, 0, 0.10],
  gmd: [-0.20, 0, 0.08],
  custoBoitel: [-0.05, 0, 0.15],
  rcSaida: [-0.02, 0, 0.01],
  mortalidade: [-0.007, 0, 0.03]
};

function percentil(ordenado, q) {
  if (!ordenado.length) return NaN;
  const i = (ordenado.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (i - lo);
}

export function monteCarlo(p, { iteracoes = 2000, semente = 42, distribuicoes = DISTRIBUICOES_PADRAO, correlacaoPrecos = 0 } = {}) {
  const base = calcularLote(p);
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : base.cabecas;
  const rnd = geradorSemente(semente);
  const lucros = [], rois = [];
  for (let i = 0; i < iteracoes; i++) {
    const choques = {};
    const uVenda = rnd();
    for (const [k, [a, m, b]] of Object.entries(distribuicoes)) {
      // correlação simples: o preço de compra pode reaproveitar o sorteio do preço de venda
      const u = k === 'precoCompra' && correlacaoPrecos > 0 && rnd() < correlacaoPrecos ? uVenda : (k === 'precoVenda' ? uVenda : rnd());
      choques[k] = amostraTriangular(u, a, m, b);
    }
    const r = calcularLote({ ...aplicarChoques(p, choques), cabecasFixas: n });
    lucros.push(r.lucroLiquido);
    rois.push(r.roiCiclo);
  }
  const ord = [...lucros].sort((a, b) => a - b);
  const media = lucros.reduce((s, x) => s + x, 0) / lucros.length;
  const nPrej = lucros.filter(x => x < 0).length;
  const nAbaixoCdi = rois.filter(x => x < base.cdiLiquidoPeriodo).length;
  const min = ord[0], max = ord[ord.length - 1];
  const bins = 24, larg = (max - min) / bins || 1;
  const histograma = Array.from({ length: bins }, (_, i) => ({ de: min + i * larg, ate: min + (i + 1) * larg, n: 0 }));
  for (const x of lucros) histograma[Math.min(bins - 1, Math.floor((x - min) / larg))].n++;
  return {
    iteracoes, semente, cabecas: n, distribuicoes,
    media, p5: percentil(ord, 0.05), p50: percentil(ord, 0.5), p95: percentil(ord, 0.95), min, max,
    probPrejuizo: nPrej / iteracoes,
    probAbaixoCdi: nAbaixoCdi / iteracoes,
    sharpeCiclo: indiceSharpe(rois, base.cdiLiquidoPeriodo),
    histograma,
    aviso: 'Probabilidades derivam das distribuições escolhidas, não de dados históricos estimados. Use como teste de estresse, não como previsão.'
  };
}
