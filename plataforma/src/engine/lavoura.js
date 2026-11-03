// Estudo de plantio e outras atividades do agro: grãos, café, cana, hortifrúti e integração
// lavoura-pecuária. Custos, produtividade e preços são sempre os digitados pelo usuário: o motor
// não traz cotação nem custo de referência. Comparação com a pecuária e o CDI no mesmo capital e
// no mesmo prazo (1 ano). Nada aqui é recomendação de investimento.
import { calcularIR } from './lote.js';
import { compararOpcoes, cdiLiquidoAno, TETO_ARRENDAMENTO } from './estudo.js';
import { vtnDoMunicipio } from './terra.js';

export const ATIVIDADES = {
  graos: { nome: 'Grãos', tipo: 'anual' },
  cafe: { nome: 'Café', tipo: 'perene' },
  cana: { nome: 'Cana-de-açúcar', tipo: 'perene' },
  hortifruti: { nome: 'Hortifrúti', tipo: 'anual', variosCiclos: true },
  ilp: { nome: 'Integração lavoura-pecuária', tipo: 'anual', comGado: true }
};

export const CULTURAS = [
  { id: 'soja', nome: 'Soja', atividade: 'graos', unidade: 'saca de 60 kg' },
  { id: 'milho', nome: 'Milho', atividade: 'graos', unidade: 'saca de 60 kg' },
  { id: 'feijao', nome: 'Feijão', atividade: 'graos', unidade: 'saca de 60 kg' },
  { id: 'arroz', nome: 'Arroz', atividade: 'graos', unidade: 'saca de 50 kg' },
  { id: 'trigo', nome: 'Trigo', atividade: 'graos', unidade: 'saca de 60 kg' },
  { id: 'sorgo', nome: 'Sorgo', atividade: 'graos', unidade: 'saca de 60 kg' },
  { id: 'algodao', nome: 'Algodão em caroço', atividade: 'graos', unidade: 'arroba de 15 kg' },
  { id: 'cafe_arabica', nome: 'Café arábica', atividade: 'cafe', unidade: 'saca de 60 kg' },
  { id: 'cafe_conilon', nome: 'Café conilon', atividade: 'cafe', unidade: 'saca de 60 kg' },
  { id: 'cana', nome: 'Cana-de-açúcar', atividade: 'cana', unidade: 'tonelada' },
  { id: 'tomate', nome: 'Tomate', atividade: 'hortifruti', unidade: 'caixa' },
  { id: 'batata', nome: 'Batata-inglesa', atividade: 'hortifruti', unidade: 'saca' },
  { id: 'cebola', nome: 'Cebola', atividade: 'hortifruti', unidade: 'saca' },
  { id: 'horti_outra', nome: 'Outra hortaliça ou fruta', atividade: 'hortifruti', unidade: 'unidade de venda' },
  { id: 'ilp_soja', nome: 'Soja + gado na entressafra', atividade: 'ilp', unidade: 'saca de 60 kg' },
  { id: 'ilp_milho', nome: 'Milho + gado na entressafra', atividade: 'ilp', unidade: 'saca de 60 kg' }
];

const CULTURA = new Map(CULTURAS.map(c => [c.id, c]));
export const culturaPorId = id => CULTURA.get(id) || null;

// Campos numéricos da entrada. obrig: precisa ser informado; min: menor valor aceito (0 por padrão).
const COMUNS = {
  areaHa: { rotulo: 'Área', obrig: true, acima: 0 },
  produtividade: { rotulo: 'Produtividade', obrig: true, acima: 0 },
  preco: { rotulo: 'Preço de venda', obrig: true, acima: 0 },
  custoVenda: { rotulo: 'Frete e venda por unidade' },
  insumos: { rotulo: 'Insumos' },
  operacoes: { rotulo: 'Máquinas e operações' },
  maoDeObra: { rotulo: 'Mão de obra' },
  outros: { rotulo: 'Outros custos' },
  arrendamento: { rotulo: 'Arrendamento' },
  investimento: { rotulo: 'Máquinas e benfeitorias a comprar' },
  vidaInvestimentoAnos: { rotulo: 'Vida útil das máquinas e benfeitorias', inteiro: true }
};
const ANUAL = { mesesCapital: { rotulo: 'Meses com o dinheiro na lavoura', obrig: true, acima: 0, max: 12 } };
const CICLOS = { ciclos: { rotulo: 'Ciclos por ano', inteiro: true, min: 1, max: 12 } };
const PERENE = {
  implantacao: { rotulo: 'Implantação', obrig: true, acima: 0 },
  manutencaoFormacao: { rotulo: 'Manutenção antes da primeira colheita' },
  anosFormacao: { rotulo: 'Anos até a primeira colheita', inteiro: true, obrig: true },
  vidaUtilAnos: { rotulo: 'Vida útil da lavoura', inteiro: true, obrig: true, acima: 0 }
};
const GADO = {
  lotacao: { rotulo: 'Lotação na entressafra', obrig: true, acima: 0 },
  compraCab: { rotulo: 'Compra por cabeça', obrig: true, acima: 0 },
  vendaCab: { rotulo: 'Venda por cabeça', obrig: true, acima: 0 },
  custoCab: { rotulo: 'Custo da fase por cabeça' },
  mesesGado: { rotulo: 'Meses com o gado', obrig: true, acima: 0, max: 12 }
};

