// Projeção patrimonial diária (agregada por mês e ano) com reinvestimento.
// Fase 1: ciclos em boitel. Fase 2: recria + boitel quando o lote passa do limiar
// e (por padrão) só se for mais rentável. Fase 3: compra da fazenda somente se a
// liquidez continuar suficiente para manter os animais.
// Convenções: valores nominais; estoque de animais ao CUSTO (sem marcação a
// mercado); IR da atividade descontado no acerto de cada lote (simplificação).
import { ESQUEMA_LOTE } from './premissas.js';
import { exigirValido, valoresPadrao } from './validacao.js';
import { calcularLote } from './lote.js';
import { modeloC, MODELO_C_PADRAO } from './modelos.js';
import { DIAS_ANO } from './unidades.js';

export const ESQUEMA_PATRIMONIO = {
  horizonteAnos: { grupo: 'Projeção', rotulo: 'Horizonte', unidade: 'anos', tipo: 'inteiro', padrao: 10, min: 1, max: 40, origem: 'informado' },
  dataInicio: { grupo: 'Projeção', rotulo: 'Data do primeiro lote', tipo: 'texto', padrao: '2026-11-02', origem: 'estimado' },
  aporteMensal: { grupo: 'Projeção', rotulo: 'Aporte mensal', unidade: 'R$/mês', tipo: 'numero', padrao: 0, min: 0, max: 1e8, origem: 'estimado' },
  retiradaMensal: { grupo: 'Projeção', rotulo: 'Retirada mensal (pró-labore)', unidade: 'R$/mês', tipo: 'numero', padrao: 0, min: 0, max: 1e8, origem: 'estimado' },
  rendimentoCaixaPctCdi: { grupo: 'Projeção', rotulo: 'Rendimento do caixa parado', unidade: '% do CDI', tipo: 'numero', padrao: 1, min: 0, max: 1.5, origem: 'estimado' },
  aliquotaIRCaixa: { grupo: 'Projeção', rotulo: 'IR sobre o rendimento do caixa', unidade: 'fração', tipo: 'numero', padrao: 0.15, min: 0, max: 0.3, origem: 'estimado' },
  tendenciaArrobaAnual: { grupo: 'Projeção', rotulo: 'Tendência nominal da arroba', unidade: 'fração/ano', tipo: 'numero', padrao: 0, min: -0.5, max: 0.5, origem: 'estimado' },
  tendenciaReposicaoAnual: { grupo: 'Projeção', rotulo: 'Tendência nominal da reposição', unidade: 'fração/ano', tipo: 'numero', padrao: 0, min: -0.5, max: 0.5, origem: 'estimado' },
  tendenciaCustosAnual: { grupo: 'Projeção', rotulo: 'Tendência nominal dos custos', unidade: 'fração/ano', tipo: 'numero', padrao: 0, min: -0.5, max: 0.5, origem: 'estimado' },
  habilitarRecria: { grupo: 'Fase 2', rotulo: 'Avaliar recria + boitel', tipo: 'booleano', padrao: true, origem: 'informado' },
  anoInicioFase2: { grupo: 'Fase 2', rotulo: 'Ano de início da fase 2', unidade: 'ano', tipo: 'inteiro', padrao: 3, min: 1, max: 40, origem: 'informado' },
  limiarCabecasRecria: { grupo: 'Fase 2', rotulo: 'Lote mínimo para recria (referência)', unidade: 'cab', tipo: 'inteiro', padrao: 300, min: 0, max: 100000, origem: 'informado' },
  criterioRecria: { grupo: 'Fase 2', rotulo: 'Quando migrar para recria', tipo: 'opcao', opcoes: ['se_mais_rentavel', 'sempre'], padrao: 'se_mais_rentavel', origem: 'estimado' },
  habilitarFazenda: { grupo: 'Fase 3', rotulo: 'Planejar compra de fazenda', tipo: 'booleano', padrao: true, origem: 'informado' },
  anoMinimoFazenda: { grupo: 'Fase 3', rotulo: 'Ano mínimo para comprar', unidade: 'ano', tipo: 'inteiro', padrao: 5, min: 1, max: 40, origem: 'informado' },
  areaHa: { grupo: 'Fase 3', rotulo: 'Área desejada', unidade: 'ha', tipo: 'numero', padrao: 100, min: 1, max: 1e6, origem: 'estimado' },
  precoHa: { grupo: 'Fase 3', rotulo: 'Preço da terra', unidade: 'R$/ha', tipo: 'numero', padrao: 7978, min: 0, max: 1e7, origem: 'pesquisado', fonte: 'incra-vtn', nota: 'VTN médio do INCRA na região de Uberlândia: valor FISCAL, sem benfeitorias, que costuma ficar abaixo do preço de mercado. Troque pela cotação de corretores da região.' },
  custosAquisicaoPct: { grupo: 'Fase 3', rotulo: 'ITBI, escritura, registro, georreferenciamento', unidade: 'fração', tipo: 'numero', padrao: 0.05, min: 0, max: 0.3, origem: 'pendente' },
  formaPagamento: { grupo: 'Fase 3', rotulo: 'Forma de pagamento', tipo: 'opcao', opcoes: ['avista', 'financiado'], padrao: 'avista', origem: 'estimado' },
  entradaPct: { grupo: 'Fase 3', rotulo: 'Entrada (se financiado)', unidade: 'fração', tipo: 'numero', padrao: 0.3, min: 0, max: 1, origem: 'estimado' },
  taxaFinanciamentoAnual: { grupo: 'Fase 3', rotulo: 'Juros do financiamento', unidade: 'fração a.a.', tipo: 'numero', padrao: 0.12, min: 0, max: 1, origem: 'pendente', nota: 'Consulte linhas oficiais (Plano Safra/BNDES) e o banco.' },
  prazoFinanciamentoAnos: { grupo: 'Fase 3', rotulo: 'Prazo do financiamento', unidade: 'anos', tipo: 'inteiro', padrao: 10, min: 1, max: 30, origem: 'estimado' },
  sistemaAmortizacao: { grupo: 'Fase 3', rotulo: 'Amortização', tipo: 'opcao', opcoes: ['price', 'sac'], padrao: 'sac', origem: 'estimado' },
  custoFazendaHaAno: { grupo: 'Fase 3', rotulo: 'Manutenção (pastagem, cercas, benfeitorias)', unidade: 'R$/ha/ano', tipo: 'numero', padrao: 300, min: 0, max: 1e5, origem: 'pendente' },
  maoDeObraFazendaMensal: { grupo: 'Fase 3', rotulo: 'Mão de obra da fazenda', unidade: 'R$/mês', tipo: 'numero', padrao: 3500, min: 0, max: 1e7, origem: 'pendente' },
  itrAliquota: { grupo: 'Fase 3', rotulo: 'ITR sobre o valor da terra', unidade: 'fração/ano', tipo: 'numero', padrao: 0.001, min: 0, max: 0.2, origem: 'pendente', nota: 'Depende da área e do grau de utilização (Lei 9.393/1996).' },
  valorizacaoTerraAnual: { grupo: 'Fase 3', rotulo: 'Valorização da terra', unidade: 'fração/ano', tipo: 'numero', padrao: 0, min: -0.5, max: 0.5, origem: 'estimado', nota: 'Valorização é patrimonial, não caixa.' },
  lotacaoCabHa: { grupo: 'Fase 3', rotulo: 'Lotação para recria na fazenda', unidade: 'cab/ha', tipo: 'numero', padrao: 1.5, min: 0, max: 20, origem: 'estimado' },
  giroMinimoPct: { grupo: 'Fase 3', rotulo: 'Capital de giro a preservar (fração do último lote)', unidade: 'fração', tipo: 'numero', padrao: 0.5, min: 0, max: 3, origem: 'estimado', nota: 'Com 100%, a compra com recursos próprios nunca cabe, porque o lote usa todo o capital livre.' },
  forcarCompraAno: { grupo: 'Fase 3', rotulo: 'Forçar compra no ano (0 = não)', unidade: 'ano', tipo: 'inteiro', padrao: 0, min: 0, max: 40, origem: 'estimado' }
};
export const PATRIMONIO_PADRAO = Object.freeze(valoresPadrao(ESQUEMA_PATRIMONIO));

