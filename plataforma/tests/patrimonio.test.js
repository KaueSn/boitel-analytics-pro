// Projeção patrimonial, fazenda, alertas de liquidez e caminhos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMISSAS_PADRAO } from '../src/engine/premissas.js';
import { projetarPatrimonio, PATRIMONIO_PADRAO, parcelaPrice } from '../src/engine/patrimonio.js';
import { compararCaminhos, conferirPremissas, aporteNecessario, checklistOportunidades, areaViavelPorAno } from '../src/engine/estrategias.js';
import { MODELO_C_PADRAO } from '../src/engine/modelos.js';
import { calcularLote } from '../src/engine/lote.js';

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (tol ${tol})`);
const L = (o = {}) => ({ ...PREMISSAS_PADRAO, ...o });
const PAT = (o = {}) => ({ ...PATRIMONIO_PADRAO, ...o });

test('parcela Price: 100.000 a 1% a.m. em 12x = 8.884,88', () => {
  perto(parcelaPrice(100000, 0.01, 12), 8884.878867, 1e-5);
  perto(parcelaPrice(1200, 0, 12), 100);
});

test('conservação de caixa: sem lotes e sem rendimento, nada muda', () => {
  const r = projetarPatrimonio(L({ capitalInicial: 0 }), PAT({ habilitarFazenda: false, horizonteAnos: 2 }));
  assert.equal(r.resumo.lotes, 0);
  for (const m of r.meses) assert.equal(m.caixa, 0);
});

test('patrimônio = caixa + estoque + terra − dívida em todo mês', () => {
  const r = projetarPatrimonio(L(), PAT({ formaPagamento: 'financiado', precoHa: 5000, areaHa: 20 }));
  for (const m of r.meses) {
    perto(m.ativosTotais, m.caixa + m.estoqueAnimais + m.terra, 1e-6);
    perto(m.patrimonioLiquido, m.ativosTotais - m.divida, 1e-6);
  }
});

test('reconciliação: PL final = capital + lucros + rendimentos − custos fazenda − juros − custos de aquisição + valorização', () => {
  const pp = PAT({ precoHa: 5000, areaHa: 20, formaPagamento: 'financiado', valorizacaoTerraAnual: 0.03 });
  const r = projetarPatrimonio(L(), pp);
  const s = r.resumo;
  const custosAq = r.resumo.terraFinal > 0 ? 5000 * Math.pow(1.03, r.eventos.find(e => e.tipo === 'fazenda').dia / 365) * 20 * pp.custosAquisicaoPct : 0;
  const esperado = 250000 + s.lucroLotes + s.rendimentoCaixa - s.custosFazenda - s.jurosPagos - custosAq + s.valorizacaoTerra;
  // o último mês pode ter um lote em aberto avaliado ao custo (não altera o PL)
  perto(s.patrimonioFinal, esperado, 1);
});

test('lotes sequenciais: número de lotes compatível com o giro', () => {
  const r = projetarPatrimonio(L(), PAT({ habilitarFazenda: false, habilitarRecria: false, horizonteAnos: 3 }));
  const giro = calcularLote(L()).giroDias;
  assert.ok(Math.abs(r.resumo.lotes - Math.floor(3 * 365 / giro)) <= 1, `lotes ${r.resumo.lotes}`);
  for (let i = 1; i < r.lotes.length; i++) assert.ok(r.lotes[i].inicio >= r.lotes[i - 1].fim);
});

test('reserva preservada: caixa nunca cai abaixo da reserva só por causa dos lotes', () => {
  const r = projetarPatrimonio(L(), PAT({ habilitarFazenda: false }));
  for (const m of r.meses) assert.ok(m.caixa >= 0.15 * 250000 * 0.999, `mês ${m.mes}: ${m.caixa}`);
});

test('fazenda cara não é comprada e gera aviso de adiamento', () => {
  const r = projetarPatrimonio(L(), PAT({ precoHa: 56800, areaHa: 100 }));
  assert.equal(r.resumo.anoCompraFazenda, null);
  assert.ok(r.alertas.some(a => a.mensagem.includes('adiada')));
});

test('compra forçada gera alerta de risco e caixa insuficiente', () => {
  const r = projetarPatrimonio(L(), PAT({ precoHa: 56800, areaHa: 10, forcarCompraAno: 5, anoMinimoFazenda: 5 }));
  assert.ok(r.resumo.anoCompraFazenda >= 5);
  assert.ok(r.alertas.some(a => a.tipo !== 'info'));
});

test('prejuízo sistemático reduz o patrimônio (caixa não fica artificialmente positivo)', () => {
  const r = projetarPatrimonio(L({ precoVendaArroba: 250 }), PAT({ habilitarFazenda: false, horizonteAnos: 3, rendimentoCaixaPctCdi: 0 }));
  assert.ok(r.resumo.patrimonioFinal < 250000);
  assert.ok(r.resumo.lucroLotes < 0);
  assert.ok(r.alertas.some(a => a.mensagem.includes('prejuízo')));
});

test('anos agregados batem com o último mês de cada ano', () => {
  const r = projetarPatrimonio(L(), PAT({ habilitarFazenda: false }));
  assert.equal(r.anos.length, 10);
  for (const a of r.anos) {
    const ultimo = r.meses.filter(m => m.ano === a.ano).pop();
    assert.equal(a.patrimonioLiquido, ultimo.patrimonioLiquido);
  }
  const soma = r.anos.reduce((s, a) => s + a.lucroLotesAno, 0);
  perto(soma, r.anos[r.anos.length - 1].lucroLotesAcum, 1e-6);
});

test('data inválida é rejeitada', () => {
  assert.throws(() => projetarPatrimonio(L(), PAT({ dataInicio: 'xx' })));
});

test('caminhos: inclui CDI e veredito para cada caminho', () => {
  const r = compararCaminhos(L(), PAT({ precoHa: 20000, areaHa: 30, horizonteAnos: 6 }), MODELO_C_PADRAO);
  assert.ok(r.caminhos.find(c => c.id === 'cdi'));
  for (const c of r.caminhos) assert.ok(typeof c.veredito === 'string' && c.veredito.length > 5);
});

test('aporte necessário: zero quando já viável; nulo ou positivo caso contrário', () => {
  const pp = PAT({ precoHa: 1000, areaHa: 10, horizonteAnos: 6 });
  assert.equal(aporteNecessario(L(), pp, MODELO_C_PADRAO, 6), 0);
  const caro = aporteNecessario(L(), PAT({ precoHa: 56800, areaHa: 50 }), MODELO_C_PADRAO, 6, 50000);
  assert.ok(caro === null || caro > 0);
});

test('conferência de premissas aponta preço de reposição desatualizado', () => {
  const c = conferirPremissas(L(), 'MG');
  const rep = c.itens.find(i => i.rotulo.includes('reposição'));
  assert.ok(rep.alerta && rep.desvio < -0.2, `desvio ${rep.desvio}`);
  assert.ok(c.relacaoTrocaMercado > c.relacaoTroca);
});

test('reposição interpolada: MG 320 kg = 14,76 − (20/75)×0,93 R$/kg', async () => {
  const { precoReposicaoKgInterpolado } = await import('../src/engine/mercado.js');
  perto(precoReposicaoKgInterpolado('MG', 320), 14.76 - (20 / 75) * 0.93, 1e-9);
  assert.equal(precoReposicaoKgInterpolado('MG', 200), 16.56);
  assert.equal(precoReposicaoKgInterpolado('MG', 400), 13.83);
  const c = conferirPremissas(L(), 'MG');
  perto(c.precoMercadoCompra, 320 * (14.76 - (20 / 75) * 0.93), 1e-6);
});

test('varredura peso × dias usa o preço de mercado e acha o melhor ROI', async () => {
  const { varrerPesoEDias } = await import('../src/engine/estrategias.js');
  const v = varrerPesoEDias(L({ precoVendaArroba: 371 }), 'MG');
  assert.equal(v.linhas.length, 6);
  assert.equal(v.linhas[0].celulas.length, 4);
  const todos = v.linhas.flatMap(l => l.celulas.filter(c => c.cabecas > 0).map(c => c.roiAnual));
  perto(v.melhor.roiAnual, Math.max(...todos));
});

test('checklist e área viável retornam dados', () => {
  assert.ok(checklistOportunidades(L()).length >= 8);
  const a = areaViavelPorAno(L(), PAT({ precoHa: 20000 }), MODELO_C_PADRAO);
  assert.equal(a.length, 10);
  assert.ok(a.every(x => x.areaHa >= 0));
});
