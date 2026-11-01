// Abas de análise: Painel executivo, Lote & zootecnia, Modelos A/B/C, Cenários & sensibilidade.
import { esc, moeda, num, pct, data, sinal, kpi, aviso, tabela, hojeISO } from './formato.js';
import { grafico, paleta } from './graficos.js';
import { renderFormulario } from './formulario.js';
import { ESQUEMA_MODELO_A, ESQUEMA_MODELO_C } from '../engine/modelos.js';
import { serieCDI } from '../engine/rendaFixa.js';
import { tornado, gradeSensibilidade, monteCarlo, resolverEquilibrio, VARIAVEIS, DISTRIBUICOES_PADRAO, CENARIOS_PADRAO } from '../engine/cenarios.js';
import { compararModelos } from '../engine/modelos.js';
import { aplicarChoques } from '../engine/cenarios.js';
import { DATA_COLETA } from '../engine/mercado.js';

const HOJE = hojeISO();

// ---------------- Painel executivo ----------------
export const painel = {
  resultados(el, { res, estado }) {
    const l = res.lote, pr = res.projecao, H = pr.premissas.horizonteAnos;
    const cdi = serieCDI({ capital: l.premissas.capitalInicial, cdiAnual: l.premissas.cdiAnual, anos: H });
    const cdiAnualLiq = Math.pow(1 + l.cdiLiquidoPeriodo, 365 / l.diasCapital) - 1;
    const modelo = res.modelos.linhas.find(m => m.modelo === estado.filtros.modelo);
    const alertas = [
      ...res.conferencia.itens.filter(i => i.alerta).map(i => ({ t: `${i.rotulo}: premissa ${moeda(i.usado, 2)} está ${pct(i.desvio)} em relação à referência ${moeda(i.referencia, 2)} (${i.fonte}, ${data(i.data)}).`, tipo: 'risco' })),
      ...l.avisos.map(t => ({ t, tipo: 'risco' })),
      ...pr.alertas.filter(a => a.tipo !== 'info').slice(0, 4).map(a => ({ t: `${data(a.data)} — ${a.mensagem}`, tipo: a.tipo }))
    ];
    const lotes = pr.lotes.slice(0, 6);
    el.innerHTML = `
      <div class="faixa-aviso">Estudo educacional. Valores calculados com premissas editáveis e dados de mercado de ${esc(data(DATA_COLETA))}; não são cotações em tempo real nem garantia de resultado.</div>
      <div class="kpis">
        ${kpi('Capital inicial', moeda(l.premissas.capitalInicial))}
        ${kpi('Reserva de segurança', moeda(l.reserva), { sub: pct(l.premissas.reservaPct, 0) + ' do capital' })}
        ${kpi('Capital produtivo', moeda(l.capitalProdutivo))}
        ${kpi('Caixa mínimo no ciclo', moeda(l.caixaMinimo), { classe: l.caixaMinimo < l.reserva - 1 ? 'kpi-neg' : '' })}
        ${kpi('Animais por lote', num(l.cabecas), { sub: `${num(l.ciclosAno, 2)} ciclos/ano · giro ${num(l.giroDias)} dias` })}
        ${kpi('Lucro líquido por lote', `<span class="${sinal(l.lucroLiquido)}">${moeda(l.lucroLiquido)}</span>`, { sub: `econômico (após CDI): ${moeda(l.lucroEconomico)}` })}
        ${kpi('Retorno anualizado', `<span class="${sinal(l.roiAnual - cdiAnualLiq)}">${pct(l.roiAnual)}</span>`, { sub: `CDI líquido: ${pct(cdiAnualLiq)}` })}
        ${kpi('Preço de equilíbrio', moeda(l.precoEquilibrio, 2) + '/@', { sub: `usado: ${moeda(l.porCabeca.precoEfetivo, 2)} · margem ${pct(l.margemSegurancaPreco)}`, classe: l.margemSegurancaPreco < 0 ? 'kpi-neg' : '' })}
        ${kpi(`Patrimônio em ${H} anos`, moeda(pr.resumo.patrimonioFinal), { sub: `CDI líquido: ${moeda(cdi[H].montanteLiquido)}`, classe: pr.resumo.patrimonioFinal < cdi[H].montanteLiquido ? 'kpi-neg' : 'kpi-pos' })}
        ${kpi('Fazenda própria', pr.resumo.anoCompraFazenda ? `ano ${pr.resumo.anoCompraFazenda}` : 'não no horizonte', { sub: pr.resumo.dataCompraFazenda ? data(pr.resumo.dataCompraFazenda) : 'veja a aba Caminhos' })}
      </div>
      ${modelo ? `<div class="cartao destaque"><h3>Modelo em foco: ${esc(modelo.nome)}</h3><p>${modelo.viavel ? `Lucro líquido anual ${moeda(modelo.lucroLiquidoAnual)} · retorno ${pct(modelo.roiAnual)} sobre ${moeda(modelo.capitalEmpregado)} · equilíbrio ${moeda(modelo.precoEquilibrio, 2)}/@` : esc(modelo.notas[0])}</p></div>` : ''}
      <div class="duas-colunas">
        <section class="cartao"><h3>Alertas de risco e liquidez</h3>${alertas.length ? alertas.slice(0, 10).map(a => aviso(a.t, a.tipo)).join('') : aviso('Nenhum alerta nas premissas atuais.', 'ok')}</section>
        <section class="cartao"><h3>Progresso dos ciclos planejados</h3>
          ${lotes.length ? lotes.map(lt => {
            const ini = lt.dataInicio, fim = lt.dataFim;
            const prog = HOJE <= ini ? 0 : HOJE >= fim ? 1 : (Date.parse(HOJE) - Date.parse(ini)) / (Date.parse(fim) - Date.parse(ini));
            return `<div class="ciclo"><div class="ciclo-rot">Lote ${lt.numero} · ${lt.modelo === 'B' ? 'boitel' : 'recria+boitel'} · ${num(lt.cabecas)} cab · <span class="${sinal(lt.lucro)}">${moeda(lt.lucro)}</span></div>
              <div class="barra" role="progressbar" aria-valuenow="${Math.round(prog * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso do lote ${lt.numero}"><span style="width:${(prog * 100).toFixed(0)}%"></span></div>
              <div class="ciclo-datas">${data(ini)} → ${data(fim)}</div></div>`;
          }).join('') : '<p>Nenhum lote pôde ser iniciado com as premissas atuais.</p>'}
        </section>
      </div>
      <div class="duas-colunas">
        <section class="cartao"><h3>Patrimônio líquido × CDI</h3><div class="graf"><canvas id="g-painel-pl"></canvas></div></section>
        <section class="cartao"><h3>Composição do custo do lote</h3><div class="graf"><canvas id="g-painel-custos"></canvas></div></section>
      </div>`;
    const p = paleta();
    grafico('g-painel-pl', {
      type: 'line', moedaEixo: 'y',
      data: { labels: ['Início', ...pr.anos.map(a => 'Ano ' + a.ano)], datasets: [
        { label: 'Pecuária (patrimônio líquido)', data: [l.premissas.capitalInicial, ...pr.anos.map(a => a.patrimonioLiquido)], borderColor: p.serie[0], backgroundColor: p.serie[0], tension: 0.2 },
        { label: 'CDI líquido', data: cdi.map(c => c.montanteLiquido), borderColor: p.serie[2], backgroundColor: p.serie[2], borderDash: [6, 4], tension: 0.2 }
      ] }
    });
    const t = l.totais;
    const itens = [['Compra', t.aquisicao + t.comissaoCompra], ['Boitel/alimentação', t.boitelArroba + t.alimentacao + t.servico + t.taxaEntradaBoitel], ['Fretes', t.freteEntrada + t.freteSaida], ['Sanidade e outras', t.sanidade + t.outras], ['Funrural e comissões', l.deducoes], ['IR', l.ir]].filter(i => i[1] > 0);
    grafico('g-painel-custos', {
      type: 'doughnut',
      data: { labels: itens.map(i => i[0]), datasets: [{ data: itens.map(i => i[1]), backgroundColor: [...p.serie, p.aviso] }] },
      options: { scales: {}, plugins: { legend: { position: 'right' } } }
    });
  }
};

