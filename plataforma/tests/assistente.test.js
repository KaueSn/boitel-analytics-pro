// Busca do Triguinho: perguntas reais devem cair no assunto certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responder, buscar, normalizar, BASE, ROTULOS } from '../src/ui/assistente-base.js';
import { calcularLote } from '../src/engine/lote.js';
import { interpretarPedido, aplicarMudancas, descreverSimulacao, descreverRegioes, PAGINAS } from '../src/ui/triguinho-comandos.js';
import { ordenarVozes, vozBasica, dividirEmPartes, resumirParaFala } from '../src/ui/voz.js';
import { estadoInicial, recalcular } from '../src/ui/estado.js';
import { PREMISSAS_PADRAO } from '../src/engine/premissas.js';
import { MODELO_A_PADRAO, MODELO_C_PADRAO } from '../src/engine/modelos.js';
import { PATRIMONIO_PADRAO } from '../src/engine/patrimonio.js';

const CASOS = [
  ['por onde eu começo?', 'comecar'],
  ['Como funciona isso aqui', 'comecar'],
  ['quanto vou lucrar com o lote', 'lucro'],
  ['qual o preço de equilibrio da arroba', 'equilibrio'],
  ['por que está dando prejuízo?', 'prejuizo'],
  ['o que é arroba produzida', 'produzida'],
  ['quanto pesa uma arroba', 'arroba'],
  ['o que significa o selo pendente de cotação', 'pendente'],
  ['como eu salvo minha simulação', 'salvar'],
  ['como gerar o PDF', 'exportar'],
  ['quando consigo comprar a fazenda', 'fazenda'],
  ['quanto preciso aportar por mês', 'aporte'],
  ['como proteger o preço na B3', 'hedge'],
  ['o que é risco de base', 'base'],
  ['é melhor deixar no CDI?', 'cdi'],
  ['qual o melhor modelo', 'modelos'],
  ['qual a chance de dar prejuízo', 'monte'],
  ['o que é GMD', 'gmd'],
  ['alguém vê meus dados?', 'privacidade'],
  ['de onde vêm os dados', 'fontes'],
  ['o que é acerto no gancho', 'gancho'],
  ['como mudo para o tema claro', 'tema'],
  ['quanto custa o frete', 'frete'],
  ['qual frigorífico mais perto', 'frigorifico'],
  ['onde encontro um boitel', 'boitelPerto'],
  ['onde compro os bois', 'boitelPerto'],
  ['quanto custa o hectare na minha região', 'terraRegiao'],
  ['qual a melhor opção para o meu capital', 'melhorOpcao'],
  ['é melhor comprar terra ou fazer boitel?', 'melhorOpcao'],
  ['alugar ou comprar terreno', 'melhorOpcao'],
  ['qual a melhor região para boitel', 'melhorRegiao'],
  ['em qual estado comprar terra', 'melhorRegiao'],
  ['com quanto posso começar', 'capitalMinimo'],
  ['e se eu plantar soja?', 'outrasAtividades'],
  ['outras opções do agro dão mais lucro?', 'outrasAtividades'],
  ['como funciona o arrendamento', 'arrendamento'],
  ['o que é parceria pecuária', 'parceria'],
  ['o que é confinamento', 'confinamento'],
  ['o que é recria', 'fases'],
  ['o que é boi magro', 'reposicao'],
  ['o que é ágio', 'agio'],
  ['o que é quebra de peso', 'quebra'],
  ['o que é GTA', 'documentos'],
  ['o que é SIF', 'sif'],
  ['o que é ITR', 'itr'],
  ['o que é boi China', 'boiChina'],
  ['para que serve a reserva', 'reserva'],
  ['posso financiar pelo plano safra', 'credito'],
  ['posso falar com você por voz', 'voz'],
  ['você é uma inteligência artificial?', 'ia'],
  ['bom dia', 'saudacao'],
  ['obrigado', 'agradecimento'],
  ['é muito complicado preencher', 'guiado'],
  ['tem um jeito mais fácil?', 'guiado']
];

