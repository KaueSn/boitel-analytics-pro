// Caminhos alternativos para o objetivo (capital inicial → fazenda própria),
// conferência das premissas contra o mercado pesquisado e checklist de oportunidades.
// Todo veredito sai dos números calculados; nada aqui é recomendação de investimento.
import { projetarPatrimonio, PATRIMONIO_PADRAO } from './patrimonio.js';
import { MODELO_C_PADRAO } from './modelos.js';
import { aplicarChoques, CENARIOS_PADRAO } from './cenarios.js';
import { serieCDI } from './rendaFixa.js';
import { calcularLote } from './lote.js';
import { REGIOES, fonte, precoReposicaoKgInterpolado } from './mercado.js';

/** Compara premissas com as referências pesquisadas e aponta desvios relevantes. */
export function conferirPremissas(p, regiao = 'MG', limite = 0.1) {
  const ref = REGIOES[regiao];
  const itens = [];
  const add = (rotulo, usado, referencia, idFonte, unidade) => {
    if (!referencia) return;
    const desvio = usado / referencia - 1;
    const f = fonte(idFonte);
    itens.push({ rotulo, usado, referencia, desvio, unidade, fonte: f?.nome, data: f?.data, alerta: Math.abs(desvio) > limite });
  };
  add('Preço da arroba', p.precoVendaArroba + p.bonificacaoArroba, ref.precoVendaArroba, ref.fontePreco, 'R$/@');
  const kgRef = precoReposicaoKgInterpolado(regiao, p.pesoEntradaKg);
  add('Preço do animal de reposição', p.precoCompraCab, kgRef * p.pesoEntradaKg, ref.fonteReposicao, `R$/cab (${kgRef.toFixed(2)} R$/kg interpolado × ${p.pesoEntradaKg} kg)`);
  if (p.modoCobranca === 'arroba_produzida') add('Preço da @ produzida no boitel', p.precoArrobaProduzida, fonte('icbc-set26').valor, 'icbc-set26', 'R$/@ (ICBC = custo, não preço)');
  add('CDI', p.cdiAnual, fonte('bcb-cdi').valor, 'bcb-cdi', 'a.a.');
  const relacaoTroca = p.precoCompraCab / Math.max(1e-9, p.precoVendaArroba);
  const relacaoTrocaMercado = (kgRef * p.pesoEntradaKg) / ref.precoVendaArroba;
  // Ágio da reposição: preço da @ "de entrada" (carcaça presumida no RC de entrada) vs. @ do boi gordo
  const precoArrobaEntrada = p.precoCompraCab / (p.pesoEntradaKg * p.rcEntrada / 15);
  const precoArrobaEntradaMercado = (kgRef * p.pesoEntradaKg) / (p.pesoEntradaKg * p.rcEntrada / 15);
  return {
    regiao: ref.nome, itens, relacaoTroca, relacaoTrocaMercado,
    precoArrobaEntrada, precoArrobaEntradaMercado,
    agioReposicaoMercado: precoArrobaEntradaMercado / ref.precoVendaArroba - 1,
    precoMercadoCompra: kgRef * p.pesoEntradaKg
  };
}

/**
 * Varredura peso de entrada × dias de cocho, com o preço de compra de MERCADO
 * (R$/kg interpolado da região) e demais premissas iguais. Mostra onde a conta fecha.
 */
export function varrerPesoEDias(p, regiao = 'MG', pesos = [240, 270, 300, 320, 345, 375], dias = [90, 105, 120, 150]) {
  const linhas = pesos.map(peso => {
    const kg = precoReposicaoKgInterpolado(regiao, peso);
    return {
      peso, precoKg: kg, precoCompra: kg * peso,
      celulas: dias.map(d => {
        const r = calcularLote({ ...p, pesoEntradaKg: peso, precoCompraCab: kg * peso, diasCiclo: d, precoVendaArroba: p.precoVendaArroba });
        return { dias: d, cabecas: r.cabecas, lucroPorCab: r.margemPorCabeca, lucroLiquido: r.lucroLiquido, roiAnual: r.roiAnual, precoEquilibrio: r.precoEquilibrio, pesoSaida: r.animal.pesoSaidaKg };
      })
    };
  });
  let melhor = null;
  for (const l of linhas) for (const c of l.celulas) if (c.cabecas > 0 && (!melhor || c.roiAnual > melhor.roiAnual)) melhor = { peso: l.peso, ...c };
  return { regiao, dias, linhas, melhor, cdi: p.cdiAnual };
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
    const giro = proj.lotes.length ? proj.lotes[proj.lotes.length - 1].capital * pPat.giroMinimoPct : 0;
    const livre = a.caixa + a.estoqueAnimais - pLote.reservaPct * (a.caixa + a.estoqueAnimais) - giro - 12 * pPat.maoDeObraFazendaMensal;
    const custoPorHa = pPat.precoHa * (1 + pPat.custosAquisicaoPct) + custoHaAno; // compra + 1 ano de manutenção
    return { ano: a.ano, patrimonio: a.patrimonioLiquido, areaHa: Math.max(0, livre / custoPorHa) };
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
