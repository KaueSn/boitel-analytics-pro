// Abas de planejamento: Patrimônio, Hedge B3, CDI, Caminhos & objetivo, Calendário.
import { esc, moeda, num, pct, data, sinal, kpi, aviso, tabela } from './formato.js';
import { grafico, paleta } from './graficos.js';
import { renderFormulario } from './formulario.js';
import { ESQUEMA_PATRIMONIO } from '../engine/patrimonio.js';
import { ESQUEMA_HEDGE } from '../engine/hedge.js';
import { aplicacaoCDI, serieCDI } from '../engine/rendaFixa.js';
import { compararCaminhos, aporteNecessario, areaViavelPorAno, checklistOportunidades, varrerPesoEDias } from '../engine/estrategias.js';

// ---------------- Patrimônio ----------------
export const patrimonio = {
  forms(el, ctx) {
    el.innerHTML = '<details class="cartao" open><summary>Parâmetros da projeção e das fases</summary><div id="f-pat"></div></details>';
    renderFormulario(el.querySelector('#f-pat'), 'pat', ESQUEMA_PATRIMONIO, ctx.estado.patrimonio, (c, v) => ctx.atualizar('patrimonio', c, v));
  },
  resultados(el, { res }) {
    const pr = res.projecao, r = pr.resumo;
    const cdi = serieCDI({ capital: res.val.lote.capitalInicial, cdiAnual: res.val.lote.cdiAnual, anos: pr.premissas.horizonteAnos });
    const riscos = pr.alertas.filter(a => a.tipo !== 'info');
    el.innerHTML = `
      <div class="kpis">
        ${kpi('Patrimônio líquido final', moeda(r.patrimonioFinal))}
        ${kpi('Caixa final', moeda(r.caixaFinal))}
        ${kpi('Terra (imobilizado)', moeda(r.terraFinal), { sub: r.dataCompraFazenda ? 'compra em ' + data(r.dataCompraFazenda) : 'sem compra' })}
        ${kpi('Dívida final', moeda(r.dividaFinal))}
        ${kpi('Lotes realizados', num(r.lotes), { sub: 'lucro realizado ' + moeda(r.lucroLotes) })}
        ${kpi('Rendimento do caixa', moeda(r.rendimentoCaixa))}
        ${kpi('Valorização da terra (não caixa)', moeda(r.valorizacaoTerra))}
        ${kpi('Custos da fazenda + juros', moeda(r.custosFazenda + r.jurosPagos))}
      </div>
      ${pr.premissas.precoHa < 15000 ? aviso(`Preço da terra usado: ${moeda(pr.premissas.precoHa)}/ha. Se ele veio do VTN do INCRA, é um valor fiscal, normalmente abaixo do preço de mercado: a compra pode parecer mais próxima do que é. Informe a cotação real da sua região.`) : ''}
      <section class="cartao"><h3>Composição do patrimônio</h3><div class="graf alto"><canvas id="g-pat"></canvas></div></section>
      <section class="cartao"><h3>Evolução anual</h3>${tabela(['Ano', 'Fase', 'Caixa', 'Reserva', 'Animais (custo)', 'Terra', 'Dívida', 'Patrimônio líquido', 'Lucro dos lotes', 'Rend. caixa', 'CDI líquido'],
        pr.anos.map((a, i) => [a.ano, esc(a.fase), moeda(a.caixa), moeda(a.reserva), moeda(a.estoqueAnimais), moeda(a.terra), moeda(a.divida), `<b>${moeda(a.patrimonioLiquido)}</b>`, `<span class="${sinal(a.lucroLotesAno)}">${moeda(a.lucroLotesAno)}</span>`, moeda(a.rendimentoCaixaAno), moeda(cdi[i + 1]?.montanteLiquido)]))}
      <p class="nota">Patrimônio total = caixa + animais (ao custo) + terra. Patrimônio líquido = total − dívidas. Valorização da terra é patrimonial, não gera caixa. Lucro contábil (lotes) ≠ fluxo de caixa (inclui compra de terra, parcelas e custos fixos).</p></section>
      <section class="cartao"><h3>Alertas da projeção</h3>${riscos.length ? riscos.slice(0, 20).map(a => aviso(`${data(a.data)} — ${a.mensagem}`, a.tipo)).join('') : aviso('Nenhum alerta de risco ou liquidez.', 'ok')}
        ${pr.alertas.filter(a => a.tipo === 'info').slice(0, 5).map(a => aviso(`${data(a.data)} — ${a.mensagem}`, 'info')).join('')}</section>`;
    const p = paleta();
    grafico('g-pat', {
      type: 'bar', moedaEixo: 'y',
      data: { labels: pr.anos.map(a => 'Ano ' + a.ano), datasets: [
        { label: 'Caixa', data: pr.anos.map(a => a.caixa), backgroundColor: p.serie[0], stack: 'a' },
        { label: 'Animais (custo)', data: pr.anos.map(a => a.estoqueAnimais), backgroundColor: p.serie[1], stack: 'a' },
        { label: 'Terra', data: pr.anos.map(a => a.terra), backgroundColor: p.serie[3], stack: 'a' },
        { label: 'Dívida', data: pr.anos.map(a => -a.divida), backgroundColor: p.neg, stack: 'a' },
        { type: 'line', label: 'Patrimônio líquido', data: pr.anos.map(a => a.patrimonioLiquido), borderColor: p.texto, backgroundColor: p.texto },
        { type: 'line', label: 'CDI líquido', data: cdi.slice(1).map(c => c.montanteLiquido), borderColor: p.serie[2], borderDash: [6, 4], backgroundColor: p.serie[2] }
      ] },
      options: { scales: { x: { stacked: true }, y: { stacked: true } } }
    });
  }
};

