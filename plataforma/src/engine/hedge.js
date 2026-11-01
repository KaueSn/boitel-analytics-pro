// Simulador EDUCACIONAL de proteção de preço com derivativos de boi gordo da B3.
// Não executa ordens nem se conecta a corretoras. Prêmios, strikes e preços
// futuros são SEMPRE informados pelo usuário (não há cotação embutida).
// Contrato BGI: 330 @ líquidas, liquidação financeira; opções americanas sobre o futuro.
import { exigirValido, valoresPadrao } from './validacao.js';
import { TAMANHO_CONTRATO_BGI } from './unidades.js';

export const ESQUEMA_HEDGE = {
  arrobasExpostas: { rotulo: 'Arrobas a vender (exposição)', unidade: '@', tipo: 'numero', padrao: 0, min: 0, max: 1e7, origem: 'estimado', nota: 'Puxado do lote atual.' },
  precoFuturoAtual: { rotulo: 'Preço do futuro BGI no vencimento escolhido', unidade: 'R$/@', tipo: 'numero', padrao: 0, min: 0, max: 2000, origem: 'pendente', nota: 'Consulte a B3/corretora. Não há valor embutido.' },
  strike: { rotulo: 'Preço de exercício da put', unidade: 'R$/@', tipo: 'numero', padrao: 0, min: 0, max: 2000, origem: 'pendente' },
  premioPut: { rotulo: 'Prêmio da put', unidade: 'R$/@', tipo: 'numero', padrao: 0, min: 0, max: 500, origem: 'pendente' },
  custoPorContrato: { rotulo: 'Corretagem + emolumentos por contrato (ida e volta)', unidade: 'R$/contrato', tipo: 'numero', padrao: 0, min: 0, max: 10000, origem: 'pendente' },
  base: { rotulo: 'Base esperada (físico regional − referência do contrato)', unidade: 'R$/@', tipo: 'numero', padrao: 0, min: -200, max: 200, origem: 'pendente', nota: 'Ex.: Scot 27/10/2026 MG Triângulo −1,34% vs SP. A base varia e é risco residual.' },
  coberturaPct: { rotulo: 'Fração da produção a proteger', unidade: 'fração', tipo: 'numero', padrao: 1, min: 0, max: 1.5, origem: 'estimado' },
  arredondamento: { rotulo: 'Arredondamento de contratos', tipo: 'opcao', opcoes: ['baixo', 'proximo', 'cima'], padrao: 'baixo', origem: 'estimado' },
  margemPctFuturo: { rotulo: 'Margem de garantia do futuro (fração do nocional)', unidade: 'fração', tipo: 'numero', padrao: 0.1, min: 0, max: 1, origem: 'pendente', nota: 'A B3 define a margem; confirme com a corretora.' },
  volatilidadeAnual: { rotulo: 'Volatilidade anual (só p/ prêmio teórico)', unidade: 'fração', tipo: 'numero', padrao: 0, min: 0, max: 3, origem: 'pendente' },
  diasAteVencimento: { rotulo: 'Dias até o vencimento', unidade: 'dias', tipo: 'inteiro', padrao: 90, min: 1, max: 1000, origem: 'estimado' },
  juroAnual: { rotulo: 'Juro livre de risco (p/ prêmio teórico)', unidade: 'fração', tipo: 'numero', padrao: 0.1365, min: 0, max: 1, origem: 'pesquisado', fonte: 'bcb-cdi' }
};
export const HEDGE_PADRAO = Object.freeze(valoresPadrao(ESQUEMA_HEDGE));

export function contratosTeoricos(arrobas, coberturaPct = 1, modo = 'baixo') {
  const exato = (arrobas * coberturaPct) / TAMANHO_CONTRATO_BGI;
  const n = modo === 'cima' ? Math.ceil(exato) : modo === 'proximo' ? Math.round(exato) : Math.floor(exato);
  return { exato, contratos: Math.max(0, n), arrobasCobertas: Math.max(0, n) * TAMANHO_CONTRATO_BGI };
}

/** Resultado de cada estratégia para um preço de liquidação F_T do contrato. */
export function resultadoNoPreco(h, nContratos, precoLiquidacao) {
  const A = h.arrobasExpostas;
  const q = nContratos * TAMANHO_CONTRATO_BGI;
  const fisico = (precoLiquidacao + h.base) * A; // venda física na praça regional
  const custos = nContratos * h.custoPorContrato;
  const putPayoff = q * Math.max(h.strike - precoLiquidacao, 0) - q * h.premioPut - custos;
  const futPayoff = q * (h.precoFuturoAtual - precoLiquidacao) - custos;
  const porArroba = v => (A > 0 ? v / A : 0);
  return {
    precoLiquidacao,
    precoFisico: precoLiquidacao + h.base,
    semHedge: fisico,
    comPut: fisico + putPayoff,
    comFuturo: fisico + futPayoff,
    resultadoPut: putPayoff,
    resultadoFuturo: futPayoff,
    precoEfetivoSemHedge: porArroba(fisico),
    precoEfetivoPut: porArroba(fisico + putPayoff),
    precoEfetivoFuturo: porArroba(fisico + futPayoff)
  };
}

