// Comparador de modelos operacionais com o MESMO capital e o MESMO horizonte (1 ano).
//  A — Confinamento próprio (instalações + custos fixos + dieta própria)
//  B — Terminação terceirizada em boitel (lote.js)
//  C — Recria a pasto (própria/arrendada) + terminação em boitel
// Simplificação documentada: resultado anual = resultado por ciclo × ciclos/ano,
// sem reinvestir dentro do ano (o reinvestimento é tratado em patrimonio.js).
import { ESQUEMA_LOTE } from './premissas.js';
import { exigirValido, valoresPadrao } from './validacao.js';
import { calcularLote, porCabecaComprada, caixaPicoPorCabeca, calcularIR } from './lote.js';
import { calcularAnimal } from './zootecnia.js';
import { taxaPeriodo, divSegura, DIAS_MES } from './unidades.js';

const P = 'pendente';
export const ESQUEMA_MODELO_A = {
  capexPorCabeca: { grupo: 'A — Instalações', rotulo: 'Instalações por cabeça de capacidade (currais, cocho, água)', unidade: 'R$/cab', tipo: 'numero', padrao: 900, min: 0, max: 20000, origem: P, nota: 'Valor do dossiê não localizado no ambiente: substitua pela cotação.' },
  equipamentosFixos: { grupo: 'A — Instalações', rotulo: 'Equipamentos fixos (vagão, trator, balança)', unidade: 'R$', tipo: 'numero', padrao: 180000, min: 0, max: 1e8, origem: P },
  licenciamento: { grupo: 'A — Instalações', rotulo: 'Licenciamento ambiental e projeto', unidade: 'R$', tipo: 'numero', padrao: 15000, min: 0, max: 1e7, origem: P },
  vidaUtilAnos: { grupo: 'A — Instalações', rotulo: 'Vida útil para depreciação', unidade: 'anos', tipo: 'numero', padrao: 10, min: 1, max: 50, origem: 'estimado' },
  arrendamentoAnual: { grupo: 'A — Custos fixos', rotulo: 'Arrendamento da área', unidade: 'R$/ano', tipo: 'numero', padrao: 24000, min: 0, max: 1e8, origem: P },
  maoDeObraMensal: { grupo: 'A — Custos fixos', rotulo: 'Mão de obra com encargos', unidade: 'R$/mês', tipo: 'numero', padrao: 9000, min: 0, max: 1e7, origem: P },
  energiaMensal: { grupo: 'A — Custos fixos', rotulo: 'Energia, água e combustível', unidade: 'R$/mês', tipo: 'numero', padrao: 1500, min: 0, max: 1e7, origem: P },
  manutencaoPctAno: { grupo: 'A — Custos fixos', rotulo: 'Manutenção sobre o investimento', unidade: 'fração/ano', tipo: 'numero', padrao: 0.03, min: 0, max: 0.5, origem: 'estimado' },
  dietaPropriaDia: { grupo: 'A — Operação', rotulo: 'Dieta própria', unidade: 'R$/cab/dia', tipo: 'numero', padrao: 12, min: 0, max: 200, origem: 'informado' },
  capacidadeMaxima: { grupo: 'A — Operação', rotulo: 'Capacidade máxima (0 = pelo capital)', unidade: 'cab', tipo: 'inteiro', padrao: 0, min: 0, max: 100000, origem: 'estimado' },
  capacidadeMinima: { grupo: 'A — Operação', rotulo: 'Escala mínima para operar', unidade: 'cab', tipo: 'inteiro', padrao: 100, min: 1, max: 100000, origem: 'estimado', nota: 'Abaixo disso, os custos fixos tornam a operação própria irreal.' }
};