// ---------------- Hedge ----------------
export const hedge = {
  forms(el, ctx) {
    el.innerHTML = `<div class="faixa-aviso">Simulador educacional. Não envia ordens nem se conecta a corretoras. Informe preço futuro, strike e prêmio reais (consulte a B3 ou a corretora): a plataforma não tem cotações embutidas.</div>
      <details class="cartao" open><summary>Parâmetros da proteção</summary><div id="f-hedge"></div></details>`;
    renderFormulario(el.querySelector('#f-hedge'), 'hd', ESQUEMA_HEDGE, ctx.estado.hedge, (c, v) => ctx.atualizar('hedge', c, v));
  },
  resultados(el, { res }) {
    const h = res.hedge, ph = h.premissas;
    const exp = ph.arrobasExpostas;
    el.innerHTML = `
      <div class="kpis">
        ${kpi('Exposição', num(exp, 0) + ' @', { sub: moeda(exp * (ph.precoFuturoAtual || res.lote.porCabeca.precoEfetivo)) })}
        ${kpi('Contratos (330 @)', num(h.contratos), { sub: `exato ${num(h.contratosExatos, 2)} · cobertura ${pct(h.coberturaEfetiva)}` })}
        ${kpi('Custo da put', moeda(h.custoTotalPut), { sub: 'prêmio + custos operacionais' })}
        ${kpi('Piso com put (por @ coberta)', ph.strike > 0 ? moeda(h.pisoPutPorArroba, 2) : '—')}
        ${kpi('Trava com futuro (por @ coberta)', ph.precoFuturoAtual > 0 ? moeda(h.travaFuturoPorArroba, 2) : '—')}
        ${kpi('Margem estimada do futuro', moeda(h.margemFuturo), { sub: 'caixa travado + ajustes diários' })}
        ${kpi('Prêmio teórico Black-76', h.premioTeorico === null ? '—' : moeda(h.premioTeorico, 2) + '/@', { sub: 'educacional; não é cotação' })}
      </div>
      ${h.avisos.map(a => aviso(a)).join('')}
      <section class="cartao"><h3>Receita efetiva por arroba × preço de liquidação</h3><div class="graf alto"><canvas id="g-hedge"></canvas></div></section>
      <section class="cartao"><h3>Cenários de liquidação</h3>${ph.precoFuturoAtual <= 0 ? '<p class="vazio">Informe o preço futuro do vencimento para ver os cenários.</p>' : tabela(['Variação', 'Preço liquidação', 'Físico regional', 'Sem hedge (R$/@)', 'Com put (R$/@)', 'Com futuro (R$/@)', 'Resultado put', 'Resultado futuro'],
        h.grade.map(g => [pct(g.variacao, 0), moeda(g.precoLiquidacao, 2), moeda(g.precoFisico, 2), moeda(g.precoEfetivoSemHedge, 2), moeda(g.precoEfetivoPut, 2), moeda(g.precoEfetivoFuturo, 2), `<span class="${sinal(g.resultadoPut)}">${moeda(g.resultadoPut)}</span>`, `<span class="${sinal(g.resultadoFuturo)}">${moeda(g.resultadoFuturo)}</span>`]))}</section>
      <section class="cartao"><h3>Riscos que continuam após o hedge</h3><ul class="lista">${h.riscosResiduais.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <p class="nota">Hedge teórico = contratos × 330 @ vs. produção. Proteção efetiva depende da base no dia, da quantidade realmente produzida e do vencimento escolhido.</p></section>`;
    if (ph.precoFuturoAtual > 0) {
      const p = paleta();
      grafico('g-hedge', {
        type: 'line', moedaEixo: 'y',
        data: { labels: h.grade.map(g => moeda(g.precoLiquidacao)), datasets: [
          { label: 'Sem hedge', data: h.grade.map(g => g.precoEfetivoSemHedge), borderColor: p.serie[2] },
          { label: 'Com put', data: h.grade.map(g => g.precoEfetivoPut), borderColor: p.serie[0] },
          { label: 'Com futuro', data: h.grade.map(g => g.precoEfetivoFuturo), borderColor: p.serie[1] }
        ] }
      });
    } else {
      el.querySelector('#g-hedge').parentElement.innerHTML = '<p class="vazio">Informe o preço futuro do vencimento para ver o gráfico.</p>';
    }
  }
};

