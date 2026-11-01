// Testes do lote com valores calculados à mão (ver docs/FORMULAS.md, exemplo 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularLote, porCabecaComprada } from '../src/engine/lote.js';
import { calcularAnimal } from '../src/engine/zootecnia.js';
import { PREMISSAS_PADRAO } from '../src/engine/premissas.js';
import { arrobasCarcaca, kgParaArrobas, arrobasParaKg } from '../src/engine/unidades.js';
import { ErroValidacao } from '../src/engine/validacao.js';

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (tol ${tol})`);
const base = (o = {}) => ({ ...PREMISSAS_PADRAO, ...o });

test('conversões kg ↔ arroba usam 15 kg de carcaça', () => {
  assert.equal(kgParaArrobas(15), 1);
  assert.equal(arrobasParaKg(16.704), 250.56);
  perto(arrobasCarcaca(464, 0.54), 16.704);
  perto(arrobasCarcaca(320, 0.5), 10.666666666666666);
});

test('animal: 320 kg + 1,6 kg/d × 90 d = 464 kg; 6,0373 @ produzidas', () => {
  const a = calcularAnimal(base());
  assert.equal(a.ganhoKg, 144);
  assert.equal(a.pesoSaidaKg, 464);
  perto(a.arrobasSaida, 16.704);
  perto(a.arrobasEntrada, 160 / 15);
  perto(a.arrobasProduzidas, 16.704 - 160 / 15);
  perto(a.rendimentoGanho, (250.56 - 160) / 144); // 62,9%
  assert.deepEqual(a.avisos, []);
});

test('quebra de peso reduz o peso de abate antes do rendimento', () => {
  const a = calcularAnimal(base({ quebraPesoPct: 0.03 }));
  perto(a.pesoAbateKg, 464 * 0.97);
  perto(a.arrobasSaida, 464 * 0.97 * 0.54 / 15);
});

test('lote de 100 cabeças: DRE confere com o cálculo manual', () => {
  const r = calcularLote(base({ cabecasFixas: 100 }));
  // manual por cabeça comprada (mortalidade 1%)
  const prod = 16.704 - 160 / 15;
  const boitel = 0.99 * prod * 266.62;
  const receita = 0.99 * 16.704 * 348;
  const custo = 3328 + 33.28 + 205 + 45 + 25 + boitel + 0.99 * 205;
  const lucroOp = receita * (1 - 0.015) - custo;
  perto(r.receitaBruta, 100 * receita, 1e-6);
  perto(r.deducoes, 100 * receita * 0.015, 1e-6);
  perto(r.custoOperacional, 100 * custo, 1e-6);
  perto(r.lucroOperacional, 100 * lucroOp, 1e-6);
  perto(r.ir, 100 * lucroOp * 0.275, 1e-6);
  perto(r.lucroLiquido, 100 * lucroOp * 0.725, 1e-6);
  perto(r.lucroOperacional, 23573.2, 0.5); // valor de referência do exemplo manual
  assert.equal(r.cabecas, 100);
  perto(r.cabecasVivas, 99);
  perto(r.arrobasVendidas, 99 * 16.704);
});

test('DRE: soma das linhas fecha no lucro econômico (sem dupla contagem)', () => {
  const r = calcularLote(base({ cabecasFixas: 37 }));
  const linhas = r.dre.filter(l => l.tipo === 'receita' || l.tipo === 'deducao' || l.tipo === 'custo' || l.tipo === 'economico');
  perto(linhas.reduce((s, l) => s + l.valor, 0), r.lucroEconomico, 1e-6);
});

test('modo arroba ignora dieta; modo diária ignora preço por @', () => {
  const a = calcularLote(base({ cabecasFixas: 10, alimentacaoDia: 150, servicoDia: 150 }));
  const b = calcularLote(base({ cabecasFixas: 10 }));
  perto(a.lucroOperacional, b.lucroOperacional);
  const d1 = calcularLote(base({ cabecasFixas: 10, modoCobranca: 'diaria', precoArrobaProduzida: 0 }));
  const d2 = calcularLote(base({ cabecasFixas: 10, modoCobranca: 'diaria', precoArrobaProduzida: 1999 }));
  perto(d1.lucroOperacional, d2.lucroOperacional);
  // diária: (0,99×90 + 0,01×90×0,5) dias × (12 + 3,85) por cabeça
  perto(d1.totais.alimentacao + d1.totais.servico, 10 * (0.99 * 90 + 0.01 * 45) * 15.85, 1e-6);
});

test('dimensionamento: cabeças = piso(capital produtivo / caixa pico por cabeça)', () => {
  const r = calcularLote(base());
  const c = porCabecaComprada(r.premissas, r.animal);
  const pico = c.aquisicao + c.comissaoCompra + c.freteEntrada + c.sanidade + c.outras + c.boitelArroba + c.freteSaida;
  assert.equal(r.cabecas, Math.floor(212500 / pico));
  assert.ok(r.capitalEmpregado <= 212500);
  assert.ok(r.caixaMinimo >= r.reserva - 1e-9, 'reserva preservada');
  const final = calcularLote(base({ boitelPagamento: 'final' }));
  assert.ok(final.cabecas > r.cabecas, 'acerto no final permite lote maior');
});

test('ponto de equilíbrio do preço zera o lucro operacional', () => {
  const r = calcularLote(base({ cabecasFixas: 50 }));
  const eq = calcularLote(base({ cabecasFixas: 50, precoVendaArroba: r.precoEquilibrio }));
  perto(eq.lucroOperacional, 0, 1e-6);
  const eqc = calcularLote(base({ cabecasFixas: 50, precoCompraCab: r.compraEquilibrio }));
  perto(eqc.lucroOperacional, 0, 1e-6);
});

test('cenário de prejuízo: IR zero, avisos e caixa coerentes', () => {
  const r = calcularLote(base({ cabecasFixas: 30, precoVendaArroba: 250 }));
  assert.ok(r.lucroOperacional < 0);
  assert.equal(r.ir, 0);
  assert.equal(r.lucroLiquido, r.lucroOperacional);
  assert.ok(r.avisos.some(a => a.includes('prejuízo')));
  assert.equal(r.paybackMeses, Infinity);
});

test('mortalidade 100%: sem receita, perda = todo o custo, sem NaN', () => {
  const r = calcularLote(base({ cabecasFixas: 10, mortalidadePct: 1 }));
  assert.equal(r.receitaBruta, 0);
  assert.equal(r.cabecasVivas, 0);
  perto(r.lucroOperacional, -r.custoOperacional);
  assert.ok(Number.isNaN(r.custoArrobaProduzida));
  assert.equal(r.precoEquilibrio, Infinity);
  assert.ok(Number.isFinite(r.roiCiclo));
});

test('capital zero → 0 cabeças, aviso e nenhum NaN no resultado', () => {
  const r = calcularLote(base({ capitalInicial: 0 }));
  assert.equal(r.cabecas, 0);
  assert.equal(r.lucroLiquido, 0);
  assert.equal(r.roiCiclo, 0);
  assert.ok(r.avisos.some(a => a.includes('insuficiente')));
});

test('atraso no recebimento aumenta o custo de oportunidade e o giro', () => {
  const a = calcularLote(base({ cabecasFixas: 30 }));
  const b = calcularLote(base({ cabecasFixas: 30, prazoRecebimentoDias: 30 }));
  assert.ok(b.custoOportunidade > a.custoOportunidade);
  assert.equal(b.giroDias, a.giroDias + 30);
  perto(a.lucroOperacional, b.lucroOperacional);
});

test('consistência por cabeça × n = lote', () => {
  const r = calcularLote(base({ cabecasFixas: 73 }));
  perto(r.porCabeca.receitaBruta * 73, r.receitaBruta, 1e-6);
  perto(r.margemPorCabeca * 73, r.lucroOperacional, 1e-6);
  perto(r.margemPorArroba * r.arrobasVendidas, r.lucroOperacional, 1e-6);
});

test('entradas inválidas são rejeitadas com mensagem', () => {
  assert.throws(() => calcularLote(base({ gmdKg: -1 })), ErroValidacao);
  assert.throws(() => calcularLote(base({ diasCiclo: 'abc' })), ErroValidacao);
  assert.throws(() => calcularLote(base({ modoCobranca: 'outro' })), ErroValidacao);
  // vírgula decimal é aceita
  const r = calcularLote(base({ gmdKg: '1,6', cabecasFixas: 1 }));
  assert.equal(r.premissas.gmdKg, 1.6);
});

test('regimes de IR', () => {
  const pres = calcularLote(base({ cabecasFixas: 10, regimeIR: 'pf_presumido' }));
  perto(pres.ir, pres.receitaBruta * 0.2 * 0.275);
  const nenhum = calcularLote(base({ cabecasFixas: 10, regimeIR: 'nenhum' }));
  assert.equal(nenhum.ir, 0);
});
