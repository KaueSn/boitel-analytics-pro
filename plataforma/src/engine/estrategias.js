// Caminhos alternativos para o objetivo (capital inicial → fazenda própria),
// análise dos preços informados pelo usuário e checklist de oportunidades.
// Todo veredito sai dos números calculados; nada aqui é recomendação de investimento.
import { projetarPatrimonio, PATRIMONIO_PADRAO } from './patrimonio.js';
import { MODELO_C_PADRAO } from './modelos.js';
import { aplicarChoques, CENARIOS_PADRAO } from './cenarios.js';
import { serieCDI } from './rendaFixa.js';
import { calcularLote } from './lote.js';
import { fonte } from './mercado.js';

/**
 * Análise dos preços que o USUÁRIO informou (a plataforma não embute cotações).
 * Relação de troca = arrobas de boi gordo para comprar 1 animal.
 * Ágio da reposição = preço da @ de carcaça de entrada (RC de entrada) ÷ preço da @ do boi gordo − 1.
 */
export function analisarPrecos(p, limiteAgio = 0.1) {
  const venda = p.precoVendaArroba + p.bonificacaoArroba;
  const arrobasEntrada = p.pesoEntradaKg * p.rcEntrada / 15;
  const precoArrobaEntrada = p.precoCompraCab / (arrobasEntrada || 1e-9);
  const agio = precoArrobaEntrada / Math.max(1e-9, venda) - 1;
  const alertas = [];
  if (agio > limiteAgio) {
    alertas.push(`Pelos seus preços, o animal de reposição custa ${(agio * 100).toFixed(1)}% a mais por arroba do que o boi gordo. Em terminação curta, esse ágio costuma consumir a margem.`);
  }
  const icbc = fonte('icbc-set26');
  if (p.modoCobranca === 'arroba_produzida' && typeof p.precoArrobaProduzida === 'number' && typeof icbc.valor === 'number' && p.precoArrobaProduzida <= icbc.valor) {
    alertas.push(`O preço por arroba produzida (R$ ${p.precoArrobaProduzida.toFixed(2)}) está no nível do CUSTO de produção medido pelo ICBC/USP (R$ ${icbc.valor.toFixed(2)}). O boitel cobra margem: peça a cotação real.`);
  }
  return {
    relacaoTroca: p.precoCompraCab / Math.max(1e-9, venda),
    precoKgReposicao: p.precoCompraCab / Math.max(1e-9, p.pesoEntradaKg),
    precoArrobaEntrada, agio, alertas
  };
}

/**
 * Varredura peso de entrada × dias de cocho mantendo o MESMO R$/kg de compra das premissas
 * (na prática, animais mais leves costumam custar mais por kg: confira com cotações reais).
 */
export function varrerPesoEDias(p, pesos = [240, 270, 300, 320, 345, 375], dias = [90, 105, 120, 150]) {
  const kg = p.precoCompraCab / Math.max(1e-9, p.pesoEntradaKg);
  const linhas = pesos.map(peso => ({
    peso, precoKg: kg, precoCompra: kg * peso,
    celulas: dias.map(d => {
      const r = calcularLote({ ...p, pesoEntradaKg: peso, precoCompraCab: kg * peso, diasCiclo: d });
      return { dias: d, cabecas: r.cabecas, lucroPorCab: r.margemPorCabeca, lucroLiquido: r.lucroLiquido, roiAnual: r.roiAnual, precoEquilibrio: r.precoEquilibrio, pesoSaida: r.animal.pesoSaidaKg };
    })
  }));
  let melhor = null;
  for (const l of linhas) for (const c of l.celulas) if (c.cabecas > 0 && (!melhor || c.roiAnual > melhor.roiAnual)) melhor = { peso: l.peso, ...c };
  return { precoKg: kg, dias, linhas, melhor, cdi: p.cdiAnual };
}

function resumir(id, nome, descricao, proj, extra = {}) {
  const minCaixa = Math.min(...proj.meses.map(m => m.caixa));
  return {
    id, nome, descricao,
    patrimonioFinal: proj.resumo.patrimonioFinal,
    caixaFinal: proj.resumo.caixaFinal,
    anoCompraFazenda: proj.resumo.anoCompraFazenda,
    lotes: proj.resumo.lotes,
    minCaixa,
    alertasRisco: proj.alertas.filter(a => a.tipo !== 'info').length,
    dividaFinal: proj.resumo.dividaFinal,
    ...extra
  };
}