// ---------------- CDI ----------------
export const cdi = {
  resultados(el, { res }) {
    const l = res.lote, pr = res.projecao, H = pr.premissas.horizonteAnos;
    const ap = aplicacaoCDI({ capital: l.capitalEmpregado, cdiAnual: l.premissas.cdiAnual, dias: l.diasCapital });
    const serie = serieCDI({ capital: l.premissas.capitalInicial, cdiAnual: l.premissas.cdiAnual, anos: H });
    const fim = serie[H];
    el.innerHTML = `
      <section class="cartao"><h3>Um ciclo: mesmo capital, mesmo prazo (${num(l.diasCapital)} dias)</h3>
      ${tabela(['', 'Pecuária (lote)', `CDI ${pct(l.premissas.cdiAnual, 2)} a.a.`], [
        ['Capital comprometido', moeda(l.capitalEmpregado), moeda(ap.capital)],
        ['Resultado bruto', moeda(l.lucroOperacional) + ' (antes do IR)', moeda(ap.bruto)],
        ['Tributos', moeda(l.ir) + ' (IR da atividade, regime ' + esc(l.premissas.regimeIR) + ') + Funrural já deduzido', `${moeda(ap.ir)} (IR ${pct(ap.aliquota, 1)})`],
        ['Resultado líquido', `<b class="${sinal(l.lucroLiquido)}">${moeda(l.lucroLiquido)}</b>`, `<b>${moeda(ap.liquido)}</b>`],
        ['Retorno líquido no período', pct(l.roiCiclo, 2), pct(ap.retornoLiquido, 2)],
        ['Liquidez', 'Baixa: capital preso até o recebimento', 'Alta (conforme o título)'],
        ['Risco', 'Preço, desempenho, mortalidade, contraparte', 'Crédito do emissor/FGC']
      ])}
      <p class="nota">Comparação líquido × líquido. O IR da renda fixa segue a tabela regressiva pelo prazo; IOF (resgates < 30 dias) não é considerado.</p></section>
      <section class="cartao"><h3>Horizonte de ${H} anos com reinvestimento</h3>
      ${tabela(['', 'Pecuária (projeção)', 'CDI líquido'], [
        ['Patrimônio final', moeda(pr.resumo.patrimonioFinal), moeda(fim.montanteLiquido)],
        ['Ganho sobre o capital inicial', moeda(pr.resumo.patrimonioFinal - l.premissas.capitalInicial), moeda(fim.montanteLiquido - l.premissas.capitalInicial)],
        ['Retorno anual equivalente', pct(Math.pow(pr.resumo.patrimonioFinal / l.premissas.capitalInicial, 1 / H) - 1, 2), pct(Math.pow(fim.montanteLiquido / l.premissas.capitalInicial, 1 / H) - 1, 2)],
        ['Diferença', `<b class="${sinal(pr.resumo.patrimonioFinal - fim.montanteLiquido)}">${moeda(pr.resumo.patrimonioFinal - fim.montanteLiquido)}</b>`, '']
      ])}
      ${pr.premissas.aporteMensal > 0 || pr.premissas.retiradaMensal > 0 ? aviso('Esta comparação considera só o capital inicial no CDI, mas a projeção da pecuária tem aportes ou retiradas mensais. Zere esses campos na aba Patrimônio para comparar em igualdade.') : ''}
      <p class="nota">O patrimônio da pecuária inclui terra avaliada pelo preço informado (ilíquida) e animais ao custo. O CDI é mantido constante: é uma referência, não projeção de juros. Retorno ajustado ao risco: use o índice tipo Sharpe na aba Cenários (Monte Carlo), que depende das distribuições escolhidas.</p></section>`;
  }
};

