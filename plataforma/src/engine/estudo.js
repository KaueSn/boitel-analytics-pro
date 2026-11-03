// Estudo: qual opção combina com o capital (boitel, arrendar ou comprar terra) e qual região
// favorece cada uma. Só usa dados livres (INCRA, MAPA, IBGE) e os preços digitados pelo usuário.
// Comparação justa: mesmo capital e mesmo prazo (1 ano). O que não fica aplicado na operação
// rende CDI líquido. Nada aqui é recomendação de investimento.
import { modeloA, modeloB, modeloC } from './modelos.js';
import { calcularIR, porCabecaComprada, caixaPicoPorCabeca } from './lote.js';
import { aplicacaoCDI } from './rendaFixa.js';
import { REGIOES_VTN, vtnDoMunicipio } from './terra.js';
import { FRIGORIFICOS } from './frigorificos.js';
import { municipio, distanciaEstimadaKm, fretePorCabeca, cabecasPorViagem, CAMINHOES } from './logistica.js';
import { MUNICIPIOS } from './municipios.js';

// Estatuto da Terra (Lei 4.504/1964, art. 95, XII): até 15% do valor cadastral do imóvel por ano
// (até 30% em glebas de exploração intensiva). O valor cadastral é aproximado aqui pelo VTN.
export const TETO_ARRENDAMENTO = 0.15;
export const ESTUDO_PADRAO = { fatiaTerraMax: 0.5, areaMinimaHa: 5, raioKm: 200 };

export const cdiLiquidoAno = cdi => aplicacaoCDI({ capital: 1, cdiAnual: cdi, dias: 365 }).retornoLiquido;

function linha(id, nome, capital, cdi, m, extra = {}) {
  const empregado = m.viavel ? Math.min(capital, m.capitalEmpregado) : 0;
  const lucro = m.viavel ? m.lucroLiquidoAnual : 0;
  const rendimentoParado = (capital - empregado) * cdiLiquidoAno(cdi);
  const resultado = lucro + rendimentoParado;
  return {
    id, nome, viavel: m.viavel, capital, capitalEmpregado: empregado, cabecas: m.cabecas || 0,
    lucroAnual: lucro, rendimentoParado, resultado, retornoSobreCapital: capital > 0 ? resultado / capital : 0,
    notas: m.notas || [], ...extra
  };
}

/** Comprar a terra: parte do capital vira terra, o resto gira animais com pasto próprio. */
export function opcaoComprar(pL, pC, pPat, capital, cfg = ESTUDO_PADRAO) {
  const disponivel = capital * (1 - pL.reservaPct);
  const custoHa = pPat.precoHa * (1 + pPat.custosAquisicaoPct);
  const area = custoHa > 0 ? Math.min(pPat.areaHa, (disponivel * cfg.fatiaTerraMax) / custoHa) : 0;
  const capitalMinimo = (cfg.areaMinimaHa * custoHa) / cfg.fatiaTerraMax / (1 - pL.reservaPct);
  if (area < cfg.areaMinimaHa) {
    return { viavel: false, cabecas: 0, capitalEmpregado: 0, lucroLiquidoAnual: 0, capitalMinimo, area: 0,
      notas: [`Sem deixar a compra passar de ${Math.round(cfg.fatiaTerraMax * 100)}% do capital disponível, não cabem nem ${cfg.areaMinimaHa} ha a este preço.`] };
  }
  const gastoTerra = area * custoHa;
  const valorTerra = area * pPat.precoHa;
  const custosAno = pPat.custoFazendaHaAno * area + pPat.itrAliquota * valorTerra + pPat.maoDeObraFazendaMensal * 12;
  const base = { ...pL, capitalInicial: disponivel - gastoTerra, reservaPct: 0, cabecasFixas: 0 };
  const inicial = modeloC(base, pC);
  const cobertura = inicial.cabecas > 0 ? Math.min(1, (area * pPat.lotacaoCabHa) / inicial.cabecas) : 0;
  const c = modeloC(base, { ...pC, custoPastoCabMes: pC.custoPastoCabMes * (1 - cobertura) });
  const lucroOp = c.lucroOperacionalAnual - custosAno;
  const lucro = lucroOp - calcularIR(pL, lucroOp, c.receitaAnual);
  return {
    viavel: c.cabecas > 0, cabecas: c.cabecas, capitalEmpregado: gastoTerra + c.capitalEmpregado,
    lucroLiquidoAnual: lucro, capitalMinimo, area, gastoTerra, custosAno,
    valorizacaoAnual: valorTerra * pPat.valorizacaoTerraAnual,
    notas: [`Compra de ${area.toFixed(1).replace('.', ',')} ha. A terra continua sendo patrimônio, mas fica imobilizada: o resultado acima não conta valorização.`]
  };
}

