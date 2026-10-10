// ============================================
// EXPORTAÇÃO PARA POWERPOINT (.pptx) COM ROTEIRO
// ============================================
// Gera uma apresentação pronta para reunião, com os resultados
// da simulação e um roteiro do que falar (nas notas do apresentador).

const PPT_CORES = {
  navy: '0A0E17',
  card: '141C2B',
  teal: '14B8A6',
  tealDark: '0D9488',
  gold: 'D4AF37',
  green: '10B981',
  red: 'EF4444',
  text: 'E6EDF5',
  muted: '93A1B5'
};

// Reúne todos os números da simulação em um só objeto
function montarResumoSimulacao() {
  const inputs = lerInputs();
  if (!inputs.completo) return null;

  const { ranking, melhor, custoBoitelTotal, cabecasEfetivas } = calcularRanking(inputs);
  const { capital, cabecas, dias, modelo, cdi } = inputs;

  let desembolsoD0 = (melhor.boiMagro * cabecas) + (melhor.freteCab * cabecas * FRETE_D0_FRACAO);
  if (modelo === 'avista') desembolsoD0 += custoBoitelTotal;

  const caixaLivre = capital - desembolsoD0;
  const roicAnualizado = dias > 0 ? Math.pow(1 + melhor.roic / 100, 365 / dias) - 1 : 0;
  const cdiPeriodo = Math.pow(1 + cdi / 100, dias / 365) - 1;
  const retornoCDI = capital * cdiPeriodo;
  const spread = melhor.roic - cdiPeriodo * 100;

  const recTotal = melhor.receitaBrutaCab * cabecasEfetivas;
  const custoAnimaisTotal = melhor.boiMagro * cabecas;
  const freteTotal = melhor.freteCab * cabecas;
  const funruralTotal = melhor.funruralCab * cabecasEfetivas;

  return {
    inputs, ranking, melhor, custoBoitelTotal, cabecasEfetivas,
    capital, cabecas, dias, modelo, cdi,
    desembolsoD0, caixaLivre, roicAnualizado, cdiPeriodo, retornoCDI, spread,
    recTotal, custoAnimaisTotal, freteTotal, funruralTotal,
    usuario: (typeof currentUserData !== 'undefined' && currentUserData && (currentUserData.name || currentUserData.email)) || 'Investidor',
    hoje: new Date().toLocaleDateString('pt-BR')
  };
}