// ---------------- Caminhos & objetivo ----------------
export const caminhos = {
  resultados(el, ctx) {
    const { res, estado } = ctx;
    const c = res.precos;
    const v = varrerPesoEDias(res.val.lote);
    const cdiAno = res.val.lote.cdiAnual;
    el.innerHTML = `
      <section class="cartao"><h3>1. O que os seus preços dizem</h3>
      ${tabela(['Indicador', 'Valor', 'O que significa'], [
        ['Relação de troca', `${num(c.relacaoTroca, 2)} @`, 'Arrobas de boi gordo necessárias para comprar 1 animal de reposição.'],
        ['Preço por kg do animal', moeda(c.precoKgReposicao, 2) + '/kg vivo', 'Preço de compra ÷ peso de entrada.'],
        ['Preço da @ na entrada', moeda(c.precoArrobaEntrada, 2) + '/@', `Preço do animal ÷ arrobas de carcaça de entrada (RC ${pct(res.val.lote.rcEntrada, 0)}).`],
        ['Ágio da reposição', `<span class="${c.agio > 0.1 ? 'neg' : c.agio > 0 ? 'aviso' : 'pos'}">${pct(c.agio)}</span>`, 'Quanto a @ do animal magro custa acima da @ do boi gordo. Em terminação curta, é o principal fator da margem.']
      ])}
      ${c.alertas.map(t => aviso(t)).join('')}
      <p class="nota">Calculado com os preços que você informou nas premissas. Para conferir com o mercado da sua região, use os links em Premissas → "Onde consultar os preços da sua região".</p></section>

      <section class="cartao"><h3>2. Onde a conta fecha: peso de entrada × dias de cocho</h3>
      ${tabela(['Peso / preço de compra', ...v.dias.map(d => d + ' dias')], v.linhas.map(lin => [`${lin.peso} kg · ${moeda(lin.precoCompra)}`, ...lin.celulas.map(cel => `<span class="cel ${cel.roiAnual > cdiAno ? 'pos' : cel.roiAnual > 0 ? 'aviso' : 'neg'}" title="Lucro/cab ${moeda(cel.lucroPorCab, 2)} · equilíbrio ${moeda(cel.precoEquilibrio, 2)}/@">${pct(cel.roiAnual)}</span>`)]), { classe: 'mapa' })}
      <p class="nota">Retorno anual mantendo o seu preço por kg (${moeda(v.precoKg, 2)}/kg) para todos os pesos e o preço de venda de ${moeda(res.val.lote.precoVendaArroba, 2)}/@. Na prática, animais mais leves costumam custar mais por kg: confira com cotações reais. Verde = acima do CDI bruto (${pct(cdiAno)}); amarelo = positivo, abaixo do CDI; vermelho = prejuízo. Melhor combinação: ${v.melhor ? `${v.melhor.peso} kg por ${v.melhor.dias} dias (${pct(v.melhor.roiAnual)} a.a.)` : 'nenhuma'}. Mais dias exigem confirmar com o boitel GMD, RC e preço por @ nesses prazos.</p></section>

      <section class="cartao"><h3>3. Caminhos para o objetivo (fazenda própria)</h3>
        <p class="nota">Área ${num(res.val.patrimonio.areaHa)} ha a ${moeda(res.val.patrimonio.precoHa)}/ha = ${moeda(res.val.patrimonio.areaHa * res.val.patrimonio.precoHa)} + custos de aquisição. Ajuste na aba Patrimônio. Os caminhos rodam o cenário base e o pessimista.</p>
        <button class="btn" id="btn-caminhos">Calcular caminhos</button><div id="caminhos-res"></div></section>

      <section class="cartao"><h3>4. Quanto falta para chegar lá</h3>
        <div class="linha-form"><label for="ano-alvo">Comprar a fazenda até o ano</label><input id="ano-alvo" type="number" min="1" max="40" value="${Math.max(res.val.patrimonio.anoMinimoFazenda, 5)}">
        <button class="btn" id="btn-aporte">Calcular aporte mensal necessário</button></div><div id="aporte-res"></div>
        <h4>Área que o patrimônio comportaria em cada ano (mantendo reserva, giro e 1 ano de custos)</h4><div id="area-res"></div></section>

      <section class="cartao"><h3>5. Oportunidades e verificações antes de decidir</h3>
        ${tabela(['Tema', 'O que avaliar', 'Status'], checklistOportunidades(res.val.lote).map(o => [esc(o.tema), esc(o.texto), `<span class="selo selo-${o.status === 'alerta' ? 'pendente' : o.status === 'calculado' || o.status === 'aplicável' ? 'pesquisado' : 'estimado'}">${esc(o.status)}</span>`]))}
      </section>`;

    const area = areaViavelPorAno(res.val.lote, res.val.patrimonio, res.val.modeloC);
    el.querySelector('#area-res').innerHTML = tabela(['Ano', 'Patrimônio líquido', 'Área viável'], area.map(a => [a.ano, moeda(a.patrimonio), num(a.areaHa, 1) + ' ha']));

    el.querySelector('#btn-caminhos').onclick = () => {
      const out = el.querySelector('#caminhos-res');
      out.innerHTML = '<p>Calculando…</p>';
      setTimeout(() => {
        const r = compararCaminhos(res.val.lote, res.val.patrimonio, res.val.modeloC);
        out.innerHTML = tabela(['Caminho', 'Patrimônio final (base)', 'Pessimista', 'vs CDI', 'Fazenda', 'Caixa mínimo', 'Leitura'],
          r.caminhos.map(k => [`<b>${esc(k.nome)}</b><br><small>${esc(k.descricao)}</small>`, moeda(k.patrimonioFinal), moeda(k.patrimonioPessimista), `<span class="${sinal(k.vsCdi)}">${moeda(k.vsCdi)}</span>`, k.anoCompraFazenda ? 'ano ' + k.anoCompraFazenda : '—', `<span class="${sinal(k.minCaixa)}">${moeda(k.minCaixa)}</span>`, esc(k.veredito)]));
      }, 10);
    };
    el.querySelector('#btn-aporte').onclick = () => {
      const ano = Number(el.querySelector('#ano-alvo').value);
      const out = el.querySelector('#aporte-res');
      if (!Number.isInteger(ano) || ano < 1 || ano > 40) { out.innerHTML = aviso('Informe um ano entre 1 e 40.'); return; }
      out.innerHTML = '<p>Calculando…</p>';
      setTimeout(() => {
        const a = aporteNecessario(res.val.lote, res.val.patrimonio, res.val.modeloC, ano);
        out.innerHTML = a === null ? aviso(`Nem com aporte de R$ 200 mil/mês a compra cabe até o ano ${ano} com as regras de liquidez atuais.`)
          : a === 0 ? aviso(`A compra já é viável até o ano ${ano} sem aportes.`, 'ok')
            : aviso(`Aporte mensal necessário: ${moeda(a)} (aprox.), mantendo reserva, giro e 12 meses de custos/parcelas.`, 'info');
      }, 10);
    };
  }
};

