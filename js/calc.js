// ============================================
// FUNÇÕES DE FORMATAÇÃO
// ============================================
function formatMoney(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(val) {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '%';
}

// ============================================
// CONTROLE DE ABAS
// ============================================
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
  
  // Atualizar gráficos quando a aba de gráficos for aberta
  if (tabId === 'graficosTab') {
    setTimeout(atualizarGraficos, 100);
  }
}

// ============================================
// COLETA E VALIDAÇÃO DE INPUTS
// ============================================
// Regras de faixa (min/max) para cada parâmetro do formulário
const REGRAS_INPUT = {
  capital:      { min: 0,    max: 1e9,   msg: 'Capital deve ser um valor positivo.' },
  cabecas:      { min: 1,    max: 10000, msg: 'O lote deve ter ao menos 1 cabeça.' },
  diasCocho:    { min: 1,    max: 730,   msg: 'O período deve ficar entre 1 e 730 dias.' },
  valorDiaria:  { min: 0,    max: 1000,  msg: 'Valor de diária fora da faixa aceita.' },
  premioArroba: { min: -500, max: 500,   msg: 'Bonificação fora da faixa aceita.' },
  mortalidade:  { min: 0,    max: 100,   msg: 'Mortalidade deve estar entre 0% e 100%.' },
  cdi:          { min: 0,    max: 100,   msg: 'CDI deve estar entre 0% e 100%.' },
  impostoLucro: { min: 0,    max: 100,   msg: 'Imposto deve estar entre 0% e 100%.' }
};

// Campos que precisam estar preenchidos para simular
const CAMPOS_OBRIGATORIOS = ['capital', 'cabecas', 'diasCocho', 'valorDiaria'];

function lerInputs() {
  const num = (id) => {
    const v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? 0 : v;
  };

  const inputs = {
    capital: num('capital'),
    cabecas: parseInt(document.getElementById('cabecas').value) || 0,
    dias: parseInt(document.getElementById('diasCocho').value) || 0,
    diaria: num('valorDiaria'),
    premio: num('premioArroba'),
    modelo: document.getElementById('modeloBoitel').value,
    mortalidadePct: num('mortalidade'),
    cdi: num('cdi'),
    impostoPct: num('impostoLucro')
  };

  // Validação visual (só marca inválido se o campo tiver valor fora da faixa)
  // e detecção de campos obrigatórios ainda vazios.
  let valido = true;
  let completo = true;
  Object.keys(REGRAS_INPUT).forEach(id => {
    const el = document.getElementById(id);
    const regra = REGRAS_INPUT[id];
    const raw = el.value.trim();
    const vazio = raw === '';
    const v = parseFloat(raw);
    const fora = !vazio && (isNaN(v) || v < regra.min || v > regra.max);
    el.classList.toggle('invalid', fora);
    if (fora) valido = false;
    if (CAMPOS_OBRIGATORIOS.includes(id) && (vazio || v <= 0)) completo = false;
  });

  inputs.valido = valido;
  inputs.completo = completo && valido;
  return inputs;
}

// ============================================
// NÚCLEO DE CÁLCULO (reutilizado por calcular() e atualizarGraficos())
// ============================================
const PESO_SAIDA_ARROBA = 20.33;   // arrobas de carcaça por animal terminado
const FUNRURAL_TAXA = 0.015;       // 1,5% sobre a receita bruta
const FRETE_D0_FRACAO = 0.7;       // 70% do frete pago no embarque (D0)

