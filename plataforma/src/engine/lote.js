// Resultado econômico e de caixa de um lote em boitel (Modelo B).
// Regras contra dupla contagem:
//  - Funrural e comissão de venda são DEDUÇÕES da receita, nunca custo.
//  - No modo "arroba_produzida" o preço já inclui a dieta: alimentacaoDia e
//    servicoDia são ignorados. No modo "diaria" o preço por @ é ignorado.
//  - A perda por mortalidade aparece uma vez só: o animal morto é comprado
//    (custo) e não gera receita. Não há linha extra de "perda".
//  - O custo de oportunidade (CDI) é econômico, não sai do caixa: fica fora do
//    lucro líquido e entra só no lucro econômico.
import { ESQUEMA_LOTE } from './premissas.js';
import { exigirValido } from './validacao.js';
import { calcularAnimal, duracaoGiroDias, ciclosPorAno } from './zootecnia.js';
import { taxaPeriodo, divSegura } from './unidades.js';
import { aliquotaIRRendaFixa } from './rendaFixa.js';

/** Custos e receitas esperados POR CABEÇA COMPRADA (mortalidade já aplicada). */
export function porCabecaComprada(p, animal = calcularAnimal(p)) {
  const m = p.mortalidadePct;
  const vivos = 1 - m;
  const aquisicao = p.precoCompraCab;
  const comissaoCompra = aquisicao * p.comissaoCompraPct;
  let alimentacao = 0;
  let servico = 0;
  let boitelArroba = 0;
  if (p.modoCobranca === 'diaria') {
    const diasCobrados = vivos * p.diasCiclo + m * p.diasCiclo * p.fracaoCicloMorte;
    alimentacao = diasCobrados * p.alimentacaoDia;
    servico = diasCobrados * p.servicoDia;
  } else {
    // Premissa documentada: o boitel cobra só a @ produzida dos animais entregues.
    boitelArroba = vivos * Math.max(0, animal.arrobasProduzidas) * p.precoArrobaProduzida;
  }
  const precoEfetivo = p.precoVendaArroba + p.bonificacaoArroba;
  const receitaBruta = vivos * animal.arrobasSaida * precoEfetivo;
  return {
    aquisicao, comissaoCompra,
    freteEntrada: p.freteEntradaCab,
    sanidade: p.sanidadeCab,
    outras: p.outrasDespesasCab,
    taxaEntradaBoitel: p.taxaEntradaBoitelCab,
    alimentacao, servico, boitelArroba,
    freteSaida: vivos * p.freteSaidaCab,
    receitaBruta,
    funrural: receitaBruta * p.funruralPct,
    comissaoVenda: receitaBruta * p.comissaoVendaPct,
    precoEfetivo
  };
}

function somaCustos(c) {
  return c.aquisicao + c.comissaoCompra + c.freteEntrada + c.sanidade + c.outras +
    c.taxaEntradaBoitel + c.alimentacao + c.servico + c.boitelArroba + c.freteSaida;
}

/** Desembolso por cabeça antes de receber a venda (define quantas cabeças cabem). */
export function caixaPicoPorCabeca(p, c = porCabecaComprada(p)) {
  const inicio = c.aquisicao + c.comissaoCompra + c.freteEntrada + c.sanidade + c.outras + c.taxaEntradaBoitel;
  const boitel = c.alimentacao + c.servico + c.boitelArroba;
  return { inicio, pico: inicio + c.freteSaida + (p.boitelPagamento === 'durante' ? boitel : 0) };
}

export function calcularIR(p, lucroOperacional, receitaBruta) {
  if (p.regimeIR === 'nenhum') return 0;
  if (p.regimeIR === 'pf_presumido') return receitaBruta * 0.2 * p.aliquotaIR;
  return Math.max(0, lucroOperacional) * p.aliquotaIR;
}

/**
 * Calcula um lote completo. `entrada` é validada; erros lançam ErroValidacao.
 * `opcoes.capitalDisponivel` substitui o capital produtivo (usado na projeção).
 */