for (const [pergunta, esperado] of CASOS) {
  test(`"${pergunta}" → ${esperado}`, () => {
    assert.equal(responder(pergunta).id, esperado);
  });
}

test('melhor opção usa o capital da simulação', () => {
  const lote = calcularLote({ ...PREMISSAS_PADRAO });
  const val = { lote: PREMISSAS_PADRAO, modeloA: MODELO_A_PADRAO, modeloC: MODELO_C_PADRAO, patrimonio: PATRIMONIO_PADRAO };
  const r = responder('qual a melhor opção para o meu capital', { lote, val, p: PREMISSAS_PADRAO });
  assert.match(r.texto, /R\$\s?250\.000/);
  assert.match(r.texto, /renda fixa/);
});

test('pergunta sem relação devolve ajuda com sugestões', () => {
  const r = responder('qual a capital da França');
  assert.equal(r.id, null);
  assert.ok(r.seguintes.length > 0);
  assert.equal(responder('').id, null);
});

test('respostas usam os números da simulação quando há resultado', () => {
  const lote = calcularLote({ ...PREMISSAS_PADRAO });
  const r = responder('quanto vou lucrar', { lote, projecao: null, hedge: null });
  assert.match(r.texto, /39 cabeças/);
  assert.match(responder('preço de equilíbrio', { lote }).texto, /R\$\s?333,53/);
});

test('toda entrada tem rótulo e respostas sem erro com e sem resultado', () => {
  const lote = calcularLote({ ...PREMISSAS_PADRAO });
  for (const e of BASE) {
    assert.ok(ROTULOS[e.id], 'sem rótulo: ' + e.id);
    assert.equal(typeof e.resposta(null), 'string');
    assert.equal(typeof e.resposta({ lote }), 'string');
    for (const s of e.seguintes) assert.ok(BASE.some(b => b.id === s), `${e.id} aponta para ${s} inexistente`);
  }
});

test('normalização tira acentos e pontuação', () => {
  assert.equal(normalizar('Preço de EQUILÍBRIO?!'), 'preco de equilibrio');
  assert.ok(buscar('preço de equilíbrio').length > 0);
});

// --- Pedidos executados pelo Triguinho e voz ---
test('entende pedidos de simulação em frases naturais', () => {
  const campos = f => interpretarPedido(f).mudancas.map(m => [m.campo, m.fator ?? m.valor]);
  assert.deepEqual(campos('simule com 500 mil, arroba a 320 e 120 dias').sort(), [['capitalInicial', 500000], ['diasCiclo', 120], ['precoVendaArroba', 320]]);
  assert.deepEqual(campos('quanto eu ganho com 100 bois'), [['cabecasFixas', 100]]);
  assert.deepEqual(campos('e com 1,5 milhão'), [['capitalInicial', 1500000]]);
  assert.deepEqual(campos('quero investir quinhentos mil'), [['capitalInicial', 500000]]);
  assert.deepEqual(campos('e se a arroba cair 10%'), [['precoVendaArroba', 0.9]]);
  assert.deepEqual(campos('e se o boi magro subir 5%'), [['precoCompraCab', 1.05]]);
  assert.deepEqual(campos('simula com boi magro a 3.500 e boitel a 280').sort(), [['precoArrobaProduzida', 280], ['precoCompraCab', 3500]]);
  assert.deepEqual(campos('coloca o gmd em 1,8'), [['gmdKg', 1.8]]);
  assert.deepEqual(campos('muda o frete para 250'), [['freteEntradaCab', 250], ['freteSaidaCab', 250]]);
});

test('valor fora da faixa vira aviso, nunca entra na simulação', () => {
  const c = interpretarPedido('simula arroba a 99999');
  assert.equal(c.mudancas.length, 0);
  assert.match(c.avisos[0], /fora da faixa/);
});