export function parcelaPrice(principal, taxaMensal, n) {
  if (taxaMensal === 0) return principal / n;
  return principal * taxaMensal / (1 - Math.pow(1 + taxaMensal, -n));
}

function addDias(iso, d) {
  const t = new Date(iso + 'T12:00:00Z');
  if (Number.isNaN(t.getTime())) throw new Error('Data de início inválida: ' + iso);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
}

function fimDoMes(iso) {
  const t = new Date(iso + 'T12:00:00Z');
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10);
}

/** Ajusta as premissas do lote para o dia `d` (tendências nominais). */
function premissasNoDia(pL, pp, d) {
  const anos = d / DIAS_ANO;
  const fa = Math.pow(1 + pp.tendenciaArrobaAnual, anos);
  const fr = Math.pow(1 + pp.tendenciaReposicaoAnual, anos);
  const fc = Math.pow(1 + pp.tendenciaCustosAnual, anos);
  return {
    ...pL, cabecasFixas: 0,
    precoVendaArroba: pL.precoVendaArroba * fa,
    precoCompraCab: pL.precoCompraCab * fr,
    precoArrobaProduzida: pL.precoArrobaProduzida * fc,
    alimentacaoDia: pL.alimentacaoDia * fc, servicoDia: pL.servicoDia * fc,
    sanidadeCab: pL.sanidadeCab * fc, outrasDespesasCab: pL.outrasDespesasCab * fc,
    freteEntradaCab: pL.freteEntradaCab * fc, freteSaidaCab: pL.freteSaidaCab * fc
  };
}