// ---------------- Lote & zootecnia ----------------
export const lote = {
  resultados(el, { res }) {
    const l = res.lote, a = l.animal, alt = res.loteAlternativo;
    const zoo = [
      ['Peso de entrada', num(l.premissas.pesoEntradaKg, 1) + ' kg vivo'],
      ['Ganho no ciclo', `${num(a.ganhoKg, 1)} kg (${num(l.premissas.gmdKg, 2)} kg/dia × ${l.premissas.diasCiclo} dias)`],
      ['Peso de saída (abate)', num(a.pesoAbateKg, 1) + ' kg vivo'],
      ['Carcaça na entrada (base de cobrança)', `${num(a.carcacaEntradaKg, 1)} kg = ${num(a.arrobasEntrada, 3)} @ (RC ${pct(l.premissas.rcEntrada)})`],
      ['Carcaça na saída', `${num(a.carcacaSaidaKg, 1)} kg = ${num(a.arrobasSaida, 3)} @ (RC ${pct(l.premissas.rcSaida)})`],
      ['Arrobas produzidas por animal', num(a.arrobasProduzidas, 3) + ' @'],
      ['Rendimento do ganho (carcaça/ganho vivo)', pct(a.rendimentoGanho)],
      ['Animais por lote / vivos esperados / mortes', `${num(l.cabecas)} / ${num(l.cabecasVivas, 1)} / ${num(l.mortes, 1)}`],
      ['Arrobas vendidas no lote', num(l.arrobasVendidas, 1) + ' @'],
      ['Arrobas produzidas no lote', num(l.arrobasProduzidas, 1) + ' @'],
      ['Duração: engorda + recebimento + intervalo', `${l.premissas.diasCiclo} + ${l.premissas.prazoRecebimentoDias} + ${l.premissas.intervaloEntreLotesDias} = ${l.giroDias} dias`]
    ];
    const fin = [
      ['Custo total por animal comprado', moeda(l.custoOperacional / Math.max(1, l.cabecas), 2)],
      ['Custo da arroba produzida (engorda ÷ @ produzidas)', moeda(l.custoArrobaProduzida, 2)],
      ['Custo total por arroba vendida', moeda(l.custoTotalArrobaVendida, 2)],
      ['Margem por animal / por arroba', `${moeda(l.margemPorCabeca, 2)} / ${moeda(l.margemPorArroba, 2)}`],
      ['Capital para iniciar (compra, frete, sanidade)', moeda(l.capitalInicio)],
      ['Capital para concluir (pico de caixa)', moeda(l.capitalEmpregado)],
      ['Retorno do ciclo / anualizado', `${pct(l.roiCiclo, 2)} / ${pct(l.roiAnual, 2)}`],
      ['CDI líquido no mesmo período', pct(l.cdiLiquidoPeriodo, 2)],
      ['Prazo de recuperação do capital', Number.isFinite(l.paybackMeses) ? `${num(l.paybackMeses, 1)} meses (${num(l.paybackCiclos, 1)} ciclos, sem reinvestir)` : 'não recupera (sem lucro)'],
      ['Preço de equilíbrio da arroba', moeda(l.precoEquilibrio, 2)],
      ['Preço máximo de compra (equilíbrio)', moeda(l.compraEquilibrio, 2) + '/cab']
    ];
    const comp = (r) => [moeda(r.custoOperacional), moeda(r.lucroLiquido), pct(r.roiCiclo, 2), moeda(r.custoArrobaProduzida, 2)];
    el.innerHTML = `
      <div class="duas-colunas">
        <section class="cartao"><h3>Evolução física (convenção: 1 @ = 15 kg de carcaça)</h3>${tabela(['Item', 'Valor'], zoo)}${a.avisos.map(t => aviso(t)).join('')}</section>
        <section class="cartao"><h3>Indicadores financeiros</h3>${tabela(['Item', 'Valor'], fin)}</section>
      </div>
      <section class="cartao"><h3>DRE do lote (${num(l.cabecas)} cabeças)</h3>
        ${tabela(['Linha', 'Lote', 'Por animal comprado'], l.dre.map(d => [`<span class="dre-${d.tipo}">${esc(d.rotulo)}</span>`, `<span class="${sinal(d.valor)}">${moeda(d.valor, 2)}</span>`, moeda(d.valor / Math.max(1, l.cabecas), 2)]))}
        <p class="nota">Funrural e comissão de venda são deduções da receita; a mortalidade já está na receita (animal morto não é vendido) e não aparece como linha extra. O custo de oportunidade não sai do caixa.</p>
      </section>
      <section class="cartao"><h3>Arroba produzida × diária (mesmo lote)</h3>
        ${tabela(['Forma de cobrança', 'Custo operacional', 'Lucro líquido', 'Retorno do ciclo', 'Custo da @ produzida'], [
          [l.premissas.modoCobranca === 'diaria' ? 'Diária (atual)' : 'Arroba produzida (atual)', ...comp(l)],
          [alt.premissas.modoCobranca === 'diaria' ? 'Diária (alternativa)' : 'Arroba produzida (alternativa)', ...comp(alt)]
        ])}
        <p class="nota">Na arroba produzida o preço inclui a dieta; na diária, dieta (R$ ${num(l.premissas.alimentacaoDia, 2)}) + serviço (R$ ${num(l.premissas.servicoDia, 2)}) por dia. Valores do boitel estão pendentes de cotação.</p>
      </section>`;
  }
};

