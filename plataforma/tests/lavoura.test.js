// Estudo de plantio: valores conferidos à mão (contas nos comentários).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREMISSAS_PADRAO as P } from '../src/engine/premissas.js';
import { MODELO_A_PADRAO as A, MODELO_C_PADRAO as C } from '../src/engine/modelos.js';
import { PATRIMONIO_PADRAO as PAT } from '../src/engine/patrimonio.js';
import { compararOpcoes } from '../src/engine/estudo.js';
import { ATIVIDADES, CULTURAS, camposDaCultura, compararComPecuaria, estudarLavoura, referenciaTerra, sensibilidadeLavoura, validarLavoura } from '../src/engine/lavoura.js';
import { municipio } from '../src/engine/logistica.js';
import { vtnDoMunicipio } from '../src/engine/terra.js';
import { responder } from '../src/ui/assistente-base.js';
import fs from 'node:fs';

const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
// Funrural 1,5%, IR 27,5% sobre o resultado, reserva 15%, CDI 13,65% (líquido: 13,65% × 0,825 = 11,26125%).
const p = { ...P, funruralPct: 0.015, regimeIR: 'pf_resultado', aliquotaIR: 0.275, reservaPct: 0.15, cdiAnual: 0.1365 };
const CDI = 0.1126125;

const SOJA = { cultura: 'soja', areaHa: 100, produtividade: 60, preco: 120, custoVenda: 5, insumos: 2500, operacoes: 1000, maoDeObra: 200, outros: 300, arrendamento: 800, mesesCapital: 8 };
const CAFE = { cultura: 'cafe_arabica', areaHa: 10, produtividade: 40, preco: 1500, custoVenda: 20, insumos: 20000, operacoes: 6000, maoDeObra: 3000, outros: 1000, implantacao: 40000, manutencaoFormacao: 8000, anosFormacao: 2, vidaUtilAnos: 20 };
const CANA = { cultura: 'cana', areaHa: 50, produtividade: 80, preco: 150, custoVenda: 10, insumos: 4000, operacoes: 2000, implantacao: 10000, anosFormacao: 1, vidaUtilAnos: 6 };
const TOMATE = { cultura: 'tomate', areaHa: 2, produtividade: 3000, preco: 50, custoVenda: 2, insumos: 60000, operacoes: 10000, maoDeObra: 20000, mesesCapital: 10, ciclos: 2 };
const ILP = { ...SOJA, cultura: 'ilp_soja', mesesCapital: 6, lotacao: 2, compraCab: 3000, vendaCab: 4200, custoCab: 600, mesesGado: 5 };

test('grãos: soja por hectare e no ano', () => {
  const r = estudarLavoura(SOJA, p, 1000000);
  // Receita 60 × 120 = 7.200; Funrural 108; frete 60 × 5 = 300; custeio 4.000; arrendamento 800.
  perto(r.porHa.receita, 7200);
  perto(r.porHa.margem, 7200 - 108 - 300 - 4000 - 800); // 1.992
  perto(r.lucroOperacional, 199200);
  perto(r.ir, 199200 * 0.275); // 54.780
  perto(r.lucro, 144420);
  perto(r.porHa.resultado, 1444.2);
  perto(r.capitalEmpregado, 480000); // (4.000 + 800) × 100
  assert.equal(r.viavel, true);
  perto(r.capitalMinimo, 480000 / 0.85);
});

test('grãos: dinheiro volta a render CDI nos meses fora da lavoura', () => {
  const r = estudarLavoura(SOJA, p, 1000000);
  // (1.000.000 × 12 − 480.000 × 8) ÷ 12 = 680.000 parados no ano.
  perto(r.rendimentoParado, 680000 * CDI); // 76.576,50
  perto(r.resultado, 144420 + 76576.5);
  perto(r.retornoSobreCapital, 220996.5 / 1000000);
});

test('equilíbrio: preço e produtividade que zeram o resultado operacional', () => {
  const r = estudarLavoura(SOJA, p, 1000000);
  perto(r.precoEquilibrio, 510000 / 5910); // custos 5.100/ha × 100 ÷ (60 × 100 × 0,985)
  perto(r.produtividadeEquilibrio, 4800 / (120 * 0.985 - 5)); // 4.800/ha fixos ÷ ganho por saca 113,20 = 42,40
  perto(estudarLavoura({ ...SOJA, preco: r.precoEquilibrio }, p, 1000000).lucroOperacional, 0, 1e-6);
  perto(estudarLavoura({ ...SOJA, produtividade: r.produtividadeEquilibrio }, p, 1000000).lucroOperacional, 0, 1e-6);
});