// Roteiro do apresentador (o que falar em cada slide)
function gerarRoteiro(r) {
  const melhor = r.melhor;
  const positivo = melhor.lucroLiquidoLote >= 0;
  return {
    capa: `Bom dia! Vamos apresentar o resultado da simulação de confinamento (boitel) feita na Stratum Agro, ` +
      `com base num capital de ${formatMoney(r.capital)} para um lote de ${r.cabecas} cabeças em ${r.dias} dias de cocho.`,

    indicadores: `O cenário mais vantajoso é ${melhor.nome}, com lucro líquido projetado de ${formatMoney(melhor.lucroLiquidoLote)} ` +
      `(${formatMoney(melhor.lucroLiquidoCab)} por cabeça). O retorno sobre o capital (ROIC) é de ${formatPercent(melhor.roic)} no período, ` +
      `equivalente a ${formatPercent(r.roicAnualizado * 100)} ao ano, contra ${formatPercent(r.cdiPeriodo * 100)} do CDI no mesmo prazo — ` +
      `um ${r.spread >= 0 ? 'ganho' : 'déficit'} de ${formatPercent(Math.abs(r.spread))} sobre a renda fixa.`,

    parametros: `Os parâmetros usados foram: lote de ${r.cabecas} cabeças, ${r.dias} dias de confinamento, ` +
      `diária de hotelaria de ${formatMoney(r.inputs.diaria)}/cab/dia, modalidade ${r.modelo === 'gancho' ? 'acerto no gancho (D+' + r.dias + ')' : 'pagamento à vista'}, ` +
      `mortalidade estimada de ${r.inputs.mortalidadePct}% e imposto sobre o lucro de ${r.inputs.impostoPct}%.`,

    ranking: `Comparando os cinco estados, ${melhor.nome} lidera o ranking. Na sequência vêm ` +
      r.ranking.slice(1).map(x => x.sigla).join(', ') + `. ` +
      `A diferença entre o primeiro e o último colocado é de ${formatMoney(r.ranking[0].lucroLiquidoLote - r.ranking[r.ranking.length - 1].lucroLiquidoLote)}, ` +
      `o que mostra o peso da logística (frete) e do custo de reposição na rentabilidade.`,

    dre: `No demonstrativo, o faturamento bruto é de ${formatMoney(r.recTotal)}. Os principais custos são o boi magro (${formatMoney(r.custoAnimaisTotal)}) ` +
      `e a hotelaria (${formatMoney(r.custoBoitelTotal)}). Após frete, funrural, mortalidade e imposto, o resultado líquido é de ${formatMoney(melhor.lucroLiquidoLote)}.`,

    graficos: `Nos gráficos, destacamos o lucro por estado, a composição dos custos (onde vemos o peso do animal e da alimentação) ` +
      `e o ROIC comparado ao CDI — que evidencia ${r.spread >= 0 ? 'que o investimento supera a renda fixa' : 'que o investimento ainda não compensa a renda fixa'}.`,

    recomendacao: positivo
      ? `Recomendação: avançar com a operação em ${melhor.nome}. O spread de ${formatPercent(r.spread)} sobre o CDI justifica o risco, ` +
        `e o caixa livre em D0 de ${formatMoney(r.caixaLivre)} mantém folga financeira. Próximos passos: travar preço a termo, ` +
        `emitir GTA digital e revisar o contrato do boitel antes de embarcar os animais.`
      : `Recomendação: cautela. Com os parâmetros atuais o resultado é ${formatMoney(melhor.lucroLiquidoLote)}, abaixo do CDI. ` +
        `Sugestão: renegociar a diária do boitel, buscar melhor bonificação (ex.: Boi China), reduzir frete ou revisar a região antes de investir.`
  };
}

