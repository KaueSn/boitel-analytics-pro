// ============================================
// OBJETIVO DETALHADO + RECOMENDAÇÃO DE ESTRATÉGIA
// ============================================

// Remove acentos e deixa minúsculo para comparar palavras-chave
function normalizarTexto(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Temas detectados no objetivo e as recomendações de cada um
const TEMAS_OBJETIVO = [
  { id: 'lucro', titulo: 'Maximizar lucro', palavras: ['lucro', 'rentab', 'retorno', 'ganhar', 'maximiz', 'melhor resultado', 'lucrativ'],
    recs: ['Escolha o estado de maior lucro líquido no Ranking.',
      'Busque bonificação (Boi China, qualidade de carcaça) — aumenta a receita sem mexer no custo.',
      'Renegocie a diária do boitel: cada R$ 1/cab/dia muda bastante o resultado.'] },
  { id: 'risco', titulo: 'Reduzir risco / segurança', palavras: ['risco', 'seguro', 'seguranca', 'conserva', 'cautela', 'protecao', 'garantia'],
    recs: ['Use o modelo de acerto no gancho (D+106) para expor menos caixa.',
      'Estime mortalidade realista (2% a 4%) e mantenha reserva de caixa (veja o Caixa Livre em D0).',
      'Faça trava de preço (contrato a termo) e/ou hedge na B3 para proteger a arroba.',
      'Evite estados com frete muito alto (ex.: MT) quando o foco é segurança.'] },
  { id: 'capital', titulo: 'Capital limitado', palavras: ['capital', 'pouco', 'baixo', 'limite', 'disponivel', 'investir', 'recurso'],
    recs: ['Dimensione o lote ao seu capital e mantenha folga — veja o Caixa Livre em D0.',
      'Comece com um lote menor para diluir risco e aprender a operação.',
      'Prefira o modelo no gancho para não descapitalizar durante o ciclo.'] },
  { id: 'prazo_curto', titulo: 'Prazo curto / giro rápido', palavras: ['curto prazo', 'rapido', 'agil', 'giro', 'poucos meses'],
    recs: ['Reduza os dias de cocho para acelerar o giro e o retorno.',
      'Avalie engorda mais curta (semiconfinamento) para menor exposição.'] },
  { id: 'prazo_longo', titulo: 'Longo prazo', palavras: ['longo prazo', 'anos', 'sustentavel', 'perene'],
    recs: ['Considere recria + engorda (ciclo completo) e contratos de longo prazo.',
      'Avalie integração lavoura-pecuária (ILP).'] },
  { id: 'logistica', titulo: 'Logística / frete', palavras: ['frete', 'logistica', 'perto', 'distancia', 'transporte', 'rodovia'],
    recs: ['Dê preferência a estados próximos (SP/MG) para reduzir frete.',
      'Compare a coluna "Frete Total" no Ranking antes de decidir.'] },
  { id: 'premium', titulo: 'Bonificação / exportação', palavras: ['china', 'premium', 'bonifica', 'exporta', 'rastre', 'qualidade'],
    recs: ['Mire o prêmio Boi China (animal com menos de 30 meses, rastreável).',
      'Informe a bonificação no campo correspondente para ver o ganho no resultado.',
      'Negocie contratos de exportação com o frigorífico.'] },
  { id: 'fiscal', titulo: 'Tributário / impostos', palavras: ['imposto', 'fiscal', 'tribut', 'pis', 'cofins'],
    recs: ['Planeje o regime tributário com seu contador.',
      'Ajuste o campo "Imposto sobre o Lucro" para ver o impacto real no resultado.'] },
  { id: 'contrato', titulo: 'Contratos / garantias', palavras: ['contrato', 'garantia', 'clausula', 'termo'],
    recs: ['Formalize contrato a termo com o frigorífico (preço fixo na nota).',
      'Revise cláusulas de peso de balança, jejum, bonificação e mortalidade.',
      'Considere seguro do rebanho e garantias contratuais.'] },
  { id: 'hedge', titulo: 'Hedge (B3)', palavras: ['hedge', 'b3', 'futuro', 'trava', 'derivativo'],
    recs: ['Use contratos futuros de boi gordo (BGI) na B3 para travar o preço.',
      'Avalie opções (put) para proteger contra quedas sem abrir mão da alta.'] },
  { id: 'pastagem', titulo: 'Pastagem', palavras: ['pasto', 'pastagem', 'reforma', 'capim'],
    recs: ['Considere reforma de pastagem e pecuária intensiva a pasto.',
      'Veja o potencial por hectare na Consultoria Agro.'] },
  { id: 'lavoura', titulo: 'Lavoura / grãos', palavras: ['soja', 'milho', 'lavoura', 'graos', 'plantio', 'sorgo', 'algodao'],
    recs: ['Para lavoura, compare a rentabilidade por hectare na Consultoria Agro.',
      'Avalie integração lavoura-pecuária (ILP) para diversificar.'] },
  { id: 'nutricao', titulo: 'Nutrição / dieta', palavras: ['dieta', 'nutri', 'racao', 'aliment', 'agua'],
    recs: ['A alimentação é o maior custo do confinamento — revise dieta e eficiência.',
      'Pequenas melhorias de conversão movem muito o resultado.'] }
];

// Tenta extrair um valor de capital citado no texto (ex.: "R$ 300 mil", "500k", "R$ 200.000")
function extrairCapital(txt) {
  const t = normalizarTexto(txt).replace(/\./g, ''); // remove separador de milhar
  let m = t.match(/(?:r\$\s*)?([\d]+)\s*(mil|k)\b/);   // "300 mil" / "500k"
  if (m) return parseInt(m[1], 10) * 1000;
  m = t.match(/r\$\s*([\d]+)/);                        // "r$ 300000"
  if (m) return parseInt(m[1], 10);
  m = t.match(/\b(\d{4,})\b/);                         // número com 4+ dígitos
  if (m) return parseInt(m[1], 10);
  return null;
}

function analisarObjetivo(btn) {
  const texto = (document.getElementById('objetivo').value || '').trim();
  if (!texto) { showToast('Escreva seu objetivo para eu analisar.', 'warning'); return; }

  setLoading(btn, true, 'Analisando...');

  const t = normalizarTexto(texto);
  const temas = TEMAS_OBJETIVO.filter(tema => tema.palavras.some(p => t.indexOf(p) !== -1));

  // Se citou um capital, preenche o campo automaticamente
  const capitalCitado = extrairCapital(texto);
  if (capitalCitado && capitalCitado >= 1000) {
    document.getElementById('capital').value = capitalCitado;
    calcular();
  }

  const inputs = lerInputs();
  const completo = inputs.completo;
  let melhor = null, spread = 0, caixaLivre = 0;
  if (completo) {
    const r = montarResumoSimulacao();
    if (r) { melhor = r.melhor; spread = r.spread; caixaLivre = r.caixaLivre; }
  }

  // Monta o HTML
  const chips = temas.length
    ? temas.map(x => '<span class="theme-chip">' + x.titulo + '</span>').join('')
    : '<span class="theme-chip muted">Objetivo geral</span>';

  let recs = [];
  if (temas.length) temas.forEach(x => { recs = recs.concat(x.recs); });
  else recs = ['Descreva melhor o objetivo (lucro, risco, prazo, região, quanto investir) para recomendações mais precisas.',
    'Enquanto isso: preencha os parâmetros e compare os estados no Ranking.'];

  let cenario;
  if (completo) {
    const positivo = melhor.lucroLiquidoLote >= 0;
    const label = positivo ? 'lucro' : 'prejuízo';
    const itens = [
      '<li><strong>' + melhor.nome + '</strong> — ' + label + ' de ' + formatMoney(Math.abs(melhor.lucroLiquidoLote)) +
        ' (' + formatMoney(Math.abs(melhor.lucroLiquidoCab)) + '/cab)</li>',
      '<li>ROIC de ' + formatPercent(melhor.roic) + ' — spread de ' + formatPercent(spread) + ' sobre o CDI</li>',
      '<li>Caixa livre em D0: ' + formatMoney(caixaLivre) +
        (caixaLivre < 0 ? ' — o desembolso em D0 supera o capital informado; dimensione o lote ou aumente o capital.' : '') + '</li>',
      '<li>Próximo passo: ' + (positivo
        ? 'travar preço a termo, emitir GTA digital e revisar o contrato do boitel.'
        : 'com estes números o cenário não fecha — renegocie a diária, busque bonificação ou melhore o preço da arroba antes de fechar.') + '</li>'
    ];
    cenario = '<div class="estrategia-card ' + (positivo ? 'destaque' : 'aviso') + '">' +
      '<div class="estrategia-card-title">' + (positivo ? ic('pin') + ' Melhor cenário com seus números' : ic('warning') + ' Melhor cenário ainda não fecha') + '</div>' +
      '<ul class="estrategia-list">' + itens.join('') + '</ul></div>';
  } else {
    cenario = '<div class="estrategia-card aviso"><div class="estrategia-card-title">' + ic('warning') + ' Faltam dados</div>' +
      '<div class="estrategia-sub">Preencha os parâmetros obrigatórios (capital, lote, dias e diária) para eu calcular o melhor cenário com os seus números.</div></div>';
  }

  const html =
    '<div class="estrategia-card"><div class="estrategia-card-title">' + ic('compass') + ' Objetivos identificados</div>' +
    '<div class="theme-chips">' + chips + '</div></div>' +
    cenario +
    '<div class="estrategia-card"><div class="estrategia-card-title">' + ic('check') + ' Plano recomendado</div>' +
    '<ul class="estrategia-list">' + recs.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' +
    '<div class="estrategia-card"><div class="estrategia-card-title">' + ic('paw') + ' Fale com o Triguinho</div>' +
    '<div class="estrategia-sub">Dúvidas? Use o botão <strong>Tutorial</strong> ou escreva na <strong>Comunidade</strong> — outros usuários e a Stratum ajudam você a executar o plano.</div></div>';

  document.getElementById('estrategiaResultado').innerHTML = html;

  // Abre a aba Estratégia
  const btnTab = document.querySelector('.tab-btn[onclick*="estrategiaTab"]');
  if (btnTab) switchTab('estrategiaTab', btnTab);

  setLoading(btn, false);
  if (capitalCitado && capitalCitado >= 1000) {
    showToast('Capital detectado no objetivo: ' + formatMoney(capitalCitado) + '.');
  } else {
    showToast('Objetivo analisado! Veja a aba Estratégia.');
  }
}
