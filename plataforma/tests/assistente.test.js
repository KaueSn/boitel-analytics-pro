// Busca do Triguinho: perguntas reais devem cair no assunto certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { responder, buscar, normalizar, BASE, ROTULOS } from '../src/ui/assistente-base.js';
import { calcularLote } from '../src/engine/lote.js';
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