/** Aporte mensal mínimo para comprar a fazenda até `anoAlvo` (bisseção). null = não encontrado. */
export function aporteNecessario(pLote, pPat, pC, anoAlvo, maxAporte = 200000) {
  const ok = a => {
    const r = projetarPatrimonio(pLote, { ...pPat, aporteMensal: a, forcarCompraAno: 0, horizonteAnos: Math.max(anoAlvo, 1) }, pC);
    return r.resumo.anoCompraFazenda !== null && r.resumo.anoCompraFazenda <= anoAlvo;
  };
  if (ok(0)) return 0;
  if (!ok(maxAporte)) return null;
  let lo = 0, hi = maxAporte;
  for (let i = 0; i < 25; i++) {
    const m = (lo + hi) / 2;
    if (ok(m)) hi = m; else lo = m;
  }
  return Math.ceil(hi / 100) * 100;
}

/** Área máxima que o caixa projetado comportaria em cada ano, mantendo a liquidez. */
export function areaViavelPorAno(pLote, pPat, pC) {
  const proj = projetarPatrimonio(pLote, { ...pPat, habilitarFazenda: false }, pC);
  const custoHaAno = pPat.custoFazendaHaAno + pPat.itrAliquota * pPat.precoHa;
  return proj.anos.map(a => {
    // Giro a preservar: o do último lote fechado ATÉ este ano, não o maior lote da projeção
    const fechados = proj.lotes.filter(l => l.fim <= a.ano * 365);
    const giro = fechados.length ? fechados[fechados.length - 1].capital * pPat.giroMinimoPct : 0;
    const livre = a.caixa + a.estoqueAnimais - pLote.reservaPct * (a.caixa + a.estoqueAnimais) - giro - 12 * pPat.maoDeObraFazendaMensal;
    const custoPorHa = pPat.precoHa * (1 + pPat.custosAquisicaoPct) + custoHaAno; // compra + 1 ano de manutenção
    const area = custoPorHa !== 0 ? Math.max(0, livre / custoPorHa) : 0;
    return { ano: a.ano, patrimonio: a.patrimonioLiquido, areaHa: area };
  });
}

/**
 * Roda os caminhos alternativos com as mesmas premissas de mercado.
 * `pPat` precisa trazer os parâmetros de fazenda (área, preço/ha) definidos pelo usuário.
 */
export function compararCaminhos(pLote, pPat = PATRIMONIO_PADRAO, pC = MODELO_C_PADRAO) {
  const H = pPat.horizonteAnos;
  const caminhos = [];
  const rodar = (id, nome, descricao, ajusteLote, ajustePat, extra) => {
    const proj = projetarPatrimonio({ ...pLote, ...ajusteLote }, { ...pPat, ...ajustePat }, pC);
    const pess = projetarPatrimonio(aplicarChoques({ ...pLote, ...ajusteLote }, CENARIOS_PADRAO.pessimista.choques), { ...pPat, ...ajustePat }, pC);
    caminhos.push(resumir(id, nome, descricao, proj, { patrimonioPessimista: pess.resumo.patrimonioFinal, anoFazendaPessimista: pess.resumo.anoCompraFazenda, ...extra }));
  };
  rodar('boitel', 'Só boitel + fazenda à vista', 'Fase 1 contínua, sem recria; compra à vista quando a liquidez permitir.', {}, { habilitarRecria: false, formaPagamento: 'avista' });
  rodar('hibrido', 'Boitel → recria + boitel → fazenda à vista', 'Plano do briefing: recria quando o lote passa do limiar e for mais rentável.', {}, { habilitarRecria: true, formaPagamento: 'avista' });
  rodar('financiada', 'Híbrido + fazenda financiada', `Entrada de ${(pPat.entradaPct * 100).toFixed(0)}%, juros e prazo informados.`, {}, { habilitarRecria: true, formaPagamento: 'financiado' });
  rodar('gancho', 'Boitel com acerto no gancho', 'O boitel recebe na venda: mais cabeças por lote com o mesmo capital (depende de contrato).', { boitelPagamento: 'final' }, { habilitarRecria: true, formaPagamento: 'avista' });
  rodar('sem_fazenda', 'Seguir arrendando (sem comprar terra)', 'Mantém todo o capital girando; compare o patrimônio, não só a posse da terra.', {}, { habilitarRecria: true, habilitarFazenda: false });

  const cdi = serieCDI({ capital: pLote.capitalInicial, cdiAnual: pLote.cdiAnual, anos: H });
  caminhos.push({
    id: 'cdi', nome: 'Renda fixa 100% CDI (referência)', descricao: 'Aplicação líquida de IR (15% acima de 720 dias), sem risco operacional.',
    patrimonioFinal: cdi[H].montanteLiquido, caixaFinal: cdi[H].montanteLiquido, anoCompraFazenda: null, lotes: 0, minCaixa: pLote.capitalInicial,
    alertasRisco: 0, dividaFinal: 0, patrimonioPessimista: cdi[H].montanteLiquido, anoFazendaPessimista: null
  });

  const ref = caminhos.find(c => c.id === 'cdi').patrimonioFinal;
  for (const c of caminhos) {
    c.vsCdi = c.patrimonioFinal - ref;
    c.veredito = vereditoCaminho(c, ref);
  }
  return { caminhos, horizonteAnos: H };
}