test('café: média por ano na vida toda, contando os anos sem colheita', () => {
  const r = estudarLavoura(CAFE, p, 1200000);
  // Em produção: 60.000 − 900 − 800 − 30.000 = 28.300/ha. Formação: 40.000 + 8.000 × 2 = 56.000/ha.
  perto(r.perene.margemProducaoHa, 28300);
  perto(r.perene.formacaoHa, 56000);
  perto(r.porHa.margem, (18 * 28300 - 56000) / 20); // 22.670
  perto(r.porHa.receita, 54000); // 60.000 × 18/20
  perto(r.lucroOperacional, 226700);
  perto(r.lucro, 226700 * 0.725); // 164.357,50
  perto(r.capitalEmpregado, 860000); // (56.000 + 30.000) × 10
  perto(r.rendimentoParado, 340000 * CDI); // preso o ano inteiro: só o que sobra rende
  perto(r.resultado, 164357.5 + 38288.25);
  assert.equal(r.perene.primeiraColheitaAno, 3);
  perto(r.perene.caixaAno1Ha, -48000);
  perto(r.perene.anosParaRecuperar, 2 + 56000 / 28300);
  // Preço de equilíbrio: (56.000 + 18 × 30.800) ÷ (18 × 40 × 0,985)
  perto(r.precoEquilibrio, (56000 + 18 * 30800) / (18 * 40 * 0.985));
});

test('cana: arrendamento pesa também no ano sem corte', () => {
  const r = estudarLavoura({ ...CANA, arrendamento: 1000 }, p, 2000000);
  // Em produção: 12.000 − 180 − 800 − 6.000 − 1.000 = 4.020. Formação: 10.000 + 1.000 = 11.000.
  perto(r.perene.margemProducaoHa, 4020);
  perto(r.perene.formacaoHa, 11000);
  perto(r.porHa.margem, (5 * 4020 - 11000) / 6); // 1.516,67
  perto(r.capitalEmpregado, (11000 + 7000) * 50); // 900.000
  perto(r.perene.caixaAno1Ha, -11000);
});

test('perene sem ano de espera: o caixa do ano 1 já tem a colheita', () => {
  const r = estudarLavoura({ ...CANA, anosFormacao: 0 }, p, 2000000);
  // Em produção: 12.000 − 180 − 800 − 6.000 = 5.020. Ano 1: 5.020 − 10.000.
  perto(r.perene.caixaAno1Ha, -4980);
  assert.equal(r.perene.primeiraColheitaAno, 1);
});

test('hortifrúti: vários ciclos no ano reaproveitam o mesmo capital', () => {
  const r = estudarLavoura(TOMATE, p, 500000);
  // Receita 3.000 × 2 × 50 = 300.000; Funrural 4.500; frete 12.000; custeio 90.000 × 2 = 180.000.
  perto(r.porHa.margem, 300000 - 4500 - 12000 - 180000); // 103.500
  perto(r.lucroOperacional, 207000);
  perto(r.capitalEmpregado, 180000); // 1 ciclo × 2 ha
  perto(r.rendimentoParado, ((500000 * 12 - 180000 * 10) / 12) * CDI); // 350.000 parados
});

test('integração: soma lavoura e gado e usa o maior pico de caixa', () => {
  const r = estudarLavoura(ILP, p, 1000000);
  // Soja 1.992/ha; gado (4.200 × 0,985 − 3.600) × 2 = 1.074/ha.
  perto(r.porHa.margem, 3066);
  perto(r.porHa.receita, 15600);
  perto(r.lucroOperacional, 306600);
  perto(r.lucro, 222285);
  perto(r.capitalEmpregado, 720000); // maior entre soja 4.800 e gado 7.200, × 100
  // (12.000.000 − 480.000 × 6 − 720.000 × 5) ÷ 12 = 460.000 parados.
  perto(r.rendimentoParado, 460000 * CDI); // 51.801,75
  perto(r.resultado, 274086.75);
});

test('máquinas: depreciação sai do resultado e o capital fica preso o ano todo', () => {
  const r = estudarLavoura({ ...SOJA, investimento: 120000, vidaInvestimentoAnos: 10 }, p, 1000000);
  // 120.000 ÷ 10 anos = 12.000 por ano.
  perto(r.depreciacaoAno, 12000);
  perto(r.lucroOperacional, 187200);
  perto(r.capitalEmpregado, 600000);
  perto(r.rendimentoParado, ((12000000 - 3840000 - 1440000) / 12) * CDI); // 560.000 parados
});

test('capital insuficiente: não cabe, tudo fica no CDI e mostra a área possível', () => {
  const r = estudarLavoura(SOJA, p, 400000);
  assert.equal(r.viavel, false);
  perto(r.rendimentoParado, 400000 * CDI);
  perto(r.resultado, 400000 * CDI);
  perto(r.areaMaxima, 340000 / 4800); // 70,83 ha
});

test('prejuízo não gera IR, mas o presumido incide sobre a receita', () => {
  const ruim = { ...SOJA, preco: 60 };
  const r = estudarLavoura(ruim, p, 1000000);
  assert.ok(r.lucroOperacional < 0);
  assert.equal(r.ir, 0);
  const pres = estudarLavoura(ruim, { ...p, regimeIR: 'pf_presumido' }, 1000000);
  perto(pres.ir, 360000 * 0.2 * 0.275); // receita 60 × 60 × 100
});