// ---------------- Calendário ----------------
export const calendario = {
  resultados(el, { res }) {
    const ev = res.projecao.eventos.slice(0, 80);
    const nomes = { lote_inicio: 'Início de lote', abate: 'Abate / vencimento B3', recebimento: 'Recebimento', fazenda: 'Compra da fazenda' };
    const parcelas = res.projecao.resumo.dividaFinal > 0 || res.projecao.premissas.formaPagamento === 'financiado';
    el.innerHTML = `<section class="cartao"><h3>Calendário de ciclos, vencimentos e obrigações</h3>
      ${ev.length ? tabela(['Data', 'Evento', 'Descrição'], ev.map(e => [data(e.data), esc(nomes[e.tipo] || e.tipo), esc(e.descricao)])) : '<p class="vazio">Sem eventos.</p>'}
      <p class="nota">Opções e futuros de BGI vencem no fim do mês (último dia útil para opções; última sessão para o futuro). A data mostrada é o último dia do mês do abate: confirme o calendário de vencimentos na B3. ${parcelas ? 'Parcelas do financiamento: mensais a partir do mês seguinte à compra.' : ''} Obrigações recorrentes: GTA na movimentação, vacinação conforme o calendário da sua UF, DITR anual (ITR) após a compra da terra.</p></section>
      <section class="cartao"><h3>Todos os alertas</h3>${res.projecao.alertas.length ? res.projecao.alertas.map(a => aviso(`${data(a.data)} — ${a.mensagem}`, a.tipo)).join('') : aviso('Nenhum alerta.', 'ok')}</section>`;
  }
};