/** Grade de cenários de −variacao a +variacao em torno do preço futuro atual. */
export function simularHedge(entrada, { variacao = 0.3, passos = 13 } = {}) {
  const h = exigirValido(ESQUEMA_HEDGE, entrada);
  const avisos = [];
  if (h.precoFuturoAtual <= 0) avisos.push('Informe o preço futuro do vencimento escolhido (dado não embutido na plataforma).');
  if (h.strike <= 0 || h.premioPut <= 0) avisos.push('Informe strike e prêmio reais da put. Sem eles a simulação da put não tem valor prático.');
  const { exato, contratos, arrobasCobertas } = contratosTeoricos(h.arrobasExpostas, h.coberturaPct, h.arredondamento);
  if (h.arrobasExpostas > 0 && contratos === 0) avisos.push(`Exposição de ${h.arrobasExpostas.toFixed(0)} @ é menor que 1 contrato (330 @): proteção em bolsa não é possível sem sobre-hedge.`);
  const coberturaEfetiva = h.arrobasExpostas > 0 ? arrobasCobertas / h.arrobasExpostas : 0;
  if (coberturaEfetiva > 1) avisos.push('Sobre-hedge: contratos cobrem mais que a produção esperada (risco se a produção cair).');

  const ref = h.precoFuturoAtual || 1;
  const grade = [];
  for (let i = 0; i < passos; i++) {
    const v = -variacao + (2 * variacao * i) / (passos - 1);
    grade.push({ variacao: v, ...resultadoNoPreco(h, contratos, ref * (1 + v)) });
  }
  const custoPorArroba = contratos > 0 ? h.custoPorContrato / TAMANHO_CONTRATO_BGI : 0;
  return {
    premissas: h,
    contratosExatos: exato, contratos, arrobasCobertas, coberturaEfetiva,
    nocional: arrobasCobertas * h.precoFuturoAtual,
    custoTotalPut: arrobasCobertas * h.premioPut + contratos * h.custoPorContrato,
    margemFuturo: arrobasCobertas * h.precoFuturoAtual * h.margemPctFuturo,
    // Piso por arroba COBERTA: strike − prêmio − custos + base (a parte não coberta fica exposta)
    pisoPutPorArroba: h.strike - h.premioPut - custoPorArroba + h.base,
    travaFuturoPorArroba: h.precoFuturoAtual - custoPorArroba + h.base,
    premioTeorico: h.volatilidadeAnual > 0 && h.precoFuturoAtual > 0 && h.strike > 0
      ? black76Put(h.precoFuturoAtual, h.strike, h.volatilidadeAnual, h.diasAteVencimento / 365, h.juroAnual)
      : null,
    grade,
    avisos,
    riscosResiduais: RISCOS_RESIDUAIS
  };
}

export const RISCOS_RESIDUAIS = [
  'Risco de base: o preço físico regional (MG/SP) não acompanha exatamente o indicador de liquidação do BGI (DATAGRO desde fev/2025).',
  'Risco de quantidade: mortalidade, peso e rendimento diferentes do previsto deixam parte da produção sem proteção ou com sobre-hedge.',
  'Risco de prazo: a data de abate pode não coincidir com o vencimento; rolar posições tem custo.',
  'Contratos inteiros de 330 @: lotes pequenos ficam parcialmente expostos.',
  'Futuro vendido gera ajustes diários e chamadas de margem que consomem caixa na alta, mesmo que o resultado final se compense no físico.',
  'Put: o prêmio é custo certo e não volta se o preço subir; protege a queda, não garante lucro.',
  'Liquidez: poucos negócios em vencimentos/strikes distantes encarecem a entrada e a saída.',
  'Contraparte e execução no físico: o hedge não protege contra inadimplência do frigorífico nem desconto de carcaça.'
];

// --- Prêmio teórico (Black-76 para opção sobre futuro). Estritamente educacional. ---
function cdfNormal(x) {
  // Aproximação de Abramowitz-Stegun 26.2.17 (erro < 7,5e-8)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export function black76Put(F, K, sigma, T, r) {
  if (T <= 0 || sigma <= 0) return Math.max(K - F, 0);
  const sT = sigma * Math.sqrt(T);
  const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / sT;
  const d2 = d1 - sT;
  return Math.exp(-r * T) * (K * cdfNormal(-d2) - F * cdfNormal(-d1));
}

export function black76Call(F, K, sigma, T, r) {
  // paridade put-call para futuros: C − P = e^{−rT}(F − K)
  return black76Put(F, K, sigma, T, r) + Math.exp(-r * T) * (F - K);
}

export { cdfNormal };
