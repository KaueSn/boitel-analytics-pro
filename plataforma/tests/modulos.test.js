// Hedge, renda fixa, cenários, modelos A/B/C e Monte Carlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMISSAS_PADRAO } from '../src/engine/premissas.js';
import { calcularLote } from '../src/engine/lote.js';
import { simularHedge, contratosTeoricos, resultadoNoPreco, black76Put, black76Call, cdfNormal, HEDGE_PADRAO } from '../src/engine/hedge.js';
import { aliquotaIRRendaFixa, aplicacaoCDI, indiceSharpe } from '../src/engine/rendaFixa.js';
import { aplicarChoques, rodarCenarios, tornado, resolverEquilibrio, monteCarlo, amostraTriangular, geradorSemente, gradeSensibilidade } from '../src/engine/cenarios.js';
import { compararModelos, modeloA, modeloB, modeloC, MODELO_A_PADRAO, MODELO_C_PADRAO } from '../src/engine/modelos.js';
import { taxaPeriodo, anualizar } from '../src/engine/unidades.js';

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (tol ${tol})`);
const P = (o = {}) => ({ ...PREMISSAS_PADRAO, ...o });

test('juros compostos: 13,65% a.a. em 365 d = 13,65%; anualizar é o inverso', () => {
  perto(taxaPeriodo(0.1365, 365), 0.1365);
  perto(taxaPeriodo(0.1365, 90), Math.pow(1.1365, 90 / 365) - 1);
  perto(anualizar(taxaPeriodo(0.2, 90), 90), 0.2, 1e-12);
  assert.equal(anualizar(-1, 90), -1);
});

test('IR regressivo nas faixas exatas', () => {
  assert.equal(aliquotaIRRendaFixa(180), 0.225);
  assert.equal(aliquotaIRRendaFixa(181), 0.20);
  assert.equal(aliquotaIRRendaFixa(360), 0.20);
  assert.equal(aliquotaIRRendaFixa(361), 0.175);
  assert.equal(aliquotaIRRendaFixa(720), 0.175);
  assert.equal(aliquotaIRRendaFixa(721), 0.15);
});

test('aplicação CDI: R$ 100.000 por 1 ano a 13,65% → líquido 11.261,25 (IR 17,5%)', () => {
  const r = aplicacaoCDI({ capital: 100000, cdiAnual: 0.1365, dias: 365 });
  perto(r.bruto, 13650, 1e-6);
  perto(r.ir, 13650 * 0.175, 1e-6);
  perto(r.liquido, 11261.25, 1e-6);
  const isento = aplicacaoCDI({ capital: 100000, cdiAnual: 0.1365, dias: 365, isentoIR: true });
  perto(isento.liquido, 13650, 1e-6);
});

test('Sharpe: média 0,1, taxa 0,05, dp 0,05 → 1', () => {
  perto(indiceSharpe([0.05, 0.1, 0.15], 0.05), 1);
  assert.equal(indiceSharpe([0.1, 0.1], 0.05), null);
});

test('contratos BGI: 330 @ por contrato e arredondamentos', () => {
  assert.deepEqual(contratosTeoricos(1000, 1, 'baixo'), { exato: 1000 / 330, contratos: 3, arrobasCobertas: 990 });
  assert.equal(contratosTeoricos(1000, 1, 'cima').contratos, 4);
  assert.equal(contratosTeoricos(200, 1, 'baixo').contratos, 0);
});

test('put: piso = strike − prêmio − custos + base (por arroba coberta)', () => {
  const h = { ...HEDGE_PADRAO, arrobasExpostas: 990, precoFuturoAtual: 380, strike: 370, premioPut: 8, custoPorContrato: 33, base: -5 };
  const queda = resultadoNoPreco(h, 3, 300); // preço desaba
  perto(queda.precoEfetivoPut, 370 - 8 - 33 / 330 - 5, 1e-9);
  const alta = resultadoNoPreco(h, 3, 450); // participa da alta, menos o prêmio
  perto(alta.precoEfetivoPut, 450 - 5 - 8 - 33 / 330, 1e-9);
  const fut = resultadoNoPreco(h, 3, 450);
  perto(fut.precoEfetivoFuturo, 380 - 5 - 33 / 330, 1e-9); // trava no futuro + base
  const sim = simularHedge(h);
  perto(sim.pisoPutPorArroba, 370 - 8 - 0.1 - 5, 1e-9);
  assert.equal(sim.grade.length, 13);
  assert.equal(sim.contratos, 3);
});

test('hedge sem dados de mercado avisa e não inventa valores', () => {
  const s = simularHedge({ ...HEDGE_PADRAO, arrobasExpostas: 600 });
  assert.ok(s.avisos.some(a => a.includes('preço futuro')));
  assert.ok(s.avisos.some(a => a.includes('strike')));
  assert.equal(s.premioTeorico, null);
  assert.ok(s.riscosResiduais.length >= 6);
});

test('Black-76: paridade put-call e valores de referência', () => {
  perto(cdfNormal(0), 0.5, 1e-7);
  perto(cdfNormal(1.96), 0.9750021, 1e-6);
  const F = 380, K = 370, s = 0.2, T = 0.25, r = 0.1365;
  const put = black76Put(F, K, s, T, r);
  perto(black76Call(F, K, s, T, r) - put, Math.exp(-r * T) * (F - K), 1e-9);
  assert.ok(put > 0 && put < K);
  assert.equal(black76Put(F, K, 0, T, r), 0); // σ=0 e fora do dinheiro → valor intrínseco
});

test('choques e cenários: base não altera; pessimista piora', () => {
  const p = P({ cabecasFixas: 40 });
  assert.deepEqual(aplicarChoques(p, {}), p);
  const q = aplicarChoques(p, { precoVenda: -0.1, rcSaida: 0.01, prazoRecebimento: 30 });
  perto(q.precoVendaArroba, 348 * 0.9);
  perto(q.rcSaida, 0.55);
  assert.equal(q.prazoRecebimentoDias, 30);
  const c = rodarCenarios(p);
  assert.ok(c.pessimista.resultado.lucroLiquido < c.base.resultado.lucroLiquido);
  assert.ok(c.otimista.resultado.lucroLiquido > c.base.resultado.lucroLiquido);
  assert.equal(c.pessimista.resultado.cabecas, 40);
});

test('tornado ordena por amplitude e preço da arroba é sensível', () => {
  const t = tornado(P({ cabecasFixas: 40 }));
  for (let i = 1; i < t.linhas.length; i++) assert.ok(t.linhas[i - 1].amplitude >= t.linhas[i].amplitude);
  const pv = t.linhas.find(l => l.variavel === 'precoVenda');
  assert.ok(pv.baixo < 0 && pv.alto > 0);
});

test('equilíbrio por bisseção bate com a fórmula fechada', () => {
  const p = P({ cabecasFixas: 40 });
  const fechado = calcularLote(p).precoEquilibrio;
  perto(resolverEquilibrio(p, 'precoVendaArroba', 100, 1000), fechado, 1e-6);
  const gmd = resolverEquilibrio(p, 'gmdKg', 0, 3);
  assert.ok(gmd === null || (gmd > 0 && gmd < 3));
  assert.equal(resolverEquilibrio(p, 'precoVendaArroba', 900, 1000), null);
});

test('grade 2D tem dimensões e monotonicidade esperadas', () => {
  const g = gradeSensibilidade(P({ cabecasFixas: 30 }));
  assert.equal(g.length, 4);
  assert.equal(g[0].valores.length, 5);
  assert.ok(g[0].valores[4].lucroLiquido > g[0].valores[0].lucroLiquido);
  assert.ok(g[0].valores[2].lucroLiquido > g[3].valores[2].lucroLiquido);
});

test('Monte Carlo: reprodutível pela semente e coerente', () => {
  const p = P({ cabecasFixas: 40 });
  const a = monteCarlo(p, { iteracoes: 500, semente: 7 });
  const b = monteCarlo(p, { iteracoes: 500, semente: 7 });
  assert.equal(a.media, b.media);
  assert.ok(a.p5 <= a.p50 && a.p50 <= a.p95);
  assert.ok(a.probPrejuizo >= 0 && a.probPrejuizo <= 1);
  assert.equal(a.histograma.reduce((s, h) => s + h.n, 0), 500);
  const r = geradorSemente(1);
  for (let i = 0; i < 1000; i++) { const x = amostraTriangular(r(), -1, 0, 2); assert.ok(x >= -1 && x <= 2); }
});

test('modelo B anual = lote × ciclos por ano', () => {
  const b = modeloB(P());
  const l = calcularLote(P());
  perto(b.lucroLiquidoAnual, l.lucroLiquido * l.ciclosAno);
  perto(l.ciclosAno, Math.min(365 / (90 + 0 + 15), 3));
});

test('modelo A: capital pequeno não paga instalações; capital grande viabiliza', () => {
  const pequeno = modeloA(P(), MODELO_A_PADRAO);
  assert.equal(pequeno.viavel, false);
  const grande = modeloA(P({ capitalInicial: 3000000 }), MODELO_A_PADRAO);
  assert.ok(grande.viavel);
  assert.ok(grande.capitalEmpregado <= 3000000 * 0.85 + 1e-6);
  assert.ok(grande.imobilizado > 0);
  perto(grande.fluxoCaixaAnual - grande.lucroLiquidoAnual, grande.depreciacaoAnual);
});

test('modelo C: peso pós-recria e ciclo mais longo', () => {
  const c = modeloC(P(), MODELO_C_PADRAO);
  perto(c.pesoFimRecria, 240 + 180 * (0.6 * 0.5 + 0.25 * 0.5));
  assert.equal(c.giroDias, 180 + 90 + 0 + 15);
  assert.ok(c.capitalEmpregado <= 212500 + 1e-6);
});

test('comparador devolve os três modelos e escolhe só entre viáveis', () => {
  const r = compararModelos(P());
  assert.deepEqual(r.linhas.map(l => l.modelo), ['A', 'B', 'C']);
  assert.notEqual(r.melhorPor.roiAnual, 'A');
});