function calcularRanking(inputs) {
  const { cabecas, dias, diaria, premio, mortalidadePct, impostoPct } = inputs;
  const custoBoitelPorCab = dias * diaria;
  const custoBoitelTotal = custoBoitelPorCab * cabecas;
  const cabecasEfetivas = cabecas * (1 - mortalidadePct / 100);

  const ranking = estadosDB.map(est => {
    const precoVendaArrobaEfetivo = est.arrobaVenda + premio;
    const receitaBrutaCab = PESO_SAIDA_ARROBA * precoVendaArrobaEfetivo;
    const funruralCab = receitaBrutaCab * FUNRURAL_TAXA;

    const custoAnimal = est.boiMagro;
    const custoFrete = est.freteCab;
    const custoTotalCab = custoAnimal + custoBoitelPorCab + custoFrete + funruralCab;

    // Lucro antes de mortalidade e impostos
    const lucroBrutoCab = receitaBrutaCab - custoTotalCab;
    const lucroBrutoLote = lucroBrutoCab * cabecas;

    // Ajuste por mortalidade
    const perdaMortalidadeCab = lucroBrutoCab * (mortalidadePct / 100);
    const perdaMortalidadeLote = perdaMortalidadeCab * cabecas;

    // Lucro após mortalidade
    const lucroAposMortalidadeCab = lucroBrutoCab - perdaMortalidadeCab;
    const lucroAposMortalidadeLote = lucroAposMortalidadeCab * cabecasEfetivas;

    // Imposto sobre o lucro
    const impostoLote = lucroAposMortalidadeLote * (impostoPct / 100);

    // Lucro líquido final
    const lucroLiquidoCab = cabecasEfetivas > 0
      ? (lucroAposMortalidadeCab - (impostoLote / cabecasEfetivas))
      : 0;
    const lucroLiquidoLote = lucroAposMortalidadeLote - impostoLote;

    // ROIC sobre capital investido
    const capitalInvestido = custoTotalCab * cabecas;
    const roic = capitalInvestido > 0 ? ((lucroLiquidoLote / capitalInvestido) * 100) : 0;

    return {
      ...est,
      precoVenda: precoVendaArrobaEfetivo,
      receitaBrutaCab,
      funruralCab,
      custoTotalCab,
      custoBoitelPorCab,
      lucroBrutoCab,
      lucroBrutoLote,
      perdaMortalidadeCab,
      perdaMortalidadeLote,
      lucroAposMortalidadeCab,
      lucroAposMortalidadeLote,
      impostoLote,
      lucroLiquidoCab,
      lucroLiquidoLote,
      roic,
      capitalInvestido,
      // Custos agregados do lote (usados nos gráficos)
      custoAnimalLote: custoAnimal * cabecas,
      custoBoitelLote: custoBoitelPorCab * cabecas,
      custoFreteLote: custoFrete * cabecas,
      custoFunruralLote: funruralCab * cabecasEfetivas
    };
  });

  // Ordenar por lucro líquido do lote
  ranking.sort((a, b) => b.lucroLiquidoLote - a.lucroLiquidoLote);

  return { ranking, melhor: ranking[0], custoBoitelTotal, cabecasEfetivas };
}

// ============================================
// ESTADO VAZIO (enquanto faltam parâmetros obrigatórios)
// ============================================
function renderEstadoVazio() {
  document.getElementById('bestState').innerText = '—';
  document.getElementById('bestRegion').innerText = 'Aguardando dados';
  document.getElementById('bestProfit').innerText = '—';
  document.getElementById('profitPerCab').innerText = 'Preencha os parâmetros';
  document.getElementById('bestRoic').innerText = '—';
  document.getElementById('roicAnualizado').innerText = '—';
  const freeCashEl = document.getElementById('freeCash');
  freeCashEl.innerText = '—';
  freeCashEl.className = 'kpi-value blue';

  document.getElementById('rankingBody').innerHTML =
    '<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 32px;">' +
    'Preencha os parâmetros obrigatórios para ver o ranking dos estados.</td></tr>';

  // DRE / CDI em branco
  ['dreFaturamento', 'dreAnimais', 'dreBoitel', 'dreFrete', 'dreFunrural',
   'dreMortalidade', 'dreImposto', 'dreLiquido', 'retornoCDI', 'spreadCDI']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = '—';
    });
  const spreadEl = document.getElementById('spreadCDI');
  if (spreadEl) spreadEl.style.color = 'var(--text-muted)';
  document.getElementById('dreNotaFluxo').innerText =
    'Informe capital, tamanho do lote, dias de confinamento e valor da diária para iniciar a simulação.';

  // Remove gráficos antigos
  if (lucroChart) { lucroChart.destroy(); lucroChart = null; }
  if (custosChart) { custosChart.destroy(); custosChart = null; }
  if (roicChart) { roicChart.destroy(); roicChart = null; }
}