export function projetarPatrimonio(entradaLote, entradaPatrimonio = {}, entradaC = MODELO_C_PADRAO) {
  const pL = exigirValido(ESQUEMA_LOTE, entradaLote);
  const pp = exigirValido(ESQUEMA_PATRIMONIO, entradaPatrimonio);
  const totalDias = pp.horizonteAnos * DIAS_ANO;
  const rDia = Math.pow(1 + pL.cdiAnual * pp.rendimentoCaixaPctCdi, 1 / DIAS_ANO) - 1;
  const iMes = Math.pow(1 + pp.taxaFinanciamentoAnual, 1 / 12) - 1;

  let caixa = pL.capitalInicial;
  let lote = null; // { inicio, fim, capital, lucro, modelo, cabecas }
  let proximoInicio = 0;
  let terra = 0, divida = 0, parcelasRestantes = 0, parcelaFixa = 0, amortSac = 0;
  let fazendaComprada = false, ultimoCapitalLote = 0, anoAvisoAdiado = 0;
  const acum = { lucroLotes: 0, rendimentoCaixa: 0, custosFazenda: 0, jurosPagos: 0, aportes: 0, retiradas: 0, valorizacao: 0, lotes: 0 };
  const meses = [], eventos = [], alertas = [], lotes = [];
  const alertar = (d, tipo, msg) => alertas.push({ dia: d, data: addDias(pp.dataInicio, d), ano: Math.floor(d / DIAS_ANO) + 1, tipo, mensagem: msg });
  const evento = (d, tipo, desc) => eventos.push({ dia: d, data: addDias(pp.dataInicio, d), tipo, descricao: desc });

  const reservaAtual = () => pL.reservaPct * Math.max(pL.capitalInicial, caixa + (lote ? lote.capital : 0));
  const custoFazendaMensal = () => fazendaComprada ? pp.custoFazendaHaAno * pp.areaHa / 12 + pp.itrAliquota * terra / 12 + pp.maoDeObraFazendaMensal : 0;
  const parcelaProxima = () => {
    if (parcelasRestantes <= 0) return 0;
    return pp.sistemaAmortizacao === 'price' ? parcelaFixa : amortSac + divida * iMes;
  };

  function tentarComprarFazenda(d) {
    const ano = Math.floor(d / DIAS_ANO) + 1;
    if (!pp.habilitarFazenda || fazendaComprada || ano < pp.anoMinimoFazenda || lote) return;
    const precoHa = pp.precoHa * Math.pow(1 + pp.valorizacaoTerraAnual, d / DIAS_ANO);
    const valorTerra = precoHa * pp.areaHa;
    const custosAq = valorTerra * pp.custosAquisicaoPct;
    const financiado = pp.formaPagamento === 'financiado' ? valorTerra * (1 - pp.entradaPct) : 0;
    const desembolso = valorTerra - financiado + custosAq;
    const nParc = pp.prazoFinanciamentoAnos * 12;
    const parcela1 = financiado > 0 ? (pp.sistemaAmortizacao === 'price' ? parcelaPrice(financiado, iMes, nParc) : financiado / nParc + financiado * iMes) : 0;
    const custosMes = pp.custoFazendaHaAno * pp.areaHa / 12 + pp.itrAliquota * valorTerra / 12 + pp.maoDeObraFazendaMensal;
    const giroMinimo = ultimoCapitalLote * pp.giroMinimoPct;
    const reserva = pL.reservaPct * caixa;
    const exigido = desembolso + reserva + giroMinimo + 12 * (custosMes + parcela1);
    const forcar = pp.forcarCompraAno > 0 && ano >= pp.forcarCompraAno;
    if (caixa < exigido && !forcar) {
      if (anoAvisoAdiado !== ano) {
        anoAvisoAdiado = ano;
        alertar(d, 'info', `Compra da fazenda adiada no ano ${ano}: faltam ${Math.round(exigido - caixa).toLocaleString('pt-BR')} para pagar ${Math.round(desembolso).toLocaleString('pt-BR')}, manter reserva, giro do próximo lote e 12 meses de custos/parcelas.`);
      }
      return;
    }
    if (caixa < exigido) alertar(d, 'risco', `Compra FORÇADA no ano ${ano}: o caixa após a compra fica ${Math.round(exigido - caixa).toLocaleString('pt-BR')} abaixo do necessário para reserva, giro e 12 meses de obrigações.`);
    caixa -= desembolso;
    terra = valorTerra;
    divida = financiado;
    parcelasRestantes = financiado > 0 ? nParc : 0;
    parcelaFixa = financiado > 0 ? parcelaPrice(financiado, iMes, nParc) : 0;
    amortSac = financiado > 0 ? financiado / nParc : 0;
    fazendaComprada = true;
    evento(d, 'fazenda', `Compra de ${pp.areaHa} ha por ${Math.round(valorTerra).toLocaleString('pt-BR')} (+ custos ${Math.round(custosAq).toLocaleString('pt-BR')}; financiado ${Math.round(financiado).toLocaleString('pt-BR')}).`);
  }

  function iniciarLote(d) {
    const ano = Math.floor(d / DIAS_ANO) + 1;
    const compromissos = fazendaComprada ? 12 * (custoFazendaMensal() + parcelaProxima()) : 0;
    const disponivel = caixa - reservaAtual() - compromissos;
    const p = premissasNoDia(pL, pp, d);
    const base = { ...p, capitalInicial: Math.max(0, disponivel), reservaPct: 0 };
    let escolha = null;
    if (disponivel > 0) {
      const b = calcularLote(base);
      escolha = { modelo: 'B', cabecas: b.cabecas, capital: b.capitalEmpregado, lucro: b.lucroLiquido, dias: b.diasCapital, lucroOperacional: b.lucroOperacional, arrobas: b.arrobasVendidas };
      if (pp.habilitarRecria && ano >= pp.anoInicioFase2 && b.cabecas >= pp.limiarCabecasRecria) {
        let pc = { ...entradaC, precoCompraRecriaCab: entradaC.precoCompraRecriaCab * Math.pow(1 + pp.tendenciaReposicaoAnual, d / DIAS_ANO) };
        if (fazendaComprada) {
          const cobertura = Math.min(1, (pp.areaHa * pp.lotacaoCabHa) / Math.max(1, b.cabecas));
          pc = { ...pc, custoPastoCabMes: pc.custoPastoCabMes * (1 - cobertura) };
        }
        const c = modeloC(base, pc);
        const roiB = b.capitalEmpregado > 0 ? Math.pow(1 + b.roiCiclo, DIAS_ANO / b.giroDias) - 1 : -1;
        if (c.cabecas > 0 && (pp.criterioRecria === 'sempre' || c.roiAnual > roiB)) {
          escolha = { modelo: 'C', cabecas: c.cabecas, capital: c.capitalEmpregado, lucro: c.lucroLiquidoCiclo, dias: c.giroDias - pL.intervaloEntreLotesDias, lucroOperacional: c.lucroOperacionalAnual / c.ciclosAno, arrobas: c.arrobasAno / c.ciclosAno };
        }
      }
    }
    if (!escolha || escolha.cabecas === 0) {
      alertar(d, 'risco', 'Capital livre insuficiente para iniciar um lote (após reserva e compromissos). Nova tentativa em 30 dias.');
      proximoInicio = d + 30;
      return;
    }
    caixa -= escolha.capital;
    lote = { inicio: d, fim: d + escolha.dias, ...escolha };
    ultimoCapitalLote = escolha.capital;
    evento(d, 'lote_inicio', `Lote ${acum.lotes + 1} (${escolha.modelo === 'B' ? 'boitel' : 'recria + boitel'}): ${escolha.cabecas} cabeças, capital ${Math.round(escolha.capital).toLocaleString('pt-BR')}.`);
    const diaAbate = d + escolha.dias - pL.prazoRecebimentoDias;
    evento(diaAbate, 'abate', `Abate previsto do lote ${acum.lotes + 1} (~${Math.round(escolha.arrobas)} @). Vencimento de referência B3: ${fimDoMes(addDias(pp.dataInicio, diaAbate))}.`);
  }

  function liquidarLote(d) {
    caixa += lote.capital + lote.lucro;
    acum.lucroLotes += lote.lucro;
    acum.lotes++;
    lotes.push({ ...lote, numero: acum.lotes, dataInicio: addDias(pp.dataInicio, lote.inicio), dataFim: addDias(pp.dataInicio, d) });
    evento(d, 'recebimento', `Recebimento do lote ${acum.lotes}: resultado líquido ${Math.round(lote.lucro).toLocaleString('pt-BR')}.`);
    if (lote.lucro < 0) alertar(d, 'risco', `Lote ${acum.lotes} fechou com prejuízo de ${Math.round(-lote.lucro).toLocaleString('pt-BR')}.`);
    lote = null;
    proximoInicio = d + pL.intervaloEntreLotesDias;
  }

  let mesAtual = -1, alertaReservaMes = -1;
  for (let d = 0; d <= totalDias; d++) {
    if (lote && d >= lote.fim) liquidarLote(d);
    if (!lote) tentarComprarFazenda(d);
    if (!lote && d >= proximoInicio && d < totalDias) iniciarLote(d);

    const rend = caixa > 0 ? caixa * rDia * (1 - pp.aliquotaIRCaixa) : 0;
    caixa += rend;
    acum.rendimentoCaixa += rend;
    if (terra > 0) {
      const v = terra * (Math.pow(1 + pp.valorizacaoTerraAnual, 1 / DIAS_ANO) - 1);
      terra += v;
      acum.valorizacao += v;
    }

    const mes = Math.floor(d / (DIAS_ANO / 12));
    if (mes !== mesAtual) {
      if (mesAtual >= 0) {
        caixa += pp.aporteMensal - pp.retiradaMensal;
        acum.aportes += pp.aporteMensal;
        acum.retiradas += pp.retiradaMensal;
        const cf = custoFazendaMensal();
        caixa -= cf;
        acum.custosFazenda += cf;
        if (parcelasRestantes > 0) {
          const juros = divida * iMes;
          const parcela = parcelaProxima();
          divida = Math.max(0, divida - (parcela - juros));
          caixa -= parcela;
          acum.jurosPagos += juros;
          parcelasRestantes--;
        }
        const estoque = lote ? lote.capital : 0;
        meses.push({
          mes: mesAtual + 1, ano: Math.floor(mesAtual / 12) + 1, data: addDias(pp.dataInicio, d),
          caixa, reserva: reservaAtual(), estoqueAnimais: estoque, terra, divida,
          ativosTotais: caixa + estoque + terra, patrimonioLiquido: caixa + estoque + terra - divida,
          capitalInvestido: pL.capitalInicial + acum.aportes,
          cabecasAtivas: lote ? lote.cabecas : 0, modeloAtivo: lote ? lote.modelo : null,
          ...Object.fromEntries(Object.entries(acum).map(([k, v]) => [k + 'Acum', v]))
        });
      }
      mesAtual = mes;
    }
    if (caixa < 0 && alertaReservaMes !== mes) {
      alertaReservaMes = mes;
      alertar(d, 'critico', `Caixa negativo (${Math.round(caixa).toLocaleString('pt-BR')}): exigiria aporte ou crédito.`);
    } else if (fazendaComprada && caixa < reservaAtual() && alertaReservaMes !== mes) {
      alertaReservaMes = mes;
      alertar(d, 'risco', 'Caixa abaixo da reserva mínima após a compra da fazenda.');
    }
  }

  const anos = [];
  for (let a = 1; a <= pp.horizonteAnos; a++) {
    const doAno = meses.filter(m => m.ano === a);
    const fim = doAno[doAno.length - 1];
    if (!fim) continue;
    const ant = anos[anos.length - 1];
    const lotesAno = lotes.filter(l => Math.floor(l.fim / DIAS_ANO) + 1 === a);
    anos.push({
      ano: a, ...fim,
      lucroLotesAno: fim.lucroLotesAcum - (ant ? ant.lucroLotesAcum : 0),
      rendimentoCaixaAno: fim.rendimentoCaixaAcum - (ant ? ant.rendimentoCaixaAcum : 0),
      lotesFechados: lotesAno.length,
      cabecasVendidas: lotesAno.reduce((s, l) => s + l.cabecas, 0),
      fase: fazendaComprada && eventos.some(e => e.tipo === 'fazenda' && Math.floor(e.dia / DIAS_ANO) + 1 <= a) ? 'Fase 3 — Fazenda'
        : (pp.habilitarRecria && a >= pp.anoInicioFase2 ? 'Fase 2 — Híbrido' : 'Fase 1 — Capitalização')
    });
  }
  const compra = eventos.find(e => e.tipo === 'fazenda');
  return {
    premissasLote: pL, premissas: pp, meses, anos, lotes, eventos: eventos.sort((a, b) => a.dia - b.dia), alertas,
    resumo: {
      patrimonioFinal: meses.length ? meses[meses.length - 1].patrimonioLiquido : pL.capitalInicial,
      caixaFinal: caixa, terraFinal: terra, dividaFinal: divida,
      lotes: acum.lotes, lucroLotes: acum.lucroLotes, rendimentoCaixa: acum.rendimentoCaixa,
      custosFazenda: acum.custosFazenda, jurosPagos: acum.jurosPagos, valorizacaoTerra: acum.valorizacao,
      anoCompraFazenda: compra ? Math.floor(compra.dia / DIAS_ANO) + 1 : null,
      dataCompraFazenda: compra ? compra.data : null
    }
  };
}