// ---------------- Modelos A/B/C ----------------
export const modelos = {
  forms(el, ctx) {
    el.innerHTML = `<details class="cartao"><summary>Parâmetros do Modelo A — confinamento próprio</summary><div id="f-modA"></div></details>
      <details class="cartao"><summary>Parâmetros do Modelo C — recria + boitel</summary><div id="f-modC"></div></details>`;
    renderFormulario(el.querySelector('#f-modA'), 'mA', ESQUEMA_MODELO_A, ctx.estado.modeloA, (c, v) => ctx.atualizar('modeloA', c, v));
    renderFormulario(el.querySelector('#f-modC'), 'mC', ESQUEMA_MODELO_C, ctx.estado.modeloC, (c, v) => ctx.atualizar('modeloC', c, v));
  },
  resultados(el, { res, estado }) {
    const m = res.modelos;
    const porCenario = Object.entries(estado.choques).map(([id, c]) => {
      const r = compararModelos(aplicarChoques(res.val.lote, c.choques), res.val.modeloA, res.val.modeloC);
      return [esc(c.nome), r.melhorPor.lucroLiquidoAnual || '—', r.melhorPor.roiAnual || '—', r.melhorPor.precoEquilibrio || '—', r.melhorPor.custoArrobaProduzida || '—'];
    });
    el.innerHTML = `
      <section class="cartao"><h3>Mesmo capital (${moeda(res.lote.premissas.capitalInicial)}), horizonte de 1 ano, cenário ${esc(estado.filtros.cenario)}</h3>
      ${tabela(['Indicador', ...m.linhas.map(x => `${x.modelo} — ${esc(x.nome)}`)], [
        ['Cabeças por ciclo', ...m.linhas.map(x => num(x.cabecas))],
        ['Ciclos por ano / giro', ...m.linhas.map(x => `${num(x.ciclosAno, 2)} / ${num(x.giroDias)} d`)],
        ['Arrobas vendidas por ano', ...m.linhas.map(x => num(x.arrobasAno, 0))],
        ['Capital empregado', ...m.linhas.map(x => moeda(x.capitalEmpregado))],
        ['Imobilizado (instalações)', ...m.linhas.map(x => moeda(x.imobilizado))],
        ['Custo da @ produzida', ...m.linhas.map(x => moeda(x.custoArrobaProduzida, 2))],
        ['Custos fixos + depreciação/ano', ...m.linhas.map(x => moeda(x.custosFixosAnuais + x.depreciacaoAnual))],
        ['Margem operacional por cabeça', ...m.linhas.map(x => moeda(x.margemPorCabeca, 2))],
        ['Lucro líquido anual', ...m.linhas.map(x => `<span class="${sinal(x.lucroLiquidoAnual)}">${moeda(x.lucroLiquidoAnual)}</span>`)],
        ['Retorno anual sobre o capital', ...m.linhas.map(x => pct(x.roiAnual))],
        ['Custo de oportunidade (CDI) anual', ...m.linhas.map(x => moeda(x.custoOportunidadeAnual))],
        ['Preço de equilíbrio', ...m.linhas.map(x => moeda(x.precoEquilibrio, 2) + '/@')],
        ['Observações', ...m.linhas.map(x => x.notas.map(esc).join('<br>'))]
      ])}</section>
      <div class="duas-colunas">
        <section class="cartao"><h3>Lucro anual e retorno</h3><div class="graf"><canvas id="g-modelos"></canvas></div></section>
        <section class="cartao"><h3>Melhor modelo por critério em cada cenário</h3>${tabela(['Cenário', 'Lucro anual', 'Retorno', 'Menor equilíbrio', 'Menor custo/@'], porCenario)}
        <p class="nota">Não há vencedor universal: o resultado muda com escala, preços e contrato. "—" = nenhum modelo viável.</p></section>
      </div>`;
    const p = paleta();
    grafico('g-modelos', {
      type: 'bar', moedaEixo: 'y',
      data: { labels: m.linhas.map(x => x.modelo + ' — ' + x.nome), datasets: [{ label: 'Lucro líquido anual', data: m.linhas.map(x => x.lucroLiquidoAnual), backgroundColor: m.linhas.map(x => x.lucroLiquidoAnual >= 0 ? p.pos : p.neg) }] },
      options: { plugins: { legend: { display: false } } }
    });
  }
};