// ============================================
// FUNÇÃO PRINCIPAL DE CÁLCULO
// ============================================
function calcular() {
  const inputs = lerInputs();

  // Ainda faltam campos obrigatórios: mostra estado vazio
  if (!inputs.completo) {
    renderEstadoVazio();
    return;
  }

  const { capital, cabecas, dias, modelo, cdi } = inputs;
  const { ranking, melhor, custoBoitelTotal, cabecasEfetivas } = calcularRanking(inputs);

  // ============================================
  // ATUALIZAR KPIs DE TOPO
  // ============================================
  document.getElementById('bestState').innerText = melhor.nome;
  document.getElementById('bestRegion').innerText = melhor.regiao;
  document.getElementById('bestProfit').innerText = formatMoney(melhor.lucroLiquidoLote);
  document.getElementById('profitPerCab').innerText = formatMoney(melhor.lucroLiquidoCab) + '/cab';
  document.getElementById('bestRoic').innerText = formatPercent(melhor.roic);
  
  // ROIC anualizado (considerando 106 dias = ~3.44 ciclos/ano)
  const roicAnualizado = dias > 0 ? Math.pow(1 + melhor.roic / 100, 365 / dias) - 1 : 0;
  document.getElementById('roicAnualizado').innerText = formatPercent(roicAnualizado * 100) + ' a.a.';

  // Cálculo de caixa livre (desembolso em D0)
  let desembolsoD0 = (melhor.boiMagro * cabecas) + (melhor.freteCab * cabecas * FRETE_D0_FRACAO);
  if (modelo === 'avista') {
    desembolsoD0 += custoBoitelTotal;
  }
  const caixaLivre = capital - desembolsoD0;
  document.getElementById('freeCash').innerText = formatMoney(caixaLivre);
  
  const freeCashEl = document.getElementById('freeCash');
  freeCashEl.className = caixaLivre >= 0 ? 'kpi-value blue' : 'kpi-value red';

  // ============================================
  // ATUALIZAR TABELA DE RANKING
  // ============================================
  const tbody = document.getElementById('rankingBody');
  tbody.innerHTML = '';
  ranking.forEach((item, index) => {
    const tr = document.createElement('tr');
    const isWinner = index === 0;
    tr.innerHTML = `
      <td>${index === 0 ? '🏆 1º' : (index + 1) + 'º'}</td>
      <td><span class="tag-state">${item.sigla}</span> ${item.nome}</td>
      <td>${formatMoney(item.precoVenda)}</td>
      <td>${formatMoney(item.boiMagro)}</td>
      <td>${formatMoney(item.freteCab)}</td>
      <td class="${isWinner ? 'rank-win' : ''}">${formatMoney(item.lucroLiquidoCab)}</td>
      <td class="${isWinner ? 'rank-win' : ''}">${formatMoney(item.lucroLiquidoLote)}</td>
      <td style="color:${item.roic > 0 ? 'var(--success)' : 'var(--danger)'}">${formatPercent(item.roic)}</td>
    `;
    tbody.appendChild(tr);
  });

  // ============================================
  // ATUALIZAR DRE
  // ============================================
  const recTotal = melhor.receitaBrutaCab * cabecasEfetivas;
  const custoAnimaisTotal = melhor.boiMagro * cabecas;
  const freteTotal = melhor.freteCab * cabecas;
  const funruralTotal = melhor.funruralCab * cabecasEfetivas;

  document.getElementById('dreFaturamento').innerText = formatMoney(recTotal);
  document.getElementById('dreAnimais').innerText = "- " + formatMoney(custoAnimaisTotal);
  document.getElementById('dreBoitel').innerText = "- " + formatMoney(custoBoitelTotal);
  document.getElementById('dreFrete').innerText = "- " + formatMoney(freteTotal);
  document.getElementById('dreFunrural').innerText = "- " + formatMoney(funruralTotal);
  document.getElementById('dreMortalidade').innerText = "- " + formatMoney(melhor.perdaMortalidadeLote);
  document.getElementById('dreImposto').innerText = "- " + formatMoney(melhor.impostoLote);
  document.getElementById('dreLiquido').innerText = formatMoney(melhor.lucroLiquidoLote);

  // Nota sobre fluxo de caixa
  const nota = modelo === 'gancho' 
    ? `Modelo Acerto no Gancho: o valor de ${formatMoney(custoBoitelTotal)} do Boitel será retido diretamente no abate, preservando ${formatMoney(caixaLivre)} em caixa hoje.`
    : `Modelo À Vista: todo o custo de ${formatMoney(custoBoitelTotal)} é desembolsado durante os ${dias} dias de confinamento.`;
  document.getElementById('dreNotaFluxo').innerText = nota;

  // Comparação com CDI
  const cdiPeriodo = Math.pow(1 + cdi / 100, dias / 365) - 1;
  const retornoCDI = capital * cdiPeriodo;
  document.getElementById('retornoCDI').innerText = formatMoney(retornoCDI);
  
  const spread = melhor.roic - (cdiPeriodo * 100);
  const spreadEl = document.getElementById('spreadCDI');
  spreadEl.innerText = (spread >= 0 ? '+' : '') + formatPercent(spread);
  spreadEl.style.color = spread >= 0 ? 'var(--success)' : 'var(--danger)';

  // ============================================
  // ATUALIZAR GRÁFICOS (se aba visível)
  // ============================================
  if (document.getElementById('graficosTab').classList.contains('active')) {
    atualizarGraficos();
  }
}