export const ESQUEMA_MODELO_C = {
  pesoCompraRecriaKg: { grupo: 'C — Recria', rotulo: 'Peso de compra para recria', unidade: 'kg vivo', tipo: 'numero', padrao: 240, min: 100, max: 500, origem: 'pesquisado', fonte: 'scot-reposicao-mg' },
  precoCompraRecriaCab: { grupo: 'C — Recria', rotulo: 'Preço do bezerro/garrote', unidade: 'R$/cab', tipo: 'numero', padrao: 3975.16, min: 0, max: 50000, origem: 'pesquisado', fonte: 'scot-reposicao-mg', nota: 'Bezerro Nelore 12 meses, 240 kg, MG, 27/10/2026.' },
  diasRecria: { grupo: 'C — Recria', rotulo: 'Duração da recria', unidade: 'dias', tipo: 'inteiro', padrao: 180, min: 30, max: 720, origem: 'estimado' },
  gmdAguas: { grupo: 'C — Recria', rotulo: 'GMD a pasto nas águas', unidade: 'kg/dia', tipo: 'numero', padrao: 0.6, min: 0, max: 2, origem: 'estimado' },
  gmdSeca: { grupo: 'C — Recria', rotulo: 'GMD a pasto na seca', unidade: 'kg/dia', tipo: 'numero', padrao: 0.25, min: -0.5, max: 2, origem: 'estimado' },
  fracaoSeca: { grupo: 'C — Recria', rotulo: 'Fração da recria na seca (sazonalidade)', unidade: 'fração', tipo: 'numero', padrao: 0.5, min: 0, max: 1, origem: 'estimado' },
  custoPastoCabMes: { grupo: 'C — Recria', rotulo: 'Pasto arrendado', unidade: 'R$/cab/mês', tipo: 'numero', padrao: 60, min: 0, max: 2000, origem: P },
  suplementacaoDia: { grupo: 'C — Recria', rotulo: 'Suplementação (sal/proteinado)', unidade: 'R$/cab/dia', tipo: 'numero', padrao: 1.5, min: 0, max: 100, origem: P },
  sanidadeRecriaCab: { grupo: 'C — Recria', rotulo: 'Sanidade na recria', unidade: 'R$/cab', tipo: 'numero', padrao: 40, min: 0, max: 5000, origem: P },
  mortalidadeRecria: { grupo: 'C — Recria', rotulo: 'Mortalidade na recria', unidade: 'fração', tipo: 'numero', padrao: 0.015, min: 0, max: 1, origem: 'estimado' },
  freteRecriaBoitelCab: { grupo: 'C — Recria', rotulo: 'Frete recria → boitel', unidade: 'R$/cab', tipo: 'numero', padrao: 150, min: 0, max: 5000, origem: P }
};

export const MODELO_A_PADRAO = Object.freeze(valoresPadrao(ESQUEMA_MODELO_A));
export const MODELO_C_PADRAO = Object.freeze(valoresPadrao(ESQUEMA_MODELO_C));

function resumo(base) {
  const r = { ...base };
  r.roiAnual = divSegura(r.lucroLiquidoAnual, r.capitalEmpregado);
  r.margemPorCabeca = divSegura(r.lucroOperacionalAnual, r.cabecasAno);
  r.viavel = r.cabecas > 0;
  return r;
}

/** Modelo B — boitel. */
export function modeloB(pLote) {
  const l = calcularLote(pLote);
  return resumo({
    modelo: 'B', nome: 'Boitel (terceirizado)',
    cabecas: l.cabecas, ciclosAno: l.ciclosAno, giroDias: l.giroDias,
    cabecasAno: l.cabecas * l.ciclosAno,
    arrobasAno: l.arrobasVendidas * l.ciclosAno,
    arrobasProduzidasAno: l.arrobasProduzidas * l.ciclosAno,
    capitalEmpregado: l.capitalEmpregado,
    imobilizado: 0,
    custoArrobaProduzida: l.custoArrobaProduzida,
    lucroOperacionalAnual: l.lucroOperacional * l.ciclosAno,
    lucroLiquidoAnual: l.lucroLiquido * l.ciclosAno,
    custosFixosAnuais: 0, depreciacaoAnual: 0,
    precoEquilibrio: l.precoEquilibrio,
    custoOportunidadeAnual: l.capitalEmpregado * taxaPeriodo(pLote.cdiAnual ?? l.premissas.cdiAnual, 365),
    notas: ['Sem imobilização; depende de vaga, contrato e desempenho do boitel.'],
    detalhe: l
  });
}

