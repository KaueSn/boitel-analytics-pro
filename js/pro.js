// ============================================
// RECURSOS PRO — Cenários, Sensibilidade e Hedge
// ============================================
// Este módulo reaproveita o núcleo de cálculo do simulador (calcularRanking)
// para não duplicar regra de negócio.
//
// Recursos exclusivos do plano Pro:
//   1) Cenários salvos + comparador lado a lado
//   2) Análise de sensibilidade (impacto de cada variável no lucro)
//   3) Simulador de hedge / trava de preço
// ============================================

const PRO_LINK = 'https://kauesn.github.io/stratum-agro/#planos';
const CENARIOS_LS_KEY = 'boitel_cenarios_v1';

let proTornadoChart = null;
let proComparaChart = null;
let proRendering = false;

// ---------- ACESSO ----------
function isPro() {
  if (typeof currentUserData === 'undefined' || !currentUserData) return false;
  if (currentUserData.role === 'admin') return true;          // admin master sempre tem acesso
  return currentUserData.plan === 'pro';
}

function proBloqueioHTML(titulo, descricao) {
  return (
    '<div class="pro-lock">' +
      '<div class="pro-lock-ico">' + ic('lock') + '</div>' +
      '<h3>' + titulo + ' <span class="pro-tag">PRO</span></h3>' +
      '<p>' + descricao + '</p>' +
      '<a class="pro-cta" href="' + PRO_LINK + '" target="_blank" rel="noopener">' + ic('spark') + ' Ver o plano Pro</a>' +
      '<div class="pro-lock-hint">Já é Pro? Saia e entre novamente para atualizar seus acessos.</div>' +
    '</div>'
  );
}

// ---------- UTILITÁRIOS ----------
// Snapshot dos campos do formulário (para salvar/restaurar cenários)
function lerInputsPro() {
  const ids = ['capital', 'cabecas', 'diasCocho', 'valorDiaria', 'premioArroba',
    'modeloBoitel', 'mortalidade', 'cdi', 'impostoLucro', 'regiaoDiaria', 'objetivo'];
  const snap = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) snap[id] = el.value; });
  return snap;
}

function aplicarInputsPro(snap) {
  Object.keys(snap || {}).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = snap[id];
  });
  if (typeof atualizarMediaDiaria === 'function') atualizarMediaDiaria();
  calcular();
}

// Executa um cálculo alterando temporariamente as cotações dos estados
function comEstados(mutacao, fn) {
  const backup = estadosDB.map(e => ({ arrobaVenda: e.arrobaVenda, boiMagro: e.boiMagro }));
  let saida;
  try { mutacao(estadosDB); saida = fn(); }
  finally {
    estadosDB.forEach((e, i) => { e.arrobaVenda = backup[i].arrobaVenda; e.boiMagro = backup[i].boiMagro; });
  }
  return saida;
}

// Lucro líquido do lote para o melhor estado, variando um fator
function lucroVariando(base, fator) {
  const inputs = Object.assign({}, base);
  let override = null;

  if (fator.campo === 'arroba' || fator.campo === 'boiMagro') {
    override = (db) => db.forEach(e => { e[fator.campo] = e[fator.campo] * (1 + fator.delta); });
  } else {
    inputs[fator.campo] = inputs[fator.campo] * (1 + fator.delta);
  }

  const r = override ? comEstados(override, () => calcularRanking(inputs)) : calcularRanking(inputs);
  return r.melhor.lucroLiquidoLote;
}