test('perguntas comuns não viram simulação sem querer', () => {
  for (const q of ['qual o preço de equilíbrio da arroba', 'quanto pesa uma arroba', 'como funciona a arroba de 15 kg', 'o que é GMD', 'como usar a plataforma', '1 arroba tem quantos kg', 'quanto custa o frete']) {
    assert.equal(interpretarPedido(q), null, q);
  }
});

test('abre só páginas conhecidas e entende desfazer e estados', () => {
  assert.deepEqual(interpretarPedido('mostre os cenários'), { tipo: 'abrir', pagina: 'cenarios' });
  assert.deepEqual(interpretarPedido('quero ver a página de plantio'), { tipo: 'abrir', pagina: 'plantio' });
  assert.equal(interpretarPedido('abra o site do banco'), null);
  assert.deepEqual(interpretarPedido('desfazer'), { tipo: 'desfazer' });
  assert.equal(interpretarPedido('goiás é bom para boitel').uf, 'GO');
  assert.equal(interpretarPedido('me fala sobre mato grosso do sul').uf, 'MS');
  assert.equal(interpretarPedido('vou para o banco'), null);
  for (const p of Object.values(PAGINAS)) assert.match(p.url, /^[a-z]+\.html$/);
});

test('simulação pedida usa o motor e não altera o estado original', () => {
  const base = estadoInicial();
  const c = interpretarPedido('simule com 500 mil e arroba a 320');
  const novo = aplicarMudancas(base, c.mudancas);
  assert.equal(base.lote.capitalInicial, 250000);
  assert.equal(novo.lote.capitalInicial, 500000);
  const depois = recalcular(novo);
  assert.ok(depois.ok);
  const texto = descreverSimulacao(novo, c.mudancas, [], recalcular(base), depois);
  assert.match(texto, /R\$\s?500\.000/);
  assert.match(texto, /desfazer/);
});

test('regiões de um estado vêm do ranking oficial', () => {
  const t = descreverRegioes('GO', null);
  assert.match(t, /Em Goiás/);
  assert.match(t, /Para boitel:/);
  assert.match(t, /INCRA/);
});

test('entende perguntas soltas e erro de digitação', () => {
  for (const [q, id] of [['quantos bois consigo comprar', 'quantosBois'], ['vale a pena investir em boi', 'valePena'], ['qual o risco', 'risco'], ['quanto custa o plano', 'plano'], ['nelore ou angus', 'racas'], ['a voz está ruim', 'vozRuim'], ['o que é payback', 'indicadores'], ['o que é arrendamneto', 'arrendamento'], ['boa tarde, quanto vou lucrar com o lote', 'lucro']]) {
    assert.equal(responder(q).id, id, q);
  }
  assert.notEqual(responder('vale a pena investir em boi').id, 'agradecimento');
});

test('lembra o assunto para repetir e reexplicar', () => {
  assert.equal(responder('pode repetir', null, undefined, 'gmd').id, 'gmd');
  assert.match(responder('não entendi', null, undefined, 'gmd').texto, /ideia principal/);
  assert.equal(responder('não entendi').id, null);
});

test('voz: prefere vozes naturais, parte a fala e não quebra números', () => {
  const vozes = [{ name: 'Microsoft Maria - Portuguese (Brazil)', lang: 'pt-BR' }, { name: 'English', lang: 'en-US' }, { name: 'Google português do Brasil', lang: 'pt-BR' }, { name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR' }];
  const o = ordenarVozes(vozes);
  assert.equal(o.length, 3);
  assert.match(o[0].name, /Francisca/);
  assert.match(o[1].name, /Google/);
  assert.ok(vozBasica(o[2]));
  const partes = dividirEmPartes('O lucro foi de R$ 250.000,50 no ano. ' + 'palavra '.repeat(60));
  assert.equal(partes[0], 'O lucro foi de R$ 250.000,50 no ano.');
  assert.ok(partes.every(p => p.length <= 180));
  assert.match(resumirParaFala('Frase um. '.repeat(100)), /restante está na tela/);
});
