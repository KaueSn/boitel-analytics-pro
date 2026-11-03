// Estudo da melhor opção por capital e região.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMISSAS_PADRAO as P } from '../src/engine/premissas.js';
import { MODELO_A_PADRAO as A, MODELO_C_PADRAO as C, modeloB } from '../src/engine/modelos.js';
import { PATRIMONIO_PADRAO as PAT } from '../src/engine/patrimonio.js';
import { compararOpcoes, varrerCapital, opcaoComprar, rankingRegioes, regiaoDaCidade, TETO_ARRENDAMENTO, ESTUDO_PADRAO } from '../src/engine/estudo.js';
import { aplicacaoCDI } from '../src/engine/rendaFixa.js';
import { municipio } from '../src/engine/logistica.js';

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('CDI: resultado = capital × CDI líquido de 1 ano (IR 17,5%)', () => {
  const r = compararOpcoes(P, A, C, PAT, 250000);
  const cdi = r.linhas.find(l => l.id === 'cdi');
  perto(cdi.resultado, aplicacaoCDI({ capital: 250000, cdiAnual: P.cdiAnual, dias: 365 }).liquido);
  perto(cdi.resultado, 250000 * 0.1365 * 0.825, 1e-6);
});

test('boitel: lucro do modelo B + dinheiro parado rendendo CDI líquido', () => {
  const r = compararOpcoes(P, A, C, PAT, 250000);
  const b = r.linhas.find(l => l.id === 'boitel');
  const m = modeloB({ ...P, capitalInicial: 250000, cabecasFixas: 0 });
  perto(b.lucroAnual, m.lucroLiquidoAnual);
  perto(b.rendimentoParado, (250000 - m.capitalEmpregado) * 0.1365 * 0.825);
  perto(b.resultado, b.lucroAnual + b.rendimentoParado);
});

test('a melhor opção é a de maior resultado entre as viáveis', () => {
  for (const cap of [100000, 250000, 1000000, 5000000]) {
    const r = compararOpcoes(P, A, C, PAT, cap);
    const max = Math.max(...r.linhas.filter(l => l.viavel).map(l => l.resultado));
    perto(r.melhor.resultado, max);
    assert.equal(r.superaCdi, r.melhor.id !== 'cdi');
  }
});

test('confinamento próprio não é viável com pouco capital e passa a ser com muito', () => {
  const a = c => compararOpcoes(P, A, C, PAT, c).linhas.find(l => l.id === 'arrendar_confinamento');
  assert.equal(a(250000).viavel, false);
  assert.ok(a(250000).capitalMinimo > 250000);
  assert.equal(a(5000000).viavel, true);
});

test('comprar terra: limites e contas por hectare', () => {
  const pp = { ...PAT, precoHa: 8000, areaHa: 100, custosAquisicaoPct: 0.05 };
  // R$ 250 mil: disponível 212.500; até 50% = 106.250; custo/ha 8.400 → 12,65 ha
  const c = opcaoComprar(P, C, pp, 250000);
  perto(c.area, 106250 / 8400, 1e-9);
  perto(c.gastoTerra, 106250, 1e-6);
  perto(c.custosAno, 300 * c.area + 0.001 * c.area * 8000 + 3500 * 12, 1e-6);
  assert.ok(c.capitalEmpregado <= 212500 + 1e-6);
  // Terra cara: não cabem 5 ha
  const caro = opcaoComprar(P, C, { ...pp, precoHa: 60000 }, 250000);
  assert.equal(caro.viavel, false);
  perto(caro.capitalMinimo, (5 * 63000) / ESTUDO_PADRAO.fatiaTerraMax / 0.85, 1e-6);
  // Área pedida limita a compra quando o capital sobra
  assert.equal(opcaoComprar(P, C, { ...pp, areaHa: 10 }, 5000000).area, 10);
});

test('capital muda a resposta: varredura traz o capital do usuário marcado', () => {
  const v = varrerCapital({ ...P, capitalInicial: 300000 }, A, C, PAT);
  assert.ok(v.some(x => x.capital === 300000 && x.seu));
  for (let i = 1; i < v.length; i++) assert.ok(v[i].capital > v[i - 1].capital);
  assert.ok(v[v.length - 1].viaveis.length >= v[0].viaveis.length, 'mais capital não reduz as opções viáveis');
});

test('nada quebra com capital mínimo, prejuízo e terra de preço zero', () => {
  assert.doesNotThrow(() => compararOpcoes(P, A, C, PAT, 1000));
  assert.doesNotThrow(() => compararOpcoes({ ...P, precoVendaArroba: 100 }, A, C, PAT, 250000));
  const r = compararOpcoes(P, A, C, { ...PAT, precoHa: 0 }, 250000);
  assert.equal(r.linhas.find(l => l.id === 'comprar').viavel, false);
  for (const l of r.linhas) assert.ok(Number.isFinite(l.resultado));
});

test('regiões: ordem, filtro de estado e teto legal do arrendamento', () => {
  const r = rankingRegioes({ uf: 'MG' });
  for (const k of ['boitel', 'arrendar', 'comprar']) {
    assert.ok(r[k].length > 0);
    for (let i = 1; i < r[k].length; i++) assert.ok(r[k][i - 1].nota >= r[k][i].nota);
    for (const x of r[k]) { assert.ok(x.ufs.includes('MG')); assert.ok(x.nota >= 0 && x.nota <= 1); }
  }
  const a = r.arrendar[0];
  perto(a.tetoArrendamentoHa, a.med * TETO_ARRENDAMENTO);
  perto(a.tetoArrendamentoCabMes, (a.med * 0.15) / 1.5 / 12);
  assert.equal(TETO_ARRENDAMENTO, 0.15);
});

test('região da cidade e frigoríficos no raio', () => {
  const u = regiaoDaCidade(municipio('Uberlândia', 'MG')[0]);
  assert.equal(u.cod, 3106);
  assert.equal(u.med, 7978);
  assert.ok(u.frigorificos >= 3, 'Araguari fica perto');
  assert.equal(regiaoDaCidade(1), null);
  const menor = regiaoDaCidade(municipio('Uberlândia', 'MG')[0], 50);
  assert.ok(menor.frigorificos <= u.frigorificos, 'raio menor não encontra mais frigoríficos');
});