test('sensibilidade: quedas de 20% conferem com a conta direta', () => {
  const s = sensibilidadeLavoura(SOJA, p, 1000000);
  // Preço 96: 5.760 − 86,40 − 300 − 4.800 = 573,60/ha.
  perto(s[2].lucro, 57360 * 0.725);
  // Produtividade 48: 5.760 − 86,40 − 240 − 4.800 = 633,60/ha.
  perto(s[1].lucro, 63360 * 0.725);
  // Os dois: 48 × 96 = 4.608; − 69,12 − 240 − 4.800 = −501,12/ha, sem IR.
  perto(s[3].lucro, -50112);
  assert.equal(s[0].lucro, estudarLavoura(SOJA, p, 1000000).lucro);
});

test('comparação: mesmo capital da pecuária e do CDI, com a maior opção apontada', () => {
  const r = compararComPecuaria(SOJA, p, A, C, PAT, 1000000);
  const pec = compararOpcoes(p, A, C, PAT, 1000000);
  assert.equal(r.linhas.length, pec.linhas.length + 1);
  for (const l of r.linhas) assert.equal(l.capital, 1000000);
  perto(r.cdi.resultado, 1000000 * CDI);
  perto(r.diferencaCdi, 220996.5 - 112612.5); // 108.384
  perto(r.diferencaPecuaria, 220996.5 - pec.melhorPecuaria.resultado);
  perto(r.melhor.resultado, Math.max(...r.linhas.filter(l => l.viavel).map(l => l.resultado)));
});

test('comparação: atividade que não cabe fica fora da melhor opção', () => {
  const r = compararComPecuaria({ ...SOJA, areaHa: 1000 }, p, A, C, PAT, 1000000);
  assert.notEqual(r.melhor.id, 'atividade');
  assert.equal(r.diferencaCdi, null);
  assert.equal(r.linhas[0].viavel, false);
});

test('validação: campos pedidos, limites e combinações impossíveis', () => {
  assert.deepEqual(validarLavoura({}).erros.map(e => e.campo), ['cultura']);
  const campos = o => validarLavoura(o).erros.map(e => e.campo);
  assert.deepEqual(campos({ cultura: 'soja' }), ['areaHa', 'produtividade', 'preco', 'mesesCapital']);
  assert.deepEqual(campos({ ...SOJA, insumos: '', operacoes: '', maoDeObra: '', outros: '' }), ['insumos']);
  assert.deepEqual(campos({ ...SOJA, areaHa: -1 }), ['areaHa']);
  assert.deepEqual(campos({ ...SOJA, mesesCapital: 13 }), ['mesesCapital']);
  assert.deepEqual(campos({ ...SOJA, preco: 'abc' }), ['preco']);
  assert.deepEqual(campos({ ...ILP, mesesCapital: 8 }), ['mesesGado']);
  assert.deepEqual(campos({ ...CAFE, vidaUtilAnos: 2 }), ['vidaUtilAnos']);
  assert.deepEqual(campos({ ...CAFE, anosFormacao: 2.5 }), ['anosFormacao']);
  assert.deepEqual(campos({ ...SOJA, investimento: 100000 }), ['vidaInvestimentoAnos']);
  assert.equal(estudarLavoura({ cultura: 'soja' }, p).ok, false);
  assert.equal(compararComPecuaria({ cultura: 'soja' }, p, A, C, PAT).ok, false);
});

test('toda cultura pertence a uma atividade e pede os campos dela', () => {
  for (const c of CULTURAS) assert.ok(ATIVIDADES[c.atividade], c.id);
  assert.ok(camposDaCultura('cana').includes('implantacao'));
  assert.ok(!camposDaCultura('soja').includes('implantacao'));
  assert.ok(camposDaCultura('tomate').includes('ciclos'));
  assert.ok(camposDaCultura('ilp_milho').includes('lotacao'));
  assert.deepEqual(camposDaCultura('nada'), []);
  assert.deepEqual(new Set(CULTURAS.map(c => c.atividade)), new Set(Object.keys(ATIVIDADES)));
});

test('referência da terra: 15% do VTN médio da região do INCRA', () => {
  const m = municipio('Uberaba', 'MG');
  const r = referenciaTerra(m[0]);
  perto(r.tetoArrendamentoHa, vtnDoMunicipio(m[0]).med * 0.15);
  assert.equal(referenciaTerra(1), null);
});

test('cartão e Triguinho levam à página de plantio, que existe', () => {
  const r = responder('e se eu plantar soja?');
  assert.equal(r.id, 'outrasAtividades');
  assert.equal(r.link.href, 'plantio.html');
  assert.ok(fs.existsSync(new URL('../plantio.html', import.meta.url)));
  assert.ok(fs.readFileSync(new URL('../src/ui/abas-estudo.js', import.meta.url), 'utf8').includes('href="plantio.html"'));
});