/** Capital mínimo aproximado para um lote de uma carreta cheia de animais. */
function capitalMinimoBoitel(pL) {
  const cab = cabecasPorViagem(pL.pesoEntradaKg, CAMINHOES.carreta);
  return (caixaPicoPorCabeca(pL, porCabecaComprada(pL)).pico * cab) / (1 - pL.reservaPct);
}

function capitalMinimoRecria(pL, pC) {
  const c = modeloC({ ...pL, capitalInicial: 1e7, reservaPct: 0, cabecasFixas: 0 }, pC);
  return c.cabecas > 0 ? ((c.capitalEmpregado / c.cabecas) * cabecasPorViagem(pC.pesoCompraRecriaKg, CAMINHOES.carreta)) / (1 - pL.reservaPct) : Infinity;
}

/** Avalia as opções com um capital e aponta a de maior resultado no ano. */
export function compararOpcoes(pLote, pA, pC, pPat, capital = pLote.capitalInicial, cfg = ESTUDO_PADRAO) {
  const p = { ...pLote, capitalInicial: capital, cabecasFixas: 0 };
  const cdi = p.cdiAnual;
  const comprar = opcaoComprar(p, pC, pPat, capital, cfg);
  const a = modeloA(p, pA);
  const linhas = [
    linha('boitel', 'Boitel (sem terra)', capital, cdi, modeloB(p), { capitalMinimo: capitalMinimoBoitel(p), oQue: 'Compra os animais e terceiriza a engorda.' }),
    linha('arrendar_recria', 'Arrendar pasto: recria + boitel', capital, cdi, modeloC(p, pC), { capitalMinimo: capitalMinimoRecria(p, pC), oQue: 'Recria em pasto arrendado e termina no boitel.' }),
    linha('arrendar_confinamento', 'Arrendar área: confinamento próprio', capital, cdi, a, { capitalMinimo: a.capitalMinimo, oQue: 'Instala o confinamento em área arrendada.' }),
    linha('comprar', 'Comprar terra: recria + boitel', capital, cdi, comprar, { capitalMinimo: comprar.capitalMinimo, area: comprar.area, valorizacaoAnual: comprar.valorizacaoAnual || 0, oQue: 'Compra a terra e usa o resto do capital nos animais.' }),
    { id: 'cdi', nome: 'Renda fixa (100% do CDI)', viavel: true, capital, capitalEmpregado: 0, cabecas: 0, lucroAnual: 0, rendimentoParado: capital * cdiLiquidoAno(cdi), resultado: capital * cdiLiquidoAno(cdi), retornoSobreCapital: cdiLiquidoAno(cdi), capitalMinimo: 0, oQue: 'Deixa todo o capital aplicado, líquido de IR.', notas: ['Referência de custo de oportunidade: sem risco de preço, de animal nem de contrato.'] }
  ];
  const viaveis = linhas.filter(l => l.viavel);
  const melhor = viaveis.reduce((m, l) => (l.resultado > m.resultado ? l : m));
  const refCdi = linhas.find(l => l.id === 'cdi');
  const pecuaria = viaveis.filter(l => l.id !== 'cdi').sort((x, y) => y.resultado - x.resultado);
  return { capital, linhas, melhor, melhorPecuaria: pecuaria[0] || null, superaCdi: melhor.id !== 'cdi', diferencaCdi: melhor.resultado - refCdi.resultado };
}

/** Mostra como a melhor opção muda conforme o capital. */
export function varrerCapital(pLote, pA, pC, pPat, niveis = [100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000]) {
  const lista = [...new Set([...niveis, pLote.capitalInicial])].filter(c => c > 0).sort((a, b) => a - b);
  return lista.map(c => {
    const r = compararOpcoes(pLote, pA, pC, pPat, c);
    return { capital: c, seu: c === pLote.capitalInicial, melhor: r.melhor, melhorPecuaria: r.melhorPecuaria, viaveis: r.linhas.filter(l => l.viavel && l.id !== 'cdi').map(l => l.id) };
  });
}

// --- Regiões ---
const PESO_CAPACIDADE = { 'até 20': 20, '20 a 40': 30, '40 a 80': 60, 'mais de 80': 80 };
const UF_DE = new Map(MUNICIPIOS.map(m => [m[0], m[4]]));
const COORD_DE = new Map(MUNICIPIOS.map(m => [m[0], m]));
const CACHE = new Map();