function camposDe(a) {
  return { ...COMUNS, ...(a.tipo === 'perene' ? PERENE : ANUAL), ...(a.variosCiclos ? CICLOS : {}), ...(a.comGado ? GADO : {}) };
}

/** Lista os campos pedidos por uma cultura (a interface usa para mostrar só o que importa). */
export function camposDaCultura(culturaId) {
  const c = culturaPorId(culturaId);
  return c ? Object.keys(camposDe(ATIVIDADES[c.atividade])) : [];
}

/** Valida a entrada. Devolve os valores numéricos (vazio opcional = 0) e os erros encontrados. */
export function validarLavoura(entrada) {
  const c = culturaPorId(entrada?.cultura);
  if (!c) return { valores: null, erros: [{ campo: 'cultura', mensagem: 'Escolha a cultura.' }] };
  const a = ATIVIDADES[c.atividade];
  const erros = [];
  const valores = { cultura: c.id };
  for (const [campo, d] of Object.entries(camposDe(a))) {
    const bruto = entrada[campo];
    const vazio = bruto === undefined || bruto === null || bruto === '';
    if (vazio) {
      if (d.obrig) erros.push({ campo, mensagem: `${d.rotulo}: informe o valor.` });
      valores[campo] = d.min ?? 0;
      continue;
    }
    const v = Number(bruto);
    valores[campo] = v;
    if (!Number.isFinite(v)) erros.push({ campo, mensagem: `${d.rotulo}: não é um número.` });
    else if (d.acima !== undefined ? v <= d.acima : v < (d.min ?? 0)) erros.push({ campo, mensagem: `${d.rotulo}: valor muito baixo.` });
    else if (d.max !== undefined && v > d.max) erros.push({ campo, mensagem: `${d.rotulo}: no máximo ${d.max}.` });
    else if (d.inteiro && !Number.isInteger(v)) erros.push({ campo, mensagem: `${d.rotulo}: use um número inteiro.` });
  }
  if (!erros.length) {
    if (valores.insumos + valores.operacoes + valores.maoDeObra + valores.outros <= 0) {
      erros.push({ campo: 'insumos', mensagem: 'Informe pelo menos um custo por hectare: sem custo, o resultado não vale.' });
    }
    if (valores.investimento > 0 && valores.vidaInvestimentoAnos < 1) {
      erros.push({ campo: 'vidaInvestimentoAnos', mensagem: 'Informe a vida útil das máquinas e benfeitorias, em anos.' });
    }
    if (a.comGado && valores.mesesCapital + valores.mesesGado > 12) {
      erros.push({ campo: 'mesesGado', mensagem: 'Lavoura e gado somam mais de 12 meses no ano.' });
    }
    if (a.tipo === 'perene' && valores.vidaUtilAnos <= valores.anosFormacao) {
      erros.push({ campo: 'vidaUtilAnos', mensagem: 'A vida útil precisa ser maior que os anos até a primeira colheita.' });
    }
  }
  return { valores, erros };
}

const custoCicloHa = e => e.insumos + e.operacoes + e.maoDeObra + e.outros;