// ============================================
// ATUALIZAÇÃO DE GRÁFICOS
// ============================================
function atualizarGraficos() {
  // Reutiliza o núcleo de cálculo (mesma fonte de verdade do calcular())
  const inputs = lerInputs();

  // Sem dados suficientes: garante que não fiquem gráficos antigos na tela
  if (!inputs.completo) {
    if (lucroChart) { lucroChart.destroy(); lucroChart = null; }
    if (custosChart) { custosChart.destroy(); custosChart = null; }
    if (roicChart) { roicChart.destroy(); roicChart = null; }
    return;
  }

  const { ranking, melhor } = calcularRanking(inputs);

  // Configuração comum de gráficos
  const chartColors = {
    primary: 'rgba(13, 148, 136, 0.8)',
    primaryLight: 'rgba(20, 184, 166, 0.2)',
    accent: 'rgba(99, 102, 241, 0.8)',
    accentLight: 'rgba(129, 140, 248, 0.2)',
    danger: 'rgba(239, 68, 68, 0.8)',
    warning: 'rgba(245, 158, 11, 0.8)',
    text: '#94a3b8',
    grid: '#2d3a4f'
  };

  // Gráfico 1: Lucro por Estado (Barras)
  const ctx1 = document.getElementById('lucroChart').getContext('2d');
  if (lucroChart) lucroChart.destroy();
  lucroChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ranking.map(r => r.sigla),
      datasets: [{
        label: 'Lucro Líquido do Lote',
        data: ranking.map(r => r.lucroLiquidoLote),
        backgroundColor: ranking.map((r, i) => i === 0 ? chartColors.primary : chartColors.accent),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatMoney(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.text, callback: (val) => 'R$ ' + val.toLocaleString('pt-BR') }
        },
        x: {
          grid: { display: false },
          ticks: { color: chartColors.text }
        }
      }
    }
  });

  // Gráfico 2: Distribuição de Custos (Rosca)
  const ctx2 = document.getElementById('custosChart').getContext('2d');
  if (custosChart) custosChart.destroy();
  custosChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Compra de Animais', 'Hotelaria (Boitel)', 'Frete', 'Funrural'],
      datasets: [{
        data: [
          melhor.custoAnimalLote,
          melhor.custoBoitelLote,
          melhor.custoFreteLote,
          melhor.custoFunruralLote
        ],
        backgroundColor: [
          chartColors.accent,
          chartColors.primary,
          chartColors.warning,
          chartColors.danger
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: chartColors.text, padding: 15 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.label + ': ' + formatMoney(ctx.raw)
          }
        }
      }
    }
  });

  // Gráfico 3: ROIC Comparativo (Barras Horizontais)
  const ctx3 = document.getElementById('roicChart').getContext('2d');
  if (roicChart) roicChart.destroy();
  roicChart = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: ranking.map(r => r.sigla),
      datasets: [{
        label: 'ROIC (%)',
        data: ranking.map(r => r.roic),
        backgroundColor: ranking.map((r, i) => i === 0 ? chartColors.primary : chartColors.accent),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatPercent(ctx.raw)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.text, callback: (val) => val.toFixed(1) + '%' }
        },
        y: {
          grid: { display: false },
          ticks: { color: chartColors.text }
        }
      }
    }
  });
}

// ============================================
// EXPORTAÇÃO PARA PDF
// ============================================
function exportarResumo() {
  window.print();
}