/** Modelo A — confinamento próprio, dimensionado pelo mesmo capital produtivo. */
export function modeloA(pLoteEntrada, pAEntrada) {
  const pL = exigirValido(ESQUEMA_LOTE, pLoteEntrada);
  const a = exigirValido(ESQUEMA_MODELO_A, pAEntrada);
  const pOwn = { ...pL, modoCobranca: 'diaria', alimentacaoDia: a.dietaPropriaDia, servicoDia: 0, taxaEntradaBoitelCab: 0, boitelPagamento: 'durante' };
  const c1 = porCabecaComprada(pOwn);
  const giroPorCab = caixaPicoPorCabeca(pOwn, c1).pico;
  const capitalProdutivo = pL.capitalInicial * (1 - pL.reservaPct);
  const fixos = a.equipamentosFixos + a.licenciamento;
  let cap = Math.floor(divSegura(capitalProdutivo - fixos, a.capexPorCabeca + giroPorCab));
  if (a.capacidadeMaxima > 0) cap = Math.min(cap, a.capacidadeMaxima);
  const capacidadeCalculada = Math.max(0, cap);
  cap = capacidadeCalculada >= a.capacidadeMinima ? capacidadeCalculada : 0;
  const capex = cap > 0 ? fixos + cap * a.capexPorCabeca : 0;
  const lote = calcularLote({ ...pOwn, cabecasFixas: Math.max(cap, 0) || 1 });
  const k = cap > 0 ? 1 : 0;
  const ciclos = lote.ciclosAno;
  const depreciacao = (capex - a.licenciamento * k) / a.vidaUtilAnos;
  const custosFixos = k * (a.arrendamentoAnual + 12 * (a.maoDeObraMensal + a.energiaMensal) + capex * a.manutencaoPctAno);
  const lucroOpAnual = k * lote.lucroOperacional * ciclos - custosFixos - depreciacao;
  const receitaAnual = k * lote.receitaBruta * ciclos;
  const ir = calcularIR(pL, lucroOpAnual, receitaAnual);
  const arrobasAno = k * lote.arrobasVendidas * ciclos;
  const arrobasProd = k * lote.arrobasProduzidas * ciclos;
  const custoEngordaAnual = k * (lote.custoOperacional - lote.totais.aquisicao - lote.totais.comissaoCompra) * ciclos + custosFixos + depreciacao;
  const fator = 1 - pL.funruralPct - pL.comissaoVendaPct;
  const custoTotalAnual = k * lote.custoOperacional * ciclos + custosFixos + depreciacao;
  const capitalEmpregado = capex + k * lote.capitalEmpregado;
  return resumo({
    modelo: 'A', nome: 'Confinamento próprio',
    cabecas: cap, ciclosAno: ciclos, giroDias: lote.giroDias,
    cabecasAno: cap * ciclos, arrobasAno, arrobasProduzidasAno: arrobasProd,
    capitalEmpregado, imobilizado: capex,
    custoArrobaProduzida: divSegura(custoEngordaAnual, arrobasProd, NaN),
    lucroOperacionalAnual: lucroOpAnual,
    lucroLiquidoAnual: lucroOpAnual - ir,
    fluxoCaixaAnual: lucroOpAnual - ir + depreciacao,
    custosFixosAnuais: custosFixos, depreciacaoAnual: depreciacao,
    precoEquilibrio: arrobasAno > 0 ? custoTotalAnual / (arrobasAno * fator) - pL.bonificacaoArroba : Infinity,
    custoOportunidadeAnual: capitalEmpregado * pL.cdiAnual,
    notas: cap > 0
      ? ['Imobiliza capital em instalações; custos fixos correm mesmo sem animais.', 'Licenciamento não é depreciado.']
      : [`Capital insuficiente: comportaria ${capacidadeCalculada} cabeças, abaixo da escala mínima de ${a.capacidadeMinima}.`],
    detalhe: k ? lote : null
  });
}