/** Lavoura de ciclo curto (grãos, hortifrúti e integração): um ano de operação, por hectare. */
function contaAnual(e, a, funrural) {
  const ciclos = a.variosCiclos ? e.ciclos : 1;
  const quantidade = e.produtividade * ciclos;
  const receitaLavoura = quantidade * e.preco;
  const custeio = custoCicloHa(e) + e.arrendamento; // o que sai do caixa antes da primeira venda
  let receitaHa = receitaLavoura;
  let custosHa = quantidade * e.custoVenda + custoCicloHa(e) * ciclos + e.arrendamento;
  let capitalHa = custeio;
  let reaisMesHa = custeio * e.mesesCapital;
  let margemGadoHa = 0;
  if (a.comGado) {
    const receitaGado = e.vendaCab * e.lotacao;
    const capitalGado = (e.compraCab + e.custoCab) * e.lotacao;
    margemGadoHa = receitaGado * (1 - funrural) - capitalGado;
    receitaHa += receitaGado;
    custosHa += capitalGado;
    // Lavoura e gado não ocupam o caixa ao mesmo tempo: o pico é o maior dos dois.
    capitalHa = Math.max(custeio, capitalGado);
    reaisMesHa += capitalGado * e.mesesGado;
  }
  return { receitaHa, custosHa, margemHa: receitaHa * (1 - funrural) - custosHa, capitalHa, reaisMesHa, quantidadeAno: quantidade, margemGadoHa };
}

/** Lavoura de vários anos (café e cana): média por ano em toda a vida, contando os anos sem colheita. */
function contaPerene(e, funrural) {
  const anosProducao = e.vidaUtilAnos - e.anosFormacao;
  const custoAno = custoCicloHa(e) + e.arrendamento;
  const receitaProducao = e.produtividade * e.preco;
  const margemProducaoHa = receitaProducao * (1 - funrural) - e.produtividade * e.custoVenda - custoAno;
  const formacaoHa = e.implantacao + (e.manutencaoFormacao + e.arrendamento) * e.anosFormacao;
  const parte = anosProducao / e.vidaUtilAnos;
  const capitalHa = formacaoHa + custoAno;
  return {
    receitaHa: receitaProducao * parte,
    margemHa: (anosProducao * margemProducaoHa - formacaoHa) / e.vidaUtilAnos,
    capitalHa,
    reaisMesHa: capitalHa * 12, // fica preso o ano inteiro
    quantidadeAno: e.produtividade * parte,
    perene: {
      anosProducao, formacaoHa, margemProducaoHa,
      primeiraColheitaAno: e.anosFormacao + 1,
      caixaAno1Ha: e.anosFormacao > 0 ? -(e.implantacao + e.manutencaoFormacao + e.arrendamento) : margemProducaoHa - e.implantacao,
      anosParaRecuperar: margemProducaoHa > 0 ? e.anosFormacao + formacaoHa / margemProducaoHa : null
    }
  };
}

/**
 * Estuda a atividade com um capital. `p` são as premissas do projeto: de lá vêm Funrural, regime
 * de IR, reserva e CDI, os mesmos usados na pecuária. Valores por hectare e totais no ano.
 */