// ---------------- Cenários & sensibilidade ----------------
export const cenarios = {
  forms(el, ctx) {
    const vars = Object.keys(CENARIOS_PADRAO.pessimista.choques);
    const linha = v => {
      const tipo = VARIAVEIS[v].tipo;
      const fmt = x => (tipo === 'mult' || ['rcSaida', 'mortalidade', 'cdi'].includes(v) ? +(x * 100).toFixed(4) : x);
      return `<tr><td>${esc(VARIAVEIS[v].rotulo)}${tipo === 'mult' ? ' (%)' : ['rcSaida', 'mortalidade', 'cdi'].includes(v) ? ' (p.p.)' : ''}</td>
        ${['pessimista', 'otimista'].map(c => `<td><input type="number" step="any" aria-label="${esc(VARIAVEIS[v].rotulo)} — ${c}" data-cen="${c}" data-var="${v}" value="${fmt(ctx.estado.choques[c].choques[v] ?? 0)}"></td>`).join('')}</tr>`;
    };
    el.innerHTML = `<details class="cartao"><summary>Editar choques dos cenários (o base usa as premissas sem choque)</summary>
      <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Variável</th><th>Pessimista</th><th>Otimista</th></tr></thead><tbody>${vars.map(linha).join('')}</tbody></table></div></details>`;
    el.oninput = ev => {
      const t = ev.target;
      if (!t.dataset.cen) return;
      const v = t.dataset.var, n = Number(t.value);
      if (!Number.isFinite(n)) return;
      const escala = VARIAVEIS[v].tipo === 'mult' || ['rcSaida', 'mortalidade', 'cdi'].includes(v) ? 100 : 1;
      ctx.estado.choques[t.dataset.cen].choques[v] = n / escala;
      ctx.recalcular();
    };
  },
  resultados(el, ctx) {
    const { res } = ctx;
    const c = res.cenarios, base = res.val.lote;
    const t = tornado(base);
    const g = gradeSensibilidade(base);
    const n = t.cabecas;
    const eqGmd = resolverEquilibrio({ ...base, cabecasFixas: n }, 'gmdKg', 0, 3);
    const eqRc = resolverEquilibrio({ ...base, cabecasFixas: n }, 'rcSaida', 0.3, 0.7);
    const eqBoitel = base.modoCobranca === 'arroba_produzida' ? resolverEquilibrio({ ...base, cabecasFixas: n }, 'precoArrobaProduzida', 0, 2000) : null;
    const linhaC = (rot, f) => [rot, ...['pessimista', 'base', 'otimista'].map(k => f(c[k].resultado))];
    el.innerHTML = `
      <section class="cartao"><h3>Pessimista × base × otimista (mesmo número de cabeças: ${num(c.base.resultado.cabecas)})</h3>
      ${tabela(['Indicador', 'Pessimista', 'Base', 'Otimista'], [
        linhaC('Receita líquida', r => moeda(r.receitaLiquida)),
        linhaC('Custo operacional', r => moeda(r.custoOperacional)),
        linhaC('Lucro líquido', r => `<span class="${sinal(r.lucroLiquido)}">${moeda(r.lucroLiquido)}</span>`),
        linhaC('Lucro econômico (após CDI)', r => `<span class="${sinal(r.lucroEconomico)}">${moeda(r.lucroEconomico)}</span>`),
        linhaC('Retorno do ciclo', r => pct(r.roiCiclo, 2)),
        linhaC('Preço de equilíbrio', r => moeda(r.precoEquilibrio, 2)),
        linhaC('Margem de segurança no preço', r => pct(r.margemSegurancaPreco)),
        linhaC('Capital exigido', r => moeda(r.capitalEmpregado)),
        linhaC('Caixa mínimo', r => moeda(r.caixaMinimo))
      ])}</section>
      <div class="duas-colunas">
        <section class="cartao"><h3>Tornado: impacto no lucro líquido do lote</h3><div class="graf alto"><canvas id="g-tornado"></canvas></div></section>
        <section class="cartao"><h3>Pontos de equilíbrio (lucro operacional = 0)</h3>${tabela(['Variável', 'Valor de equilíbrio', 'Premissa atual'], [
          ['Preço da arroba', moeda(c.base.resultado.precoEquilibrio, 2), moeda(base.precoVendaArroba, 2)],
          ['Preço do boi magro', moeda(c.base.resultado.compraEquilibrio, 2), moeda(base.precoCompraCab, 2)],
          ['GMD', eqGmd === null ? 'fora de 0–3 kg/d' : num(eqGmd, 3) + ' kg/d', num(base.gmdKg, 2) + ' kg/d'],
          ['Rendimento de carcaça', eqRc === null ? 'fora de 30–70%' : pct(eqRc, 2), pct(base.rcSaida, 1)],
          ['Preço da @ produzida no boitel', eqBoitel === null ? '—' : moeda(eqBoitel, 2), moeda(base.precoArrobaProduzida, 2)]
        ])}</section>
      </div>
      <section class="cartao"><h3>Lucro líquido: preço de venda × preço de compra</h3>
        ${tabela(['Compra \\ Venda', ...g[0].valores.map(v => `${moeda(v.venda, 2)}/@`)], g.map(lin => [moeda(lin.compra), ...lin.valores.map(v => `<span class="cel ${sinal(v.lucroLiquido)}">${moeda(v.lucroLiquido)}</span>`)]), { classe: 'mapa' })}
      </section>
      <section class="cartao"><h3>Simulação de Monte Carlo</h3>
        <p class="nota">Distribuições triangulares (mín, moda, máx) dos choques: ${Object.entries(DISTRIBUICOES_PADRAO).map(([k, [a, m, b]]) => `${esc(VARIAVEIS[k].rotulo)} [${num(a * 100, 1)}; ${num(m * 100, 1)}; ${num(b * 100, 1)}]`).join(' · ')}. São hipóteses, não estimativas a partir de dados históricos.</p>
        <button class="btn" id="btn-mc">Rodar 2.000 iterações</button><div id="mc-res"></div>
      </section>`;
    const p = paleta();
    grafico('g-tornado', {
      type: 'bar', moedaEixo: 'x',
      data: { labels: t.linhas.map(x => `${x.rotulo} (±${x.tipo === 'mult' ? pct(x.delta, 0) : num(x.delta, x.delta < 1 ? 2 : 0)})`), datasets: [
        { label: 'Variável para baixo', data: t.linhas.map(x => x.baixo), backgroundColor: p.serie[2] },
        { label: 'Variável para cima', data: t.linhas.map(x => x.alto), backgroundColor: p.serie[0] }
      ] },
      options: { indexAxis: 'y', scales: { x: { stacked: false }, y: { stacked: true } } }
    });
    el.querySelector('#btn-mc').onclick = () => {
      const mc = monteCarlo(base);
      const out = el.querySelector('#mc-res');
      out.innerHTML = `${tabela(['Estatística', 'Valor'], [
        ['Probabilidade de prejuízo (pelas hipóteses)', pct(mc.probPrejuizo)],
        ['Probabilidade de render menos que o CDI líquido', pct(mc.probAbaixoCdi)],
        ['Lucro médio', moeda(mc.media)], ['P5 / P50 / P95', `${moeda(mc.p5)} / ${moeda(mc.p50)} / ${moeda(mc.p95)}`],
        ['Índice tipo Sharpe por ciclo', mc.sharpeCiclo === null ? '—' : num(mc.sharpeCiclo, 2)]
      ])}${aviso(mc.aviso, 'info')}<div class="graf"><canvas id="g-mc"></canvas></div>`;
      grafico('g-mc', {
        type: 'bar',
        data: { labels: mc.histograma.map(h => moeda((h.de + h.ate) / 2)), datasets: [{ label: 'Frequência', data: mc.histograma.map(h => h.n), backgroundColor: mc.histograma.map(h => ((h.de + h.ate) / 2 < 0 ? p.neg : p.pos)) }] },
        options: { plugins: { legend: { display: false } } }
      });
    };
  }
};