/** Modelo C — recria a pasto + terminação em boitel. Valores por cabeça comprada. */
export function modeloC(pLoteEntrada, pCEntrada) {
  const pL = exigirValido(ESQUEMA_LOTE, pLoteEntrada);
  const c = exigirValido(ESQUEMA_MODELO_C, pCEntrada);
  const gmdRecria = c.gmdAguas * (1 - c.fracaoSeca) + c.gmdSeca * c.fracaoSeca;
  const pesoFimRecria = c.pesoCompraRecriaKg + gmdRecria * c.diasRecria;
  const mR = c.mortalidadeRecria;
  const diasRecriaCobrados = (1 - mR) * c.diasRecria + mR * c.diasRecria * pL.fracaoCicloMorte;
  const compra = c.precoCompraRecriaCab * (1 + pL.comissaoCompraPct);
  const custoRecria = diasRecriaCobrados * (c.custoPastoCabMes / DIAS_MES + c.suplementacaoDia) + c.sanidadeRecriaCab;
  const recriaPorCab = compra + pL.freteEntradaCab + custoRecria;

  // Terminação: o animal já é próprio, então não há nova compra nem comissão.
  const pT = { ...pL, pesoEntradaKg: pesoFimRecria, precoCompraCab: 0, comissaoCompraPct: 0, freteEntradaCab: c.freteRecriaBoitelCab };
  const animal = calcularAnimal(pT);
  const t = porCabecaComprada(pT, animal);
  const s = 1 - mR;
  const picoTerm = caixaPicoPorCabeca(pT, t).pico;
  const picoPorCab = recriaPorCab + s * picoTerm;
  const capitalProdutivo = pL.capitalInicial * (1 - pL.reservaPct);
  const n = pL.cabecasFixas > 0 ? pL.cabecasFixas : Math.max(0, Math.floor(divSegura(capitalProdutivo, picoPorCab)));

  const custoTerm = t.aquisicao + t.comissaoCompra + t.freteEntrada + t.sanidade + t.outras + t.taxaEntradaBoitel + t.alimentacao + t.servico + t.boitelArroba + t.freteSaida;
  const custoPorCab = recriaPorCab + s * custoTerm;
  const receitaBrutaCab = s * t.receitaBruta;
  const deducoesCab = s * (t.funrural + t.comissaoVenda);
  const lucroOpCiclo = n * (receitaBrutaCab - deducoesCab - custoPorCab);
  const giroDias = c.diasRecria + pL.diasCiclo + pL.prazoRecebimentoDias + pL.intervaloEntreLotesDias;
  const ciclosAno = 365 / giroDias;
  const lucroOpAnual = lucroOpCiclo * ciclosAno;
  const receitaAnual = n * receitaBrutaCab * ciclosAno;
  const ir = calcularIR(pL, lucroOpAnual, receitaAnual);
  const vivosFinal = s * (1 - pL.mortalidadePct);
  const arrobasCiclo = n * vivosFinal * animal.arrobasSaida;
  const arrobasEntradaRecria = c.pesoCompraRecriaKg * pL.rcEntrada / 15;
  const arrobasProdCiclo = n * vivosFinal * (animal.arrobasSaida - arrobasEntradaRecria);
  const fator = 1 - pL.funruralPct - pL.comissaoVendaPct;
  const avisos = [...animal.avisos];
  if (c.fracaoSeca > 0.4 && c.gmdSeca < 0.2) avisos.push('Recria com muita seca e GMD baixo: considere suplementação ou compra de animal mais pesado.');
  return resumo({
    modelo: 'C', nome: 'Recria a pasto + boitel',
    cabecas: n, ciclosAno, giroDias, pesoFimRecria, gmdRecria,
    cabecasAno: n * ciclosAno,
    arrobasAno: arrobasCiclo * ciclosAno,
    arrobasProduzidasAno: arrobasProdCiclo * ciclosAno,
    capitalEmpregado: n * picoPorCab,
    imobilizado: 0,
    custoArrobaProduzida: divSegura(n * (custoPorCab - compra), arrobasProdCiclo, NaN),
    lucroOperacionalAnual: lucroOpAnual,
    lucroLiquidoAnual: lucroOpAnual - ir,
    lucroLiquidoCiclo: (lucroOpAnual - ir) / ciclosAno,
    custosFixosAnuais: 0, depreciacaoAnual: 0,
    precoEquilibrio: arrobasCiclo > 0 ? (n * custoPorCab) / (arrobasCiclo * fator) - pL.bonificacaoArroba : Infinity,
    custoOportunidadeAnual: n * picoPorCab * pL.cdiAnual,
    notas: ['Capital fica preso por mais tempo (recria + terminação).', 'Exposto à sazonalidade do pasto e ao preço do bezerro.', ...avisos],
    detalhe: { animal, porCabecaRecria: { compra, custoRecria, frete: pL.freteEntradaCab }, porCabecaTerminacao: t }
  });
}

/** Compara A, B e C nas mesmas premissas de lote. */
export function compararModelos(pLote, pA = MODELO_A_PADRAO, pC = MODELO_C_PADRAO) {
  const linhas = [modeloA(pLote, pA), modeloB(pLote), modeloC(pLote, pC)];
  const viaveis = linhas.filter(l => l.viavel);
  const melhor = (campo, maior = true) => {
    if (!viaveis.length) return null;
    return viaveis.reduce((m, l) => ((maior ? l[campo] > m[campo] : l[campo] < m[campo]) ? l : m)).modelo;
  };
  return {
    linhas,
    melhorPor: {
      lucroLiquidoAnual: melhor('lucroLiquidoAnual'),
      roiAnual: melhor('roiAnual'),
      precoEquilibrio: melhor('precoEquilibrio', false),
      custoArrobaProduzida: melhor('custoArrobaProduzida', false)
    }
  };
}