export function estudarLavoura(entrada, p, capital = p.capitalInicial) {
  const { valores: e, erros } = validarLavoura(entrada);
  if (erros.length) return { ok: false, erros };
  const c = culturaPorId(e.cultura);
  const a = ATIVIDADES[c.atividade];
  const conta = a.tipo === 'perene' ? contaPerene(e, p.funruralPct) : contaAnual(e, a, p.funruralPct);

  const depreciacaoAno = e.investimento > 0 ? e.investimento / e.vidaInvestimentoAnos : 0;
  const receita = conta.receitaHa * e.areaHa;
  const lucroOperacional = conta.margemHa * e.areaHa - depreciacaoAno;
  const ir = calcularIR(p, lucroOperacional, receita);
  const lucro = lucroOperacional - ir;
  const capitalEmpregado = conta.capitalHa * e.areaHa + e.investimento;
  const disponivel = capital * (1 - p.reservaPct);
  const viavel = capitalEmpregado <= disponivel;
  const cdi = cdiLiquidoAno(p.cdiAnual);

  // O dinheiro volta a render CDI nos meses em que não está na atividade.
  const reaisMes = conta.reaisMesHa * e.areaHa + e.investimento * 12;
  const parado = viavel ? Math.max(0, capital * 12 - reaisMes) / 12 : capital;
  const rendimentoParado = parado * cdi;
  const resultado = (viavel ? lucro : 0) + rendimentoParado;

  // Lucro operacional cresce em linha reta com preço e produtividade, então o equilíbrio sai direto.
  const receitaPorPreco = conta.quantidadeAno * e.areaHa * (1 - p.funruralPct);
  const precoEquilibrio = receitaPorPreco > 0 ? e.preco - lucroOperacional / receitaPorPreco : null;
  const ganhoPorUnidade = (conta.quantidadeAno / e.produtividade) * e.areaHa * (e.preco * (1 - p.funruralPct) - e.custoVenda);
  const produtividadeEquilibrio = ganhoPorUnidade > 0 ? e.produtividade - lucroOperacional / ganhoPorUnidade : null;

  return {
    ok: true, cultura: c, atividade: a, entrada: e, capital, disponivel, viavel,
    areaHa: e.areaHa, receita, lucroOperacional, ir, lucro, depreciacaoAno,
    porHa: { receita: conta.receitaHa, margem: conta.margemHa, capital: conta.capitalHa, resultadoOperacional: lucroOperacional / e.areaHa, resultado: lucro / e.areaHa },
    capitalEmpregado, capitalMinimo: capitalEmpregado / (1 - p.reservaPct),
    areaMaxima: conta.capitalHa > 0 ? Math.max(0, disponivel - e.investimento) / conta.capitalHa : 0,
    rendimentoParado, resultado, retornoSobreCapital: capital > 0 ? resultado / capital : 0,
    precoEquilibrio, produtividadeEquilibrio, perene: conta.perene || null
  };
}

/** Mesma atividade com preço e produtividade menores. A queda é um teste, não uma previsão. */
export function sensibilidadeLavoura(entrada, p, capital = p.capitalInicial, queda = 0.2) {
  const casos = [
    ['Como informado', 1, 1],
    [`Produtividade ${Math.round(queda * 100)}% menor`, 1 - queda, 1],
    [`Preço ${Math.round(queda * 100)}% menor`, 1, 1 - queda],
    ['Os dois juntos', 1 - queda, 1 - queda]
  ];
  return casos.map(([nome, fProd, fPreco]) => {
    const r = estudarLavoura({ ...entrada, produtividade: entrada.produtividade * fProd, preco: entrada.preco * fPreco }, p, capital);
    return { nome, ok: r.ok, porHa: r.ok ? r.porHa.resultado : null, lucro: r.ok ? r.lucro : null, resultado: r.ok ? r.resultado : null };
  });
}

/** Compara a atividade com as opções de pecuária e a renda fixa: mesmo capital, mesmo prazo. */
export function compararComPecuaria(entrada, pLote, pA, pC, pPat, capital = pLote.capitalInicial) {
  const est = estudarLavoura(entrada, pLote, capital);
  if (!est.ok) return { ok: false, erros: est.erros };
  const r = compararOpcoes(pLote, pA, pC, pPat, capital);
  const linhaAtividade = {
    id: 'atividade', nome: est.cultura.nome, viavel: est.viavel, capital, capitalEmpregado: est.viavel ? est.capitalEmpregado : 0, cabecas: 0,
    lucroAnual: est.viavel ? est.lucro : 0, rendimentoParado: est.rendimentoParado, resultado: est.resultado,
    retornoSobreCapital: est.retornoSobreCapital, capitalMinimo: est.capitalMinimo, oQue: `${est.atividade.nome}, em ${est.areaHa} ha.`, notas: []
  };
  const linhas = [linhaAtividade, ...r.linhas];
  const melhor = linhas.filter(l => l.viavel).reduce((m, l) => (l.resultado > m.resultado ? l : m));
  const cdi = r.linhas.find(l => l.id === 'cdi');
  return {
    ok: true, capital, estudo: est, linhas, melhor, melhorPecuaria: r.melhorPecuaria, cdi,
    diferencaCdi: est.viavel ? est.resultado - cdi.resultado : null,
    diferencaPecuaria: est.viavel && r.melhorPecuaria ? est.resultado - r.melhorPecuaria.resultado : null
  };
}

/** Terra da região (INCRA) e teto legal estimado do arrendamento, para conferir o valor digitado. */
export function referenciaTerra(codigoIbge) {
  const v = vtnDoMunicipio(codigoIbge);
  return v ? { nome: v.nome, vtnMedio: v.med, tetoArrendamentoHa: v.med * TETO_ARRENDAMENTO } : null;
}