function vereditoCaminho(c, refCdi) {
  if (c.id === 'cdi') return 'Referência de custo de oportunidade.';
  const partes = [];
  if (c.minCaixa < 0) partes.push('exige aporte/crédito em algum momento (caixa negativo)');
  if (c.patrimonioFinal < refCdi) partes.push('termina abaixo do CDI');
  else partes.push('supera o CDI no cenário base');
  if (c.patrimonioPessimista < refCdi) partes.push('perde para o CDI no cenário pessimista');
  if (c.anoCompraFazenda) partes.push(`fazenda no ano ${c.anoCompraFazenda}`);
  else if (c.id !== 'sem_fazenda') partes.push('fazenda não fica viável no horizonte');
  return partes.join('; ') + '.';
}

/** Oportunidades e verificações: itens a CONFIRMAR, nunca afirmações de ganho. */
export function checklistOportunidades(p) {
  const lote = calcularLote(p);
  const lista = [
    { tema: 'Preço de venda', texto: 'Bonificação "Boi China" (até 30 meses, até 4 dentes, GTA com idade) pode elevar o preço por @. Confirme a grade do frigorífico e o enquadramento do lote.', status: 'verificar' },
    { tema: 'Contrato do boitel', texto: 'Compare cobrança por @ produzida × diária: peça a planilha do boitel com o RC de entrada usado, a regra para mortos/refugos e quem paga o frete.', status: 'verificar' },
    { tema: 'Capital de giro', texto: `Acerto no gancho (boitel pago na venda) muda o capital necessário de ${Math.round(lote.capitalEmpregado).toLocaleString('pt-BR')} para menos — compare na aba Caminhos.`, status: 'calculado' },
    { tema: 'Proteção de preço', texto: 'Put de BGI define piso sem chamada de margem para o titular; o lote precisa ter pelo menos 330 @ por contrato.', status: lote.arrobasVendidas >= 330 ? 'aplicável' : 'lote pequeno para 1 contrato' },
    { tema: 'Reserva de segurança', texto: 'Títulos isentos de IR para PF (ex.: LCA) podem render mais líquido que o CDI tributado. Confirme a regra vigente e a liquidez.', status: 'verificar' },
    { tema: 'Crédito rural', texto: 'Linhas do Plano Safra (custeio/comercialização/investimento) têm juros controlados e limites por produtor. Taxas e enquadramento mudam a cada safra: consulte o banco e o MAPA.', status: 'verificar' },
    { tema: 'Tributação', texto: 'PF rural pode apurar pelo livro-caixa ou pelo resultado presumido de 20% da receita. A escolha muda muito o IR: defina com o contador.', status: 'verificar' },
    { tema: 'Terra', texto: 'Compare compra × arrendamento × parceria pecuária. Consulte VTN (Receita/EMATER-MG), certidões, CAR, georreferenciamento e passivo ambiental antes de qualquer sinal.', status: 'verificar' },
    { tema: 'Sanidade e documentação', texto: 'GTA, vacinação obrigatória da sua UF e rastreabilidade (lista de exportação) afetam preço e prazo de venda.', status: 'verificar' }
  ];
  if (lote.lucroOperacional <= 0) lista.unshift({ tema: 'Viabilidade', texto: 'Com as premissas atuais o lote não paga os custos. Revise preço de compra, preço de venda e custo do boitel antes de qualquer outra decisão.', status: 'alerta' });
  return lista;
}