function exportarPPT() {
  if (typeof PptxGenJS === 'undefined') {
    showToast('Biblioteca de PowerPoint não carregou. Verifique a internet.', 'error');
    return;
  }
  const r = montarResumoSimulacao();
  if (!r) {
    showToast('Preencha os parâmetros obrigatórios antes de exportar.', 'warning');
    return;
  }

  const roteiro = gerarRoteiro(r);
  const melhor = r.melhor;
  const C = PPT_CORES;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // 13.33 x 7.5 in
  pptx.author = 'Stratum Agro';
  pptx.title = 'Relatório de Simulação — Stratum Agro';

  const fundo = { color: C.navy };
  const tituloSlide = (s, txt, subtxt) => {
    s.addText(txt, { x: 0.6, y: 0.4, w: 12.1, h: 0.7, fontSize: 26, bold: true, color: C.text });
    if (subtxt) s.addText(subtxt, { x: 0.6, y: 1.05, w: 12.1, h: 0.4, fontSize: 13, color: C.muted });
    s.addShape(pptx.ShapeType.line, { x: 0.6, y: 1.5, w: 12.1, h: 0, line: { color: C.teal, width: 2 } });
  };

  // ---------- Slide 1: Capa ----------
  const s1 = pptx.addSlide();
  s1.background = fundo;
  s1.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 2.4, w: 1.1, h: 1.1, fill: { color: C.teal }, rectRadius: 0.15 });
  s1.addText('🐂', { x: 0.6, y: 2.4, w: 1.1, h: 1.1, fontSize: 32, align: 'center', valign: 'middle' });
  s1.addText('Stratum Agro', { x: 1.9, y: 2.35, w: 10, h: 0.8, fontSize: 40, bold: true, color: C.teal });
  s1.addText('Relatório de Simulação — Confinamento (Boitel)', { x: 1.9, y: 3.15, w: 10, h: 0.5, fontSize: 18, color: C.text });
  s1.addText(`Apresentado por ${r.usuario}  ·  ${r.hoje}`, { x: 1.9, y: 3.7, w: 10, h: 0.4, fontSize: 13, color: C.muted });
  s1.addNotes(roteiro.capa);

  // ---------- Slide 2: Indicadores ----------
  const s2 = pptx.addSlide();
  s2.background = fundo;
  tituloSlide(s2, 'Indicadores-Chave', 'Resumo executivo do melhor cenário');
  const kpis = [
    { t: 'Melhor Estado', v: melhor.nome.replace(/\s*\(.*\)/, ''), cor: C.teal },
    { t: 'Lucro Líquido', v: formatMoney(melhor.lucroLiquidoLote), cor: melhor.lucroLiquidoLote >= 0 ? C.green : C.red },
    { t: 'ROIC do Período', v: formatPercent(melhor.roic), cor: C.green },
    { t: 'Caixa Livre (D0)', v: formatMoney(r.caixaLivre), cor: C.teal }
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.1;
    s2.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 2.9, h: 1.9, fill: { color: C.card }, line: { color: '2D3A4F', width: 1 }, rectRadius: 0.1 });
    s2.addText(k.t.toUpperCase(), { x: x + 0.2, y: 2.15, w: 2.5, h: 0.35, fontSize: 10, color: C.muted, bold: true });
    s2.addText(k.v, { x: x + 0.2, y: 2.55, w: 2.5, h: 0.8, fontSize: 22, bold: true, color: k.cor });
  });
  s2.addText(`Spread vs CDI: ${formatPercent(r.spread)}   ·   ROIC anualizado: ${formatPercent(r.roicAnualizado * 100)} a.a.   ·   Payback: ${r.dias} dias`,
    { x: 0.6, y: 4.2, w: 12.1, h: 0.5, fontSize: 14, color: C.text });
  s2.addText(`Melhor lucro por cabeça: ${formatMoney(melhor.lucroLiquidoCab)}/cab`, { x: 0.6, y: 4.7, w: 12.1, h: 0.4, fontSize: 13, color: C.muted });
  s2.addNotes(roteiro.indicadores);

  // ---------- Slide 3: Parâmetros ----------
  const s3 = pptx.addSlide();
  s3.background = fundo;
  tituloSlide(s3, 'Parâmetros da Simulação', 'Entradas utilizadas no cálculo');
  const params = [
    ['Capital disponível', formatMoney(r.capital)],
    ['Tamanho do lote', r.cabecas + ' cabeças'],
    ['Dias de confinamento', r.dias + ' dias'],
    ['Diária de hotelaria', formatMoney(r.inputs.diaria) + '/cab/dia'],
    ['Modalidade', r.modelo === 'gancho' ? 'Acerto no gancho (D+' + r.dias + ')' : 'Pagamento à vista'],
    ['Bonificação adicional', formatMoney(r.inputs.premio) + '/@'],
    ['Mortalidade/refugo', r.inputs.mortalidadePct + '%'],
    ['Custo de oportunidade (CDI)', r.cdi + '% a.a.'],
    ['Imposto sobre o lucro', r.inputs.impostoPct + '%']
  ];
  s3.addTable(
    params.map(p => ([{ text: p[0], options: { color: C.muted } }, { text: p[1], options: { color: C.text, bold: true } }])),
    { x: 0.6, y: 1.9, w: 12.1, colW: [6.05, 6.05], fontSize: 14, border: { type: 'solid', color: '2D3A4F', pt: 1 }, fill: { color: C.card }, rowH: 0.5, valign: 'middle' }
  );
  s3.addNotes(roteiro.parametros);

  // ---------- Slide 4: Ranking ----------
  const s4 = pptx.addSlide();
  s4.background = fundo;
  tituloSlide(s4, 'Ranking dos Estados', 'Ordenado pelo lucro líquido do lote');
  const linhas = [[
    { text: 'Pos.', options: { bold: true, color: C.muted } },
    { text: 'Estado', options: { bold: true, color: C.muted } },
    { text: '@ Venda', options: { bold: true, color: C.muted } },
    { text: 'Custo Animal', options: { bold: true, color: C.muted } },
    { text: 'Frete', options: { bold: true, color: C.muted } },
    { text: 'Lucro Líq./Cab', options: { bold: true, color: C.muted } },
    { text: 'Lucro do Lote', options: { bold: true, color: C.muted } },
    { text: 'ROIC', options: { bold: true, color: C.muted } }
  ]];
  r.ranking.forEach((item, i) => {
    const cor = item.lucroLiquidoLote >= 0 ? C.text : C.red;
    linhas.push([
      { text: (i + 1) + 'º', options: { color: i === 0 ? C.gold : C.muted, bold: i === 0 } },
      { text: item.nome, options: { color: C.text } },
      { text: formatMoney(item.precoVenda), options: { color: cor } },
      { text: formatMoney(item.boiMagro), options: { color: cor } },
      { text: formatMoney(item.freteCab), options: { color: cor } },
      { text: formatMoney(item.lucroLiquidoCab), options: { color: cor, bold: i === 0 } },
      { text: formatMoney(item.lucroLiquidoLote), options: { color: cor, bold: i === 0 } },
      { text: formatPercent(item.roic), options: { color: item.roic >= 0 ? C.green : C.red, bold: i === 0 } }
    ]);
  });
  s4.addTable(linhas, {
    x: 0.6, y: 1.9, w: 12.1,
    colW: [0.8, 2.6, 1.5, 1.7, 1.3, 1.8, 1.8, 1.1],
    fontSize: 11, border: { type: 'solid', color: '2D3A4F', pt: 1 },
    fill: { color: C.card }, rowH: 0.45, valign: 'middle'
  });
  s4.addNotes(roteiro.ranking);

  // ---------- Slide 5: DRE ----------
  const s5 = pptx.addSlide();
  s5.background = fundo;
  tituloSlide(s5, 'Resultado (DRE)', 'Demonstrativo do melhor cenário');
  const dre = [
    ['Faturamento bruto', formatMoney(r.recTotal), C.green],
    ['(-) Compra de bois magros', '- ' + formatMoney(r.custoAnimaisTotal), C.red],
    ['(-) Hotelaria (Boitel)', '- ' + formatMoney(r.custoBoitelTotal), C.red],
    ['(-) Frete e sanidade', '- ' + formatMoney(r.freteTotal), C.red],
    ['(-) Funrural & taxas (1,5%)', '- ' + formatMoney(r.funruralTotal), C.red],
    ['(-) Perda por mortalidade', '- ' + formatMoney(melhor.perdaMortalidadeLote), C.red],
    ['(-) Imposto sobre o lucro', '- ' + formatMoney(melhor.impostoLote), C.red],
    ['Resultado líquido final', formatMoney(melhor.lucroLiquidoLote), C.gold]
  ];
  s5.addTable(
    dre.map((d, i) => ([
      { text: d[0], options: { color: i === dre.length - 1 ? C.gold : C.muted, bold: i === dre.length - 1 } },
      { text: d[1], options: { color: d[2], bold: true, align: 'right' } }
    ])),
    { x: 0.6, y: 1.9, w: 12.1, colW: [8.1, 4.0], fontSize: 14, border: { type: 'solid', color: '2D3A4F', pt: 1 }, fill: { color: C.card }, rowH: 0.5, valign: 'middle' }
  );
  s5.addNotes(roteiro.dre);

  // ---------- Slide 6: Gráficos ----------
  const s6 = pptx.addSlide();
  s6.background = fundo;
  tituloSlide(s6, 'Análise Gráfica', 'Lucro por estado, custos e comparação com o CDI');
  s6.addChart(pptx.ChartType.bar, [{
    name: 'Lucro Líquido', labels: r.ranking.map(x => x.sigla), values: r.ranking.map(x => Math.round(x.lucroLiquidoLote))
  }], {
    x: 0.5, y: 1.9, w: 6.1, h: 4.6, showLegend: false, showValue: true,
    chartColors: [C.teal], catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
    title: 'Lucro por Estado (R$)', showTitle: true, titleColor: C.text, titleFontSize: 12
  });
  s6.addChart(pptx.ChartType.doughnut, [{
    name: 'Custos', labels: ['Animais', 'Hotelaria', 'Frete', 'Funrural'],
    values: [Math.round(melhor.custoAnimalLote), Math.round(melhor.custoBoitelLote), Math.round(melhor.custoFreteLote), Math.round(melhor.custoFunruralLote)]
  }], {
    x: 6.8, y: 1.9, w: 6.0, h: 4.6, showLegend: true, legendColor: C.text, dataLabelColor: C.text,
    chartColors: [C.teal, C.gold, C.muted, C.red],
    title: 'Composição de Custos', showTitle: true, titleColor: C.text, titleFontSize: 12
  });
  s6.addNotes(roteiro.graficos);

  // ---------- Slide 7: Recomendação + Roteiro ----------
  const s7 = pptx.addSlide();
  s7.background = fundo;
  tituloSlide(s7, 'Recomendação', 'O que fazer com base nos números');
  const positivo = melhor.lucroLiquidoLote >= 0;
  s7.addText([
    { text: 'Cenário recomendado: ', options: { bold: true, color: C.teal } },
    { text: melhor.nome + '\n', options: { color: C.text } },
    { text: 'Lucro líquido: ', options: { bold: true, color: C.teal } },
    { text: formatMoney(melhor.lucroLiquidoLote) + `  (${formatMoney(melhor.lucroLiquidoCab)}/cab)\n`, options: { color: C.text } },
    { text: 'Retorno vs CDI: ', options: { bold: true, color: C.teal } },
    { text: `ROIC ${formatPercent(melhor.roic)} vs CDI ${formatPercent(r.cdiPeriodo * 100)} = spread de ${formatPercent(r.spread)}\n`, options: { color: C.text } },
    { text: 'Caixa livre em D0: ', options: { bold: true, color: C.teal } },
    { text: formatMoney(r.caixaLivre) + '\n\n', options: { color: C.text } },
    { text: positivo ? 'Próximos passos: ' : 'Atenção: ', options: { bold: true, color: positivo ? C.green : C.red } },
    { text: positivo
      ? 'travar preço a termo com o frigorífico, emitir GTA digital, revisar o contrato do boitel, definir hedge (B3) e acompanhar a mortalidade.'
      : 'revise a diária do boitel, busque bonificação (Boi China), reduza frete ou avalie outra região — o cenário atual não supera a renda fixa.',
      options: { color: C.text } }
  ], { x: 0.6, y: 1.9, w: 12.1, h: 3.4, fontSize: 16, lineSpacingMultiple: 1.3, valign: 'top' });
  s7.addNotes(roteiro.recomendacao);

  // ---------- Slide 8: Roteiro do apresentador ----------
  const s8 = pptx.addSlide();
  s8.background = fundo;
  tituloSlide(s8, 'Roteiro da Apresentação', 'Sugestão do que falar em cada slide (também nas notas)');
  s8.addText([
    { text: '1. Capa — ', options: { bold: true, color: C.teal } }, { text: roteiro.capa + '\n\n', options: { color: C.text } },
    { text: '2. Indicadores — ', options: { bold: true, color: C.teal } }, { text: roteiro.indicadores + '\n\n', options: { color: C.text } },
    { text: '3. Ranking — ', options: { bold: true, color: C.teal } }, { text: roteiro.ranking + '\n\n', options: { color: C.text } },
    { text: '4. Recomendação — ', options: { bold: true, color: C.teal } }, { text: roteiro.recomendacao, options: { color: C.text } }
  ], { x: 0.6, y: 1.8, w: 12.1, h: 5.3, fontSize: 11.5, lineSpacingMultiple: 1.15, valign: 'top' });

  const nomeArquivo = 'StratumAgro-Relatorio-' + new Date().toISOString().slice(0, 10) + '.pptx';
  pptx.writeFile({ fileName: nomeArquivo })
    .then(() => showToast('Apresentação PPT gerada com sucesso!'))
    .catch(err => { console.error(err); showToast('Erro ao gerar o PPT.', 'error'); });
}