export function calcularLote(entrada, opcoes = {}) {
  const p = exigirValido(ESQUEMA_LOTE, entrada);
  const animal = calcularAnimal(p);
  const c1 = porCabecaComprada(p, animal);
  const caixa1 = caixaPicoPorCabeca(p, c1);
  const reserva = p.capitalInicial * p.reservaPct;
  const capitalProdutivo = opcoes.capitalDisponivel ?? (p.capitalInicial - reserva);
  const n = p.cabecasFixas > 0 ? p.cabecasFixas : Math.max(0, Math.floor(divSegura(capitalProdutivo, caixa1.pico)));
  const avisos = [...animal.avisos];

  const t = {};
  for (const [k, v] of Object.entries(c1)) t[k] = k === 'precoEfetivo' ? v : v * n;
  const custoOperacional = somaCustos(t);
  const deducoes = t.funrural + t.comissaoVenda;
  const receitaLiquida = t.receitaBruta - deducoes;
  const lucroOperacional = receitaLiquida - custoOperacional;
  const ir = calcularIR(p, lucroOperacional, t.receitaBruta);
  const lucroLiquido = lucroOperacional - ir;

  const cabecasVivas = n * (1 - p.mortalidadePct);
  const mortes = n * p.mortalidadePct;
  const arrobasVendidas = cabecasVivas * animal.arrobasSaida;
  const arrobasProduzidas = cabecasVivas * Math.max(0, animal.arrobasProduzidas);
  const capitalInicio = n * caixa1.inicio;
  const capitalEmpregado = n * caixa1.pico;
  const diasCapital = p.diasCiclo + p.prazoRecebimentoDias;
  const custoOportunidade = capitalEmpregado * taxaPeriodo(p.cdiAnual, diasCapital);
  const lucroEconomico = lucroLiquido - custoOportunidade;

  const roiCiclo = divSegura(lucroLiquido, capitalEmpregado);
  const ciclosAno = ciclosPorAno(p);
  const roiAnual = roiCiclo <= -1 ? -1 : Math.pow(1 + roiCiclo, ciclosAno) - 1;
  const cdiBrutoPeriodo = taxaPeriodo(p.cdiAnual, diasCapital);
  const cdiLiquidoPeriodo = cdiBrutoPeriodo * (1 - aliquotaIRRendaFixa(diasCapital));

  // Pontos de equilíbrio (lucro operacional = 0) com o mesmo número de cabeças.
  const fatorReceita = 1 - p.funruralPct - p.comissaoVendaPct;
  const precoEquilibrio = arrobasVendidas > 0
    ? custoOperacional / (arrobasVendidas * fatorReceita) - p.bonificacaoArroba
    : Infinity;
  const compraEquilibrio = n > 0 ? p.precoCompraCab + lucroOperacional / (n * (1 + p.comissaoCompraPct)) : 0;
  const margemSegurancaPreco = divSegura(c1.precoEfetivo - (precoEquilibrio + p.bonificacaoArroba), c1.precoEfetivo);

  const custoEngorda = custoOperacional - t.aquisicao - t.comissaoCompra;
  const giroDias = duracaoGiroDias(p);
  const caixaMinimo = p.capitalInicial - capitalEmpregado;

  if (n === 0) avisos.push('Capital insuficiente para comprar ao menos 1 animal.');
  if (p.cabecasFixas > 0 && capitalEmpregado > capitalProdutivo) {
    avisos.push(`O lote fixo de ${n} cabeças exige ${capitalEmpregado.toFixed(0)} de caixa, mais que o capital produtivo (${capitalProdutivo.toFixed(0)}).`);
  }
  if (caixaMinimo < reserva - 0.005 && !opcoes.capitalDisponivel) {
    avisos.push('O caixa fica abaixo da reserva de segurança durante o ciclo.');
  }
  if (lucroOperacional < 0) avisos.push('Lote com prejuízo operacional nas premissas atuais.');
  if (lucroLiquido > 0 && lucroEconomico < 0) avisos.push('Lucro contábil positivo, mas abaixo do custo de oportunidade (CDI).');

  return {
    premissas: p,
    animal,
    porCabeca: c1,
    cabecas: n, cabecasVivas, mortes,
    totais: t,
    receitaBruta: t.receitaBruta, deducoes, receitaLiquida,
    custoOperacional, lucroOperacional, ir, lucroLiquido,
    custoOportunidade, lucroEconomico,
    arrobasVendidas, arrobasProduzidas,
    custoArrobaProduzida: divSegura(custoEngorda, arrobasProduzidas, NaN),
    custoTotalArrobaVendida: divSegura(custoOperacional + deducoes, arrobasVendidas, NaN),
    margemPorCabeca: divSegura(lucroOperacional, n),
    margemPorArroba: divSegura(lucroOperacional, arrobasVendidas),
    reserva, capitalProdutivo, capitalInicio, capitalEmpregado,
    caixaLivreD0: p.capitalInicial - capitalInicio,
    caixaMinimo,
    diasCapital, giroDias, ciclosAno,
    roiCiclo, roiAnual,
    cdiBrutoPeriodo, cdiLiquidoPeriodo,
    spreadSobreCdi: roiCiclo - cdiLiquidoPeriodo,
    precoEquilibrio, compraEquilibrio, margemSegurancaPreco,
    paybackCiclos: lucroLiquido > 0 ? capitalEmpregado / lucroLiquido : Infinity,
    paybackMeses: lucroLiquido > 0 ? (capitalEmpregado / lucroLiquido) * giroDias / (365 / 12) : Infinity,
    dre: montarDRE(t, receitaLiquida, custoOperacional, lucroOperacional, ir, lucroLiquido, custoOportunidade, lucroEconomico),
    avisos
  };
}

function montarDRE(t, receitaLiquida, custoOperacional, lucroOperacional, ir, lucroLiquido, custoOportunidade, lucroEconomico) {
  const linhas = [
    ['receita', 'Receita bruta', t.receitaBruta],
    ['deducao', 'Funrural', -t.funrural],
    ['deducao', 'Comissão de venda', -t.comissaoVenda],
    ['subtotal', 'Receita líquida', receitaLiquida],
    ['custo', 'Compra dos animais', -t.aquisicao],
    ['custo', 'Comissão de compra', -t.comissaoCompra],
    ['custo', 'Frete de entrada', -t.freteEntrada],
    ['custo', 'Sanidade e manejo', -t.sanidade],
    ['custo', 'Outras despesas', -t.outras],
    ['custo', 'Taxa de entrada do boitel', -t.taxaEntradaBoitel],
    ['custo', 'Boitel — arroba produzida', -t.boitelArroba],
    ['custo', 'Boitel — alimentação (diária)', -t.alimentacao],
    ['custo', 'Boitel — serviço (diária)', -t.servico],
    ['custo', 'Frete de saída', -t.freteSaida],
    ['subtotal', 'Custo operacional total', -custoOperacional],
    ['resultado', 'Lucro operacional', lucroOperacional],
    ['custo', 'IR estimado', -ir],
    ['resultado', 'Lucro líquido (caixa)', lucroLiquido],
    ['economico', 'Custo de oportunidade (CDI, não sai do caixa)', -custoOportunidade],
    ['resultado', 'Lucro econômico', lucroEconomico]
  ];
  return linhas.map(([tipo, rotulo, valor]) => ({ tipo, rotulo, valor }));
}