function dadosRegioes(raioKm) {
  if (CACHE.has(raioKm)) return CACHE.get(raioKm);
  const plantas = FRIGORIFICOS.map(f => ({ sif: f[0], nome: f[1], municipio: f[2], uf: f[3], capacidade: PESO_CAPACIDADE[f[4]] || 20, cid: municipio(f[2], f[3]) })).filter(f => f.cid);
  const out = REGIOES_VTN.map(([cod, nome, min, med, max, codigos]) => {
    const pts = codigos.map(c => COORD_DE.get(c)).filter(Boolean);
    if (!pts.length) return null;
    const centro = [0, '', pts.reduce((s, x) => s + x[2], 0) / pts.length, pts.reduce((s, x) => s + x[3], 0) / pts.length];
    const contagem = {};
    for (const c of codigos) { const u = UF_DE.get(c); if (u) contagem[u] = (contagem[u] || 0) + 1; }
    const ufs = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a]);
    const dist = plantas.map(f => ({ f, km: distanciaEstimadaKm(centro, f.cid) })).sort((a, b) => a.km - b.km);
    const perto = dist.filter(d => d.km <= raioKm);
    return { cod, nome, min, med, max, ufs, uf: ufs[0], municipios: pts.length, frigorificos: perto.length, capacidade: perto.reduce((s, d) => s + d.f.capacidade, 0), distanciaKm: dist[0]?.km ?? Infinity, maisProximo: dist[0]?.f ?? null };
  }).filter(Boolean);
  const maxCap = Math.max(1, ...out.map(r => r.capacidade));
  const logs = out.map(r => Math.log(Math.max(1, r.med)));
  const [lo, hi] = [Math.min(...logs), Math.max(...logs)];
  for (const r of out) {
    r.notaAcesso = 0.5 * Math.sqrt(r.capacidade / maxCap) + 0.5 * (1 - Math.min(r.distanciaKm, raioKm) / raioKm);
    r.notaCusto = hi > lo ? 1 - (Math.log(Math.max(1, r.med)) - lo) / (hi - lo) : 1;
  }
  CACHE.set(raioKm, out);
  return out;
}

/**
 * Ranking de regiões rurais por opção. Critérios transparentes:
 * - boitel: 100% acesso a frigoríficos (quantos, capacidade e distância);
 * - arrendar: 50% custo da terra + 50% acesso; comprar: 60% custo + 40% acesso.
 * Não entram preço do boi nem da reposição (o usuário informa) nem oferta real de boitéis.
 */
export function rankingRegioes({ uf = '', raioKm = ESTUDO_PADRAO.raioKm, pesoAbateKg = 460, lotacaoCabHa = 1.5, areaHa = 100, custosAquisicaoPct = 0.05, limite = 8 } = {}) {
  const base = dadosRegioes(raioKm).filter(r => !uf || r.ufs.includes(uf));
  const enriquecer = r => ({
    ...r,
    freteAbate: Number.isFinite(r.distanciaKm) ? fretePorCabeca(r.distanciaKm, pesoAbateKg).porCabeca : null,
    tetoArrendamentoHa: r.med * TETO_ARRENDAMENTO,
    tetoArrendamentoCabMes: lotacaoCabHa > 0 ? (r.med * TETO_ARRENDAMENTO) / lotacaoCabHa / 12 : null,
    custoCompraArea: r.med * areaHa * (1 + custosAquisicaoPct)
  });
  const topo = nota => base.map(r => ({ ...enriquecer(r), nota: nota(r) })).sort((a, b) => b.nota - a.nota).slice(0, limite);
  return {
    uf, raioKm, total: base.length,
    boitel: topo(r => r.notaAcesso),
    arrendar: topo(r => 0.5 * r.notaCusto + 0.5 * r.notaAcesso),
    comprar: topo(r => 0.6 * r.notaCusto + 0.4 * r.notaAcesso)
  };
}

/** Dados da região rural de um município (para comparar a sua cidade com o ranking). */
export function regiaoDaCidade(codigoIbge, raioKm = ESTUDO_PADRAO.raioKm) {
  const v = vtnDoMunicipio(codigoIbge);
  return v ? dadosRegioes(raioKm).find(r => r.cod === v.cod) || null : null;
}

export const UFS_ESTUDO = [...new Set(MUNICIPIOS.map(m => m[4]))].sort();