function pct(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%'; }

// ============================================
// 1) CENÁRIOS SALVOS + COMPARADOR
// ============================================
function cenariosLocais() {
  try { return JSON.parse(localStorage.getItem(CENARIOS_LS_KEY) || '[]') || []; } catch (e) { return []; }
}
function cenariosSalvarLocal(lista) {
  try { localStorage.setItem(CENARIOS_LS_KEY, JSON.stringify(lista)); } catch (e) {}
}

function getCenarios() {
  if (currentUserData && Array.isArray(currentUserData.cenarios)) return currentUserData.cenarios;
  return cenariosLocais();
}

async function persistirCenarios(lista) {
  if (currentUserData) currentUserData.cenarios = lista;
  cenariosSalvarLocal(lista);
  if (db && currentUserData && currentUserData.id) {
    try { await db.collection('users').doc(currentUserData.id).update({ cenarios: lista }); }
    catch (e) { /* segue com o armazenamento local */ }
  }
}

function resumoDoCenario(inputs) {
  const r = calcularRanking(inputs);
  return {
    estado: r.melhor.nome,
    sigla: r.melhor.sigla,
    lucroLote: r.melhor.lucroLiquidoLote,
    lucroCab: r.melhor.lucroLiquidoCab,
    roic: r.melhor.roic,
    capital: inputs.capital
  };
}

async function salvarCenario() {
  const base = lerInputs();
  if (!base.completo) { showToast('Preencha os parâmetros obrigatórios antes de salvar.', 'warning'); return; }
  const nome = (document.getElementById('proNomeCenario') || {}).value || '';
  const lista = getCenarios().slice();
  const cenario = {
    id: 'c' + Date.now(),
    nome: (nome.trim() || ('Cenário ' + (lista.length + 1))),
    criadoEm: new Date().toISOString(),
    inputs: lerInputsPro(),
    resumo: resumoDoCenario(base)
  };
  lista.unshift(cenario);
  await persistirCenarios(lista.slice(0, 40));
  const campo = document.getElementById('proNomeCenario');
  if (campo) campo.value = '';
  renderCenarios();
  showToast('Cenário salvo!');
}

async function excluirCenario(id) {
  const lista = getCenarios().filter(c => c.id !== id);
  await persistirCenarios(lista);
  renderCenarios();
  showToast('Cenário removido.');
}

function carregarCenario(id) {
  const c = getCenarios().filter(x => x.id === id)[0];
  if (!c) return;
  aplicarInputsPro(c.inputs);
  showToast('Cenário "' + c.nome + '" carregado.');
}

// seleção para comparação
let proSelecionados = [];

function proToggleSelecao(id) {
  const i = proSelecionados.indexOf(id);
  if (i === -1) {
    if (proSelecionados.length >= 4) { showToast('Compare no máximo 4 cenários.', 'warning'); return; }
    proSelecionados.push(id);
  } else proSelecionados.splice(i, 1);
  renderCenarios();
}

function renderCenarios() {
  const wrap = document.getElementById('proCenariosWrap');
  if (!wrap) return;

  if (!isPro()) {
    wrap.innerHTML = proBloqueioHTML('Cenários salvos e comparador',
      'Salve quantas simulações quiser, volte a elas quando precisar e coloque até 4 lado a lado para ver qual decisão entrega o melhor resultado.');
    return;
  }

  const lista = getCenarios();
  const base = lerInputs();
  const completo = base.completo;

  let html = '<div class="pro-top">' +
      '<div class="pro-top-txt">' +
        '<h3>Salve, carregue e compare cenários</h3>' +
        '<p>Guarde a simulação atual com um nome e compare até 4 cenários lado a lado para decidir com segurança.</p>' +
      '</div>' +
      '<span class="pro-badge">' + ic('spark') + ' Pro</span>' +
    '</div>';

  html += '<div class="pro-card">' +
      '<div class="pro-save">' +
        '<input id="proNomeCenario" class="fld" placeholder="Nome do cenário (ex.: Boitel GO 106 dias)">' +
        '<button class="btn-primary pro-save-btn" onclick="salvarCenario()">' + ic('check') + ' Salvar cenário atual</button>' +
      '</div>' +
      (completo ? '' : '<div class="pro-aviso">' + ic('warning') + ' Preencha os parâmetros obrigatórios para poder salvar.</div>') +
    '</div>';

  if (!lista.length) {
    html += '<div class="pro-vazio">Nenhum cenário salvo ainda. Faça uma simulação e clique em <b>Salvar cenário atual</b>.</div>';
    wrap.innerHTML = html;
    return;
  }

  html += '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('book') + ' Cenários salvos <span class="pro-count">' + lista.length + '</span></div>' +
      '<div class="pro-lista">' + lista.map(c => {
        const sel = proSelecionados.indexOf(c.id) !== -1;
        return '<div class="pro-item' + (sel ? ' sel' : '') + '">' +
            '<label class="pro-check" title="Selecionar para comparar">' +
              '<input type="checkbox"' + (sel ? ' checked' : '') + ' onchange="proToggleSelecao(\'' + c.id + '\')">' +
            '</label>' +
            '<div class="pro-item-info">' +
              '<strong>' + escapeHtml(c.nome) + '</strong>' +
              '<span>' + new Date(c.criadoEm).toLocaleString('pt-BR') + ' · ' + (c.resumo ? c.resumo.estado : '—') + '</span>' +
            '</div>' +
            '<div class="pro-item-nums">' +
              '<b>' + formatMoney(c.resumo ? c.resumo.lucroLote : 0) + '</b>' +
              '<span>ROIC ' + formatPercent(c.resumo ? c.resumo.roic : 0) + '</span>' +
            '</div>' +
            '<div class="pro-item-acts">' +
              '<button class="btn-mini" onclick="carregarCenario(\'' + c.id + '\')">Carregar</button>' +
              '<button class="btn-mini danger" onclick="excluirCenario(\'' + c.id + '\')">Excluir</button>' +
            '</div>' +
          '</div>';
      }).join('') + '</div>' +
    '</div>';

  // Comparador
  const selecionados = lista.filter(c => proSelecionados.indexOf(c.id) !== -1);
  if (selecionados.length >= 2) {
    html += '<div class="pro-card">' +
        '<div class="pro-card-head">' + ic('chart') + ' Comparação lado a lado</div>' +
        '<div style="overflow-x:auto"><table class="pro-tabela"><thead><tr>' +
          '<th>Indicador</th>' + selecionados.map(c => '<th>' + escapeHtml(c.nome) + '</th>').join('') +
        '</tr></thead><tbody>' +
        linhaCompara('Estado', selecionados, c => c.resumo ? c.resumo.sigla : '—') +
        linhaCompara('Lucro do lote', selecionados, c => formatMoney(c.resumo ? c.resumo.lucroLote : 0), 'maior') +
        linhaCompara('Lucro por cabeça', selecionados, c => formatMoney(c.resumo ? c.resumo.lucroCab : 0), 'maior') +
        linhaCompara('ROIC do período', selecionados, c => formatPercent(c.resumo ? c.resumo.roic : 0), 'maior') +
        linhaCompara('Capital', selecionados, c => formatMoney(c.resumo ? c.resumo.capital : 0)) +
        linhaCompara('Lote', selecionados, c => (c.inputs.cabecas || 0) + ' cab') +
        linhaCompara('Dias de cocho', selecionados, c => (c.inputs.diasCocho || 0) + ' dias') +
        linhaCompara('Diária', selecionados, c => 'R$ ' + (c.inputs.valorDiaria || '0')) +
        linhaCompara('Mortalidade', selecionados, c => (c.inputs.mortalidade || '0') + '%') +
        '</tbody></table></div>' +
        '<div class="pro-chart"><canvas id="proComparaCanvas"></canvas></div>' +
      '</div>';
  } else if (selecionados.length === 1) {
    html += '<div class="pro-dica">' + ic('bulb') + ' Selecione mais um cenário para ver a comparação lado a lado.</div>';
  }

  wrap.innerHTML = html;

  if (selecionados.length >= 2) setTimeout(() => desenharComparacao(selecionados), 60);
}

function linhaCompara(rotulo, lista, fn, criterio) {
  const valores = lista.map(c => fn(c));
  let melhorIdx = -1;
  if (criterio === 'maior') {
    let melhor = -Infinity;
    lista.forEach((c, i) => {
      const v = c.resumo ? (rotulo === 'ROIC do período' ? c.resumo.roic : c.resumo.lucroLote) : 0;
      if (v > melhor) { melhor = v; melhorIdx = i; }
    });
  }
  return '<tr><td class="pro-rotulo">' + rotulo + '</td>' +
    valores.map((v, i) => '<td class="' + (i === melhorIdx ? 'pro-melhor' : '') + '">' + v + '</td>').join('') +
    '</tr>';
}

function desenharComparacao(lista) {
  const el = document.getElementById('proComparaCanvas');
  if (!el) return;
  if (proComparaChart) { proComparaChart.destroy(); proComparaChart = null; }
  proComparaChart = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: lista.map(c => c.nome.length > 18 ? c.nome.slice(0, 18) + '…' : c.nome),
      datasets: [
        { label: 'Lucro do lote (R$)', data: lista.map(c => c.resumo ? c.resumo.lucroLote : 0),
          backgroundColor: 'rgba(13, 148, 136, 0.8)', borderRadius: 6, yAxisID: 'y' },
        { label: 'ROIC (%)', data: lista.map(c => c.resumo ? c.resumo.roic : 0),
          backgroundColor: 'rgba(99, 102, 241, 0.8)', borderRadius: 6, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        y: { beginAtZero: true, position: 'left', grid: { color: '#2d3a4f' }, ticks: { color: '#94a3b8' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ============================================
// 2) ANÁLISE DE SENSIBILIDADE
// ============================================
const FATORES_SENS = [
  { campo: 'arroba',      nome: 'Preço da arroba',   obs: 'cotação de venda' },
  { campo: 'boiMagro',    nome: 'Custo do boi magro', obs: 'preço de compra' },
  { campo: 'diaria',      nome: 'Diária do boitel',  obs: 'hotelaria por dia' },
  { campo: 'mortalidadePct', nome: 'Mortalidade',    obs: 'perda de animais' },
  { campo: 'impostoPct',  nome: 'Imposto sobre o lucro', obs: 'tributo' }
];

const DELTAS_SENS = [-0.20, -0.10, 0, 0.10, 0.20];

function renderPro() {
  const wrap = document.getElementById('proSensWrap');
  if (!wrap) return;

  if (!isPro()) {
    wrap.innerHTML = proBloqueioHTML('Sensibilidade e hedge',
      'Veja o quanto o lucro muda quando a arroba, o boi magro, a diária, a mortalidade ou o imposto variam — e compare três estratégias de proteção de preço.');
    return;
  }

  const base = lerInputs();
  wrap.innerHTML =
    '<div class="pro-top">' +
      '<div class="pro-top-txt">' +
        '<h3>Quanto seu lucro aguenta</h3>' +
        '<p>Testamos cada variável isoladamente para mostrar onde está o seu maior risco e a partir de que ponto a operação deixa de valer a pena.</p>' +
      '</div>' +
      '<span class="pro-badge">' + ic('spark') + ' Pro</span>' +
    '</div>' +
    (base.completo ? '' : '<div class="pro-vazio">' + ic('warning') + ' Preencha os parâmetros obrigatórios para ver a análise.</div>') +
    '<div id="proSensResultado"></div>' +
    '<div id="proHedgeResultado"></div>';

  if (base.completo) {
    renderSensibilidade(base);
    renderHedge(base);
  }
}

function renderSensibilidade(base) {
  const box = document.getElementById('proSensResultado');
  if (!box) return;

  const linhas = FATORES_SENS.map(f => {
    const valores = DELTAS_SENS.map(d => lucroVariando(base, { campo: f.campo, delta: d }));
    const baseIdx = DELTAS_SENS.indexOf(0);
    const lucroBase = valores[baseIdx];

    // ponto de virada: variação que zera o lucro (interpolação linear até +-100%)
    let virada = null;
    let passo = 0.005;
    for (let d = 0; Math.abs(d) <= 1; d = d + passo) {
      const direcao = lucroBase >= 0 ? d : -d;
      const v = lucroVariando(base, { campo: f.campo, delta: direcao });
      if ((lucroBase >= 0 && v <= 0) || (lucroBase < 0 && v >= 0)) { virada = direcao; break; }
    }

    return {
      nome: f.nome, obs: f.obs, valores, lucroBase,
      min: Math.min.apply(null, valores),
      max: Math.max.apply(null, valores),
      impacto: Math.max.apply(null, valores) - Math.min.apply(null, valores),
      virada
    };
  });

  linhas.sort((a, b) => b.impacto - a.impacto);

  let html = '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('chart') + ' Impacto de cada variável no lucro do lote</div>' +
      '<div style="overflow-x:auto"><table class="pro-tabela pro-tabela-sens"><thead><tr>' +
        '<th>Variável</th>' + DELTAS_SENS.map(d => '<th>' + (d === 0 ? 'Atual' : pct(d)) + '</th>').join('') +
        '<th>Amplitude</th><th>Ponto de virada</th>' +
      '</tr></thead><tbody>' +
      linhas.map(l =>
        '<tr><td class="pro-rotulo">' + l.nome + '<span class="pro-obs">' + l.obs + '</span></td>' +
        l.valores.map((v, i) => '<td class="' + (DELTAS_SENS[i] === 0 ? 'pro-atual' : (v < 0 ? 'pro-neg' : '')) + '">' + formatMoney(v) + '</td>').join('') +
        '<td class="pro-amp">' + formatMoney(l.impacto) + '</td>' +
        '<td>' + (l.virada === null ? '<span class="pro-ok">não zera</span>' : '<span class="pro-alerta">' + pct(l.virada) + '</span>') + '</td>' +
        '</tr>'
      ).join('') +
      '</tbody></table></div>' +
      '<div class="pro-legenda">Amplitude = diferença entre o melhor e o pior resultado na faixa de −20% a +20%. Ponto de virada = variação dessa variável que leva o lucro a zero (ou que tira a operação do prejuízo).</div>' +
      '<div class="pro-chart"><canvas id="proTornadoCanvas"></canvas></div>' +
    '</div>';

  box.innerHTML = html;
  setTimeout(() => desenharTornado(linhas), 60);
}

function desenharTornado(linhas) {
  const el = document.getElementById('proTornadoCanvas');
  if (!el) return;
  if (proTornadoChart) { proTornadoChart.destroy(); proTornadoChart = null; }
  proTornadoChart = new Chart(el.getContext('2d'), {
    type: 'bar',
    data: {
      labels: linhas.map(l => l.nome),
      datasets: [
        { label: 'Cenário desfavorável', data: linhas.map(l => Math.min(l.valores[0], l.valores[4])),
          backgroundColor: 'rgba(239, 68, 68, 0.75)', borderRadius: 4, stack: 'a' },
        { label: 'Cenário favorável', data: linhas.map(l => Math.max(l.valores[0], l.valores[4])),
          backgroundColor: 'rgba(16, 185, 129, 0.75)', borderRadius: 4, stack: 'a' }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatMoney(c.raw) } }
      },
      scales: {
        x: { grid: { color: '#2d3a4f' }, ticks: { color: '#94a3b8', callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ============================================
// 3) SIMULADOR DE HEDGE / TRAVA DE PREÇO
// ============================================
function lucroParaArroba(base, sigla, precoArroba) {
  const r = comEstados(db2 => db2.forEach(e => { e.arrobaVenda = precoArroba; }), () => calcularRanking(base));
  const linha = r.ranking.filter(x => x.sigla === sigla)[0] || r.melhor;
  return linha.lucroLiquidoLote;
}

function renderHedge(base) {
  const box = document.getElementById('proHedgeResultado');
  if (!box) return;

  const r = calcularRanking(base);
  const melhor = r.melhor;
  const arrobaAtual = melhor.arrobaVenda + (base.premio || 0);
  const cabecas = base.cabecas;

  const protegerPct = 50;                 // % do lote protegido
  const precoTrava = arrobaAtual;         // preço travado por arroba
  const custoHedgeCab = 8;                // custo da operação por cabeça
  const baseMercado = 0;                  // prêmio/desconto da praça

  const cenarios = [
    { nome: 'Queda de 10%', fator: 0.90 },
    { nome: 'Preço estável', fator: 1.00 },
    { nome: 'Alta de 10%',  fator: 1.10 }
  ];

  const estrategias = cenarios.map(c => {
    const arrobaMercado = arrobaAtual * c.fator;

    // 1) sem proteção
    const semProtecao = lucroParaArroba(base, melhor.sigla, arrobaMercado);

    // 2) trava a termo de todo o lote
    const trava = lucroParaArroba(base, melhor.sigla, precoTrava);

    // 3) hedge em parte do lote (compra/venda futura com base)
    const protegidas = Math.round(cabecas * protegerPct / 100);
    const descobertas = cabecas - protegidas;
    const lucroProtegidoCab = lucroParaArroba(base, melhor.sigla, precoTrava + baseMercado) / cabecas;
    const lucroDescobertoCab = lucroParaArroba(base, melhor.sigla, arrobaMercado) / cabecas;
    const hedge = (lucroProtegidoCab * protegidas) + (lucroDescobertoCab * descobertas) - (custoHedgeCab * cabecas);

    return { cenario: c.nome, arrobaMercado, semProtecao, trava, hedge };
  });

  const todos = [];
  estrategias.forEach(e => { todos.push(e.semProtecao, e.trava, e.hedge); });
  const pior = Math.min.apply(null, todos);
  const melhorR = Math.max.apply(null, todos);

  let html = '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('shield') + ' Hedge e trava de preço</div>' +
      '<div class="pro-legenda">Comparação para o melhor estado (<b>' + escapeHtml(melhor.nome) + '</b>), com ' + cabecas + ' cabeças. ' +
        'Trava a termo = preço fixado hoje em <b>' + formatMoney(precoTrava) + '/@</b>. ' +
        'Hedge = ' + protegerPct + '% do lote protegido, com custo de ' + formatMoney(custoHedgeCab) + '/cab.</div>' +
      '<div style="overflow-x:auto"><table class="pro-tabela"><thead><tr>' +
        '<th>Cenário de mercado</th><th>Arroba</th><th>Sem proteção</th><th>Trava a termo</th><th>Hedge ' + protegerPct + '%</th>' +
      '</tr></thead><tbody>' +
      estrategias.map(e =>
        '<tr><td class="pro-rotulo">' + e.cenario + '</td>' +
        '<td>' + formatMoney(e.arrobaMercado) + '</td>' +
        '<td class="' + (e.semProtecao < 0 ? 'pro-neg' : '') + '">' + formatMoney(e.semProtecao) + '</td>' +
        '<td>' + formatMoney(e.trava) + '</td>' +
        '<td>' + formatMoney(e.hedge) + '</td></tr>'
      ).join('') +
      '</tbody></table></div>' +
      '<div class="pro-kpis">' +
        '<div class="pro-kpi"><span>Pior resultado possível</span><b class="pro-neg">' + formatMoney(pior) + '</b></div>' +
        '<div class="pro-kpi"><span>Melhor resultado possível</span><b class="pro-pos">' + formatMoney(melhorR) + '</b></div>' +
        '<div class="pro-kpi"><span>Risco (amplitude)</span><b>' + formatMoney(melhorR - pior) + '</b></div>' +
      '</div>' +
      '<div class="pro-legenda">' + ic('bulb') + ' <b>Leitura:</b> a trava a termo transforma o resultado em uma linha reta — você abre mão da alta em troca de não perder na queda. ' +
        'O hedge parcial reduz o risco sem eliminar a chance de ganhar com a alta.</div>' +
    '</div>';

  box.innerHTML = html;
}

// ============================================
// 4) PLANEJAMENTO: dimensionador, modalidades e fluxo de caixa
// ============================================
let proFluxoChart = null;

// Desembolso efetivo em D0 por cabeça (compra + 70% do frete + boitel se à vista)
function d0PorCabeca(melhor, inputs) {
  const fracFrete = (typeof FRETE_D0_FRACAO === 'number') ? FRETE_D0_FRACAO : 0.7;
  let v = melhor.boiMagro + (melhor.freteCab * fracFrete);
  if (inputs.modelo === 'avista') v += (inputs.dias * inputs.diaria);
  return v;
}

function lucroComCabecas(base, cabecas) {
  return calcularRanking(Object.assign({}, base, { cabecas: cabecas })).melhor;
}

function renderPlanejamento() {
  const wrap = document.getElementById('proPlanWrap');
  if (!wrap) return;

  if (!isPro()) {
    wrap.innerHTML = proBloqueioHTML('Planejamento e relatório',
      'Descubra quantas cabeças o seu capital compra, compare à vista x acerto no gancho, veja o fluxo de caixa do ciclo e gere um relatório executivo em PDF.');
    return;
  }

  const base = lerInputs();
  wrap.innerHTML =
    '<div class="pro-top">' +
      '<div class="pro-top-txt">' +
        '<h3>Planeje antes de comprar o gado</h3>' +
        '<p>Ferramentas para decidir o tamanho do lote, a modalidade de pagamento e o momento em que o caixa aperta — e um relatório executivo pronto para PDF.</p>' +
      '</div>' +
      '<span class="pro-badge">' + ic('spark') + ' Pro</span>' +
    '</div>' +
    (base.completo ? '' : '<div class="pro-vazio">' + ic('warning') + ' Preencha os parâmetros obrigatórios para ver o planejamento.</div>') +
    '<div id="proPlanResultado"></div>' +
    '<div class="pro-card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
      '<div>' +
        '<div class="pro-card-head" style="margin:0">' + ic('clipboard') + ' Relatório executivo em PDF</div>' +
        '<div class="pro-legenda" style="margin-top:8px">Gera um documento com indicadores, parâmetros, ranking e o planejamento para você imprimir ou salvar em PDF.</div>' +
      '</div>' +
      '<button class="pro-cta" onclick="exportarRelatorioPro()">' + ic('clipboard') + ' Gerar relatório</button>' +
    '</div>';

  if (!base.completo) return;

  const r = calcularRanking(base);
  const melhor = r.melhor;
  const box = document.getElementById('proPlanResultado');
  box.innerHTML =
    planejDimensionadorHTML(base, melhor) +
    planejModalidadesHTML(base, melhor) +
    planejFluxoHTML(base, melhor, r);

  setTimeout(() => desenharFluxo(base, melhor, r), 60);
}

// ---------- 4.1 Dimensionador de lote ----------
function planejDimensionadorHTML(base, melhor) {
  const porCab = d0PorCabeca(melhor, base);
  const maxCab = porCab > 0 ? Math.floor(base.capital / porCab) : 0;
  const capitalLote = porCab * base.cabecas;
  const sobra = base.capital - capitalLote;

  const alvos = {};
  [0.25, 0.5, 0.75, 1].forEach(f => { const n = Math.round(maxCab * f); if (n > 0) alvos[n] = true; });
  alvos[base.cabecas] = true;
  const tamanhos = Object.keys(alvos).map(Number).sort((a, b) => a - b);

  const linhas = tamanhos.map(n => {
    const rr = lucroComCabecas(base, n);
    const capD0 = porCab * n;
    const cabe = capD0 <= base.capital;
    return '<tr>' +
        '<td class="pro-rotulo">' + n + ' cab' + (n === base.cabecas ? '<span class="pro-obs">lote atual</span>' : '') + '</td>' +
        '<td class="' + (cabe ? '' : 'pro-neg') + '">' + formatMoney(capD0) + '</td>' +
        '<td>' + formatMoney(rr.lucroLiquidoLote) + '</td>' +
        '<td>' + formatPercent(rr.roic) + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('scale') + ' Dimensionador de lote</div>' +
      '<div class="pro-legenda">Desembolso real em D0 (compra do boi magro + 70% do frete' +
        (base.modelo === 'avista' ? ' + boitel à vista' : '') + ') no melhor estado (' + escapeHtml(melhor.nome) + ').</div>' +
      '<div class="pro-kpis">' +
        '<div class="pro-kpi"><span>Desembolso por cabeça (D0)</span><b>' + formatMoney(porCab) + '</b></div>' +
        '<div class="pro-kpi"><span>Seu capital compra</span><b class="pro-pos">' + maxCab + ' cab</b></div>' +
        '<div class="pro-kpi"><span>Capital p/ o lote atual</span><b>' + formatMoney(capitalLote) + '</b></div>' +
        '<div class="pro-kpi"><span>Sobra de caixa em D0</span><b class="' + (sobra >= 0 ? 'pro-pos' : 'pro-neg') + '">' + formatMoney(sobra) + '</b></div>' +
      '</div>' +
      '<div style="overflow-x:auto;margin-top:14px"><table class="pro-tabela"><thead><tr>' +
        '<th>Tamanho do lote</th><th>Capital em D0</th><th>Lucro do lote</th><th>ROIC</th>' +
      '</tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="pro-inline">' + ic('target') + '<span>Quero comprar</span>' +
        '<input id="proLoteAlvoN" class="fld" type="number" min="1" placeholder="nº de cabeças" oninput="proLoteAlvo()">' +
        '<span>cabeças</span></div>' +
      '<div id="proLoteAlvoRes" class="pro-legenda" style="margin-top:10px"></div>' +
    '</div>';
}

function proLoteAlvo() {
  const out = document.getElementById('proLoteAlvoRes');
  if (!out) return;
  const base = lerInputs();
  if (!base.completo) { out.innerHTML = ''; return; }
  const n = parseInt((document.getElementById('proLoteAlvoN') || {}).value) || 0;
  if (n <= 0) { out.innerHTML = ''; return; }
  const rr = lucroComCabecas(base, n);
  const porCab = d0PorCabeca(rr, base);
  const cap = porCab * n;
  const dif = base.capital - cap;
  out.innerHTML = ic('bulb') + ' Para <b>' + n + ' cabeças</b> você precisa de <b>' + formatMoney(cap) + '</b> em D0 ' +
    (dif >= 0
      ? '— seu capital cobre, com folga de ' + formatMoney(dif) + '.'
      : '— faltam ' + formatMoney(Math.abs(dif)) + ' de capital.') +
    ' Lucro projetado no melhor estado (' + escapeHtml(rr.nome) + '): <b>' + formatMoney(rr.lucroLiquidoLote) + '</b>.';
}

// ---------- 4.2 À vista x Acerto no gancho ----------
function planejModalidadesHTML(base, melhor) {
  const cab = base.cabecas;
  const fracFrete = (typeof FRETE_D0_FRACAO === 'number') ? FRETE_D0_FRACAO : 0.7;
  const compra = melhor.boiMagro * cab;
  const freteTotal = melhor.freteCab * cab;
  const boitel = base.dias * base.diaria * cab;
  const d0Gancho = compra + (freteTotal * fracFrete);
  const d0Avista = d0Gancho + boitel;
  const caixaGancho = base.capital - d0Gancho;
  const caixaAvista = base.capital - d0Avista;
  const economia = d0Avista - d0Gancho;

  return '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('money') + ' À vista x Acerto no gancho</div>' +
      '<div class="pro-legenda">O lucro e o ROIC são iguais nas duas modalidades — o que muda é <b>quanto de caixa você precisa ter hoje</b>.</div>' +
      '<div style="overflow-x:auto"><table class="pro-tabela"><thead><tr>' +
        '<th>Indicador</th><th>À vista</th><th>Acerto no gancho</th>' +
      '</tr></thead><tbody>' +
        '<tr><td class="pro-rotulo">Desembolso em D0</td><td>' + formatMoney(d0Avista) + '</td><td>' + formatMoney(d0Gancho) + '</td></tr>' +
        '<tr><td class="pro-rotulo">Caixa livre em D0</td>' +
          '<td class="' + (caixaAvista >= 0 ? 'pro-pos' : 'pro-neg') + '">' + formatMoney(caixaAvista) + '</td>' +
          '<td class="' + (caixaGancho >= 0 ? 'pro-pos' : 'pro-neg') + '">' + formatMoney(caixaGancho) + '</td></tr>' +
        '<tr><td class="pro-rotulo">Custo total do boitel</td>' +
          '<td>' + formatMoney(boitel) + '<span class="pro-obs">pago ao longo do ciclo</span></td>' +
          '<td>' + formatMoney(boitel) + '<span class="pro-obs">retido no abate</span></td></tr>' +
        '<tr><td class="pro-rotulo">Lucro líquido final</td><td>' + formatMoney(melhor.lucroLiquidoLote) + '</td><td>' + formatMoney(melhor.lucroLiquidoLote) + '</td></tr>' +
        '<tr><td class="pro-rotulo">ROIC do período</td><td>' + formatPercent(melhor.roic) + '</td><td>' + formatPercent(melhor.roic) + '</td></tr>' +
      '</tbody></table></div>' +
      '<div class="pro-kpis">' +
        '<div class="pro-kpi"><span>Capital mínimo p/ operar (gancho)</span><b class="pro-pos">' + formatMoney(d0Gancho) + '</b></div>' +
        '<div class="pro-kpi"><span>Economia de caixa com o gancho</span><b class="pro-pos">' + formatMoney(economia) + '</b></div>' +
      '</div>' +
      '<div class="pro-legenda">' + ic('bulb') + ' No <b>gancho</b> o boitel é retido no abate: você precisa de menos caixa em D0. No <b>à vista</b> você paga a hotelaria durante o confinamento (pode render desconto).</div>' +
    '</div>';
}

// ---------- 4.3 Fluxo de caixa do ciclo ----------
function fluxoDados(base, melhor, r) {
  const nMeses = Math.max(1, Math.ceil(base.dias / 30));
  const fracFrete = (typeof FRETE_D0_FRACAO === 'number') ? FRETE_D0_FRACAO : 0.7;
  const cab = base.cabecas;
  const cabEfet = r.cabecasEfetivas;
  const avista = base.modelo === 'avista';

  const compraAnimal = melhor.boiMagro * cab;
  const freteTotal = melhor.freteCab * cab;
  const boitelTotal = base.dias * base.diaria * cab;
  const receita = melhor.receitaBrutaCab * cabEfet;
  const funrural = melhor.funruralCab * cabEfet;
  const imposto = melhor.impostoLote;
  const boitelMes = avista ? boitelTotal / nMeses : 0;

  const meses = [];
  let acumulado = base.capital;
  let minCaixa = { valor: base.capital, mes: 0 };

  for (let m = 0; m < nMeses; m++) {
    let saidas = 0, entradas = 0;
    if (m === 0) saidas += compraAnimal + (freteTotal * fracFrete);
    if (avista) saidas += boitelMes;
    if (m === nMeses - 1) {
      saidas += (freteTotal * (1 - fracFrete)) + funrural + imposto;
      if (!avista) saidas += boitelTotal;
      entradas += receita;
    }
    acumulado += entradas - saidas;
    if (acumulado < minCaixa.valor) minCaixa = { valor: acumulado, mes: m };
    meses.push({ m: m, saidas: saidas, entradas: entradas, saldo: entradas - saidas, acumulado: acumulado });
  }
  return { meses: meses, minCaixa: minCaixa, acumulado: acumulado, avista: avista };
}

function planejFluxoHTML(base, melhor, r) {
  const f = fluxoDados(base, melhor, r);
  const linhas = f.meses.map(x =>
    '<tr>' +
      '<td class="pro-rotulo">Mês ' + (x.m + 1) + '</td>' +
      '<td>' + (x.entradas ? '<span class="pro-pos">' + formatMoney(x.entradas) + '</span>' : '—') + '</td>' +
      '<td>' + (x.saidas ? '<span class="pro-neg">- ' + formatMoney(x.saidas) + '</span>' : '—') + '</td>' +
      '<td class="' + (x.saldo >= 0 ? 'pro-pos' : 'pro-neg') + '">' + formatMoney(x.saldo) + '</td>' +
      '<td class="pro-amp">' + formatMoney(x.acumulado) + '</td>' +
    '</tr>'
  ).join('');

  return '<div class="pro-card">' +
      '<div class="pro-card-head">' + ic('chart') + ' Fluxo de caixa do ciclo</div>' +
      '<div class="pro-legenda">Movimentação mês a mês partindo do seu capital (' + formatMoney(base.capital) + '), no modelo <b>' +
        (f.avista ? 'à vista' : 'acerto no gancho') + '</b>. Compra dos bois e 70% do frete caem no D0; o restante e o boitel (no gancho) entram no abate.</div>' +
      '<div style="overflow-x:auto"><table class="pro-tabela"><thead><tr>' +
        '<th>Período</th><th>Entradas</th><th>Saídas</th><th>Saldo do mês</th><th>Caixa acumulado</th>' +
      '</tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="pro-kpis">' +
        '<div class="pro-kpi"><span>Caixa mínimo no ciclo</span><b class="' + (f.minCaixa.valor >= 0 ? 'pro-pos' : 'pro-neg') + '">' + formatMoney(f.minCaixa.valor) + '</b></div>' +
        '<div class="pro-kpi"><span>Mês mais apertado</span><b>Mês ' + (f.minCaixa.mes + 1) + '</b></div>' +
        '<div class="pro-kpi"><span>Caixa final (com o abate)</span><b class="pro-pos">' + formatMoney(f.acumulado) + '</b></div>' +
      '</div>' +
      '<div class="pro-chart"><canvas id="proFluxoCanvas"></canvas></div>' +
      '<div class="pro-legenda">' + ic('bulb') + ' Diferença para o DRE: aqui mostramos apenas a movimentação efetiva de caixa; o DRE também desconta a perda por mortalidade como custo de oportunidade.</div>' +
    '</div>';
}

function desenharFluxo(base, melhor, r) {
  const el = document.getElementById('proFluxoCanvas');
  if (!el) return;
  if (proFluxoChart) { proFluxoChart.destroy(); proFluxoChart = null; }
  const f = fluxoDados(base, melhor, r);
  proFluxoChart = new Chart(el.getContext('2d'), {
    type: 'line',
    data: {
      labels: f.meses.map(x => 'Mês ' + (x.m + 1)),
      datasets: [{
        label: 'Caixa acumulado (R$)',
        data: f.meses.map(x => Math.round(x.acumulado)),
        borderColor: 'rgba(20, 184, 166, 1)',
        backgroundColor: 'rgba(20, 184, 166, 0.15)',
        fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#14b8a6'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } },
        tooltip: { callbacks: { label: c => formatMoney(c.raw) } }
      },
      scales: {
        y: { grid: { color: '#2d3a4f' }, ticks: { color: '#94a3b8', callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

// ---------- 4.4 Relatório executivo em PDF ----------
function exportarRelatorioPro() {
  if (!isPro()) { showToast('Relatório exclusivo do plano Pro.', 'warning'); return; }
  const r = montarResumoSimulacao();
  if (!r) { showToast('Preencha os parâmetros obrigatórios antes de gerar o relatório.', 'warning'); return; }

  const base = lerInputs();
  const melhor = r.melhor;
  const fracFrete = (typeof FRETE_D0_FRACAO === 'number') ? FRETE_D0_FRACAO : 0.7;
  const porCab = d0PorCabeca(melhor, base);
  const maxCab = porCab > 0 ? Math.floor(base.capital / porCab) : 0;
  const d0Gancho = (melhor.boiMagro * base.cabecas) + (melhor.freteCab * base.cabecas * fracFrete);
  const d0Avista = d0Gancho + (base.dias * base.diaria * base.cabecas);

  const linhasRanking = r.ranking.map((x, i) =>
    '<tr><td>' + (i + 1) + 'º</td><td>' + escapeHtml(x.nome) + '</td><td>' + formatMoney(x.precoVenda) + '</td>' +
    '<td>' + formatMoney(x.lucroLiquidoCab) + '</td><td>' + formatMoney(x.lucroLiquidoLote) + '</td><td>' + formatPercent(x.roic) + '</td></tr>'
  ).join('');

  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<title>Stratum Agro - Relatorio de Simulacao</title><style>' +
    '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:32px}' +
    'h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 8px;border-bottom:2px solid #0d9488;padding-bottom:4px;color:#0f766e}' +
    '.sub{color:#64748b;font-size:12px;margin-bottom:18px}' +
    '.kpis{display:flex;gap:12px;flex-wrap:wrap}.kpi{flex:1 1 160px;border:1px solid #e2e8f0;border-radius:10px;padding:12px}' +
    '.kpi .l{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}.kpi .v{font-size:18px;font-weight:700;margin-top:4px;color:#0f766e}' +
    'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}th,td{border:1px solid #e2e8f0;padding:7px 8px;text-align:right}' +
    'th{background:#f1f5f9;color:#334155}td:first-child,th:first-child{text-align:left}' +
    '.foot{margin-top:26px;color:#94a3b8;font-size:10px;border-top:1px solid #e2e8f0;padding-top:10px}' +
    '.bt{background:#0d9488;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:13px;cursor:pointer;margin-bottom:16px}' +
    '@media print{.bt{display:none}}' +
    '</style></head><body>' +
    '<button class="bt" onclick="window.print()">Salvar em PDF / Imprimir</button>' +
    '<h1>Stratum Agro - Relatorio de Simulacao</h1>' +
    '<div class="sub">Confinamento (Boitel) - ' + escapeHtml(r.usuario) + ' - ' + r.hoje + '</div>' +
    '<div class="kpis">' +
      '<div class="kpi"><div class="l">Melhor estado</div><div class="v">' + escapeHtml(melhor.nome) + '</div></div>' +
      '<div class="kpi"><div class="l">Lucro liquido do lote</div><div class="v">' + formatMoney(melhor.lucroLiquidoLote) + '</div></div>' +
      '<div class="kpi"><div class="l">Lucro por cabeca</div><div class="v">' + formatMoney(melhor.lucroLiquidoCab) + '</div></div>' +
      '<div class="kpi"><div class="l">ROIC do periodo</div><div class="v">' + formatPercent(melhor.roic) + '</div></div>' +
    '</div>' +
    '<h2>Parametros</h2>' +
    '<table><tbody>' +
      '<tr><td>Capital</td><td>' + formatMoney(base.capital) + '</td><td>Lote</td><td>' + base.cabecas + ' cabecas</td></tr>' +
      '<tr><td>Dias de cocho</td><td>' + base.dias + ' dias</td><td>Diaria</td><td>' + formatMoney(base.diaria) + '/cab/dia</td></tr>' +
      '<tr><td>Modalidade</td><td>' + (base.modelo === 'avista' ? 'A vista' : 'Acerto no gancho') + '</td><td>Bonificacao</td><td>' + formatMoney(base.premio) + '/@</td></tr>' +
      '<tr><td>Mortalidade</td><td>' + base.mortalidadePct + '%</td><td>Imposto</td><td>' + base.impostoPct + '%</td></tr>' +
    '</tbody></table>' +
    '<h2>Ranking dos estados</h2>' +
    '<table><thead><tr><th>Pos.</th><th>Estado</th><th>@ Venda</th><th>Lucro/cab</th><th>Lucro do lote</th><th>ROIC</th></tr></thead><tbody>' + linhasRanking + '</tbody></table>' +
    '<h2>Planejamento</h2>' +
    '<table><tbody>' +
      '<tr><td>Desembolso em D0 por cabeca</td><td>' + formatMoney(porCab) + '</td></tr>' +
      '<tr><td>Cabecas que o capital compra (D0)</td><td>' + maxCab + ' cab</td></tr>' +
      '<tr><td>Capital minimo no acerto no gancho</td><td>' + formatMoney(d0Gancho) + '</td></tr>' +
      '<tr><td>Capital minimo a vista</td><td>' + formatMoney(d0Avista) + '</td></tr>' +
      '<tr><td>Economia de caixa com o gancho</td><td>' + formatMoney(d0Avista - d0Gancho) + '</td></tr>' +
    '</tbody></table>' +
    '<div class="foot">Stratum Agro - Dados de referencia ICBC/CEPEA 2025 - Documento gerado automaticamente; nao constitui recomendacao de investimento.</div>' +
    '</body></html>';

  const w = window.open('', '_blank');
  if (!w) { showToast('Permita pop-ups para gerar o relatório.', 'warning'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) { /* usuario pode imprimir manualmente */ } }, 400);
  showToast('Relatório gerado! Use "Salvar como PDF".');
}

// ============================================
// HOOK — mantém os painéis Pro em sincronia
// ============================================
function aoRecalcularPro() {
  if (proRendering) return;
  const cen = document.getElementById('cenariosTab');
  const sen = document.getElementById('sensibilidadeTab');
  const plan = document.getElementById('planejamentoTab');
  const cenAtiva = cen && cen.classList.contains('active');
  const senAtiva = sen && sen.classList.contains('active');
  const planAtiva = plan && plan.classList.contains('active');
  if (!cenAtiva && !senAtiva && !planAtiva) return;
  proRendering = true;
  try {
    if (cenAtiva) renderCenarios();
    if (senAtiva) renderPro();
    if (planAtiva) renderPlanejamento();
  } finally { proRendering = false; }
}
