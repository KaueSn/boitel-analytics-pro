// Bugs reais já encontrados: cada teste garante que não voltem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PREMISSAS_PADRAO as P, ESQUEMA_LOTE } from '../src/engine/premissas.js';
import { aplicarChoques, rodarCenarios, tornado, monteCarlo, resolverEquilibrio } from '../src/engine/cenarios.js';
import { validar } from '../src/engine/validacao.js';
import { numeroBR, moeda } from '../src/ui/formato.js';
import { areaViavelPorAno, aporteNecessario } from '../src/engine/estrategias.js';
import { PATRIMONIO_PADRAO, projetarPatrimonio } from '../src/engine/patrimonio.js';
import { MODELO_C_PADRAO } from '../src/engine/modelos.js';
import { municipio, frigorificosProximos } from '../src/engine/logistica.js';
import { MUNICIPIOS } from '../src/engine/municipios.js';
import { vtnDoMunicipio, TOTAL_MUNICIPIOS_VTN } from '../src/engine/terra.js';
import { FRIGORIFICOS } from '../src/engine/frigorificos.js';

const perto = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test('choque não ultrapassa o limite do campo (GMD alto não derruba cenários)', () => {
  assert.equal(aplicarChoques({ ...P, gmdKg: 2.9 }, { gmd: 0.1 }).gmdKg, ESQUEMA_LOTE.gmdKg.max);
  assert.doesNotThrow(() => rodarCenarios({ ...P, gmdKg: 2.9 }));
  assert.doesNotThrow(() => tornado({ ...P, gmdKg: 2.8 }));
  assert.doesNotThrow(() => rodarCenarios({ ...P, precoCompraCab: 48000 }));
  assert.doesNotThrow(() => monteCarlo({ ...P, gmdKg: 2.95, precoVendaArroba: 1950 }, { iteracoes: 50 }));
});

test('campo apagado é erro, não vira o valor padrão em silêncio', () => {
  const r = validar(ESQUEMA_LOTE, { ...P, gmdKg: '' });
  assert.equal(r.ok, false);
  assert.match(r.erros[0].mensagem, /preencha/);
  assert.equal(validar(ESQUEMA_LOTE, { ...P, gmdKg: undefined }).ok, true); // arquivo antigo sem o campo: usa padrão
});

test('números digitados com ponto ou vírgula', () => {
  for (const [t, v] of [['389,05', 389.05], ['389.05', 389.05], ['1.6', 1.6], ['1,6', 1.6], ['250000', 250000], ['250.000', 250000], ['1.234,50', 1234.5], ['1.250.000', 1250000], ['R$ 300', 300], [' 12 ', 12]]) {
    assert.equal(numeroBR(t), v, t);
  }
  assert.ok(Number.isNaN(numeroBR('')));
  assert.ok(Number.isNaN(numeroBR('abc')));
});

test('moeda não mostra texto estranho para valor infinito ou ausente', () => {
  assert.equal(moeda(Infinity), '—');
  assert.equal(moeda(NaN), '—');
  assert.equal(moeda(undefined), '—');
});

test('área viável: usa o lote de cada ano e cresce com o patrimônio', () => {
  const pp = { ...PATRIMONIO_PADRAO, precoHa: 8000, habilitarRecria: false };
  const a = areaViavelPorAno({ ...P }, pp, MODELO_C_PADRAO);
  assert.equal(a.length, 10);
  assert.ok(a[0].areaHa > 0, `ano 1: ${a[0].areaHa}`);
  assert.ok(a[9].areaHa > a[0].areaHa, 'mais patrimônio comporta mais área');
});

test('aporte necessário: o valor achado realmente viabiliza a compra no ano-alvo', () => {
  const pp = { ...PATRIMONIO_PADRAO, precoHa: 30000, areaHa: 30, anoMinimoFazenda: 3, horizonteAnos: 6, habilitarRecria: false };
  const ap = aporteNecessario({ ...P }, pp, MODELO_C_PADRAO, 6);
  assert.ok(ap > 0);
  const r = projetarPatrimonio({ ...P }, { ...pp, aporteMensal: ap }, MODELO_C_PADRAO);
  assert.ok(r.resumo.anoCompraFazenda !== null && r.resumo.anoCompraFazenda <= 6);
  const menor = projetarPatrimonio({ ...P }, { ...pp, aporteMensal: Math.max(0, ap - 500) }, MODELO_C_PADRAO);
  const anoMenor = menor.resumo.anoCompraFazenda;
  assert.ok(anoMenor === null || anoMenor > 6, 'R$ 500 a menos já não compra até o ano 6 (é o mínimo)');
});

test('equilíbrio sem animais devolve null em vez de número sem sentido', () => {
  assert.equal(resolverEquilibrio({ ...P, capitalInicial: 0 }, 'gmdKg', 0, 3), null);
});

test('Brasil inteiro: cidades, frigoríficos e terra', () => {
  assert.ok(MUNICIPIOS.length >= 5570);
  const c = municipio('Cuiabá', 'MT');
  assert.equal(frigorificosProximos(c, 1)[0].uf, 'MT');
  assert.ok(FRIGORIFICOS.length > 150);
  assert.ok(TOTAL_MUNICIPIOS_VTN > 5500);
  assert.ok(vtnDoMunicipio(c[0]).med > 0);
  assert.equal(vtnDoMunicipio(1), null);
});

test('produto não reproduz cotações do CEPEA nem da Scot', () => {
  const pasta = new URL('../src/', import.meta.url);
  const proibido = /(CEPEA|Scot)[^
]{0,60}R$ ?d|scot-[a-z]|cepea-[a-z]/;
  const arquivos = [...fs.readdirSync(new URL('engine/', pasta)).map(f => 'engine/' + f), ...fs.readdirSync(new URL('ui/', pasta)).map(f => 'ui/' + f)];
  for (const f of arquivos) {
    if (/municipios|terra|frigorificos/.test(f)) continue; // só códigos e coordenadas
    const achou = fs.readFileSync(new URL(f, pasta), 'utf8').match(proibido);
    assert.equal(achou, null, `${f}: ${achou?.[0]}`);
  }
  for (const d of ['../docs/INTEGRACAO.md', '../docs/FORMULAS.md', '../README.md']) {
    const achou = fs.readFileSync(new URL(d, import.meta.url), 'utf8').match(proibido);
    assert.equal(achou, null, `${d}: ${achou?.[0]}`);
  }
});

test('aporte zero e capital zero não geram NaN na projeção', () => {
  const r = projetarPatrimonio({ ...P, capitalInicial: 0 }, { ...PATRIMONIO_PADRAO, horizonteAnos: 2 }, MODELO_C_PADRAO);
  perto(r.resumo.patrimonioFinal, 0);
  for (const a of r.anos) assert.ok(Number.isFinite(a.patrimonioLiquido));
});
