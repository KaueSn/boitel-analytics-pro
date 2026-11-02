// Guias "Como usar esta aba": para que serve, passo a passo e dicas.
// Aparecem abertos na primeira visita a cada aba e depois ficam recolhidos.
import { esc } from './formato.js';

export const GUIAS = {
  painel: {
    titulo: 'Painel: o resumo de tudo',
    paraQue: 'Mostra, em uma tela, se o projeto se paga: quanto capital fica na atividade, quantos animais cabem por lote, o lucro por lote, o retorno comparado ao CDI e o patrimônio ao fim do horizonte.',
    passos: [
      'Escolha a região de referência e o cenário nos filtros do topo (comece pelo "Base").',
      'Leia primeiro os cartões "Lucro líquido por lote", "Retorno anualizado" e "Preço de equilíbrio".',
      'Veja os alertas: eles dizem quais premissas estão longe do mercado ou quando o caixa fica abaixo da reserva.',
      'Compare a linha da pecuária com a do CDI no gráfico de patrimônio.'
    ],
    dicas: [
      'Cartão com borda vermelha = ponto de atenção (prejuízo, abaixo do CDI ou caixa abaixo da reserva).',
      'Preço de equilíbrio é o preço da arroba que zera o lucro. Quanto mais abaixo do preço usado, mais folga você tem.'
    ]
  },
  premissas: {
    titulo: 'Premissas: os números que alimentam tudo',
    paraQue: 'Todos os cálculos saem daqui: capital, peso, ganho de peso, preços, custos do boitel, fretes, impostos e CDI. Mude um número e todas as abas se atualizam.',
    passos: [
      'Comece com as premissas do dossiê (padrão) ou clique em "Aplicar referência de mercado" para usar os preços pesquisados da região.',
      'Olhe o selo ao lado de cada campo: "Pendente de cotação" significa que o valor é provisório e precisa ser trocado por uma cotação real.',
      'Substitua primeiro os campos pendentes que mais pesam: preço por arroba produzida do boitel, fretes e preço de compra.',
      'Percentuais são digitados em % (ex.: 15 para 15%).'
    ],
    dicas: [
      'Passe o mouse sobre o selo para ver a fonte e a data do dado.',
      'Campo com borda vermelha está fora da faixa aceita; a mensagem no topo diz o limite.',
      '"Restaurar premissas do dossiê" volta aos valores iniciais sem mudar o capital.'
    ]
  },
  regiao: {
    titulo: 'Região & logística: onde comprar, engordar e vender',
    paraQue: 'Calcula a distância e o frete estimado entre a cidade de compra, o boitel e o frigorífico, lista os frigoríficos com SIF mais próximos, mostra o valor de referência da terra na região e traz buscas para achar boitéis, leilões e fazendas.',
    passos: [
      'Digite a cidade onde vai comprar os animais e a do boitel, escolhendo na lista que aparece.',
      'Escolha o tipo de caminhão. O frigorífico de venda pode ficar no "automático" (o mais próximo).',
      'Confira o frete estimado de entrada e de saída e clique em "Usar estes fretes nas premissas".',
      'Veja a tabela de frigoríficos próximos e ligue para eles antes de decidir.',
      'Use os botões de busca para encontrar boitéis, leilões e fazendas na região.'
    ],
    dicas: [
      'Distância e frete são estimativas: confirme a rota e peça cotação à transportadora.',
      'O valor da terra do INCRA (VTN) é um piso fiscal, bem abaixo do preço de mercado de uma fazenda formada.',
      'Na venda ao frigorífico, ele costuma pagar o frete; nesse caso, deixe o frete de saída em 0 nas premissas.'
    ]
  },
  lote: {
    titulo: 'Lote & zootecnia: o que acontece com cada animal',
    paraQue: 'Mostra a evolução física (peso, carcaça, arrobas) e a conta completa do lote: DRE linha a linha, custo por arroba, margem por animal e capital necessário.',
    passos: [
      'Confira o peso de saída e as arrobas produzidas por animal.',
      'Veja na DRE de onde vem cada real: compra, boitel, fretes, sanidade, Funrural e IR.',
      'Compare as duas formas de cobrança do boitel (por arroba produzida × diária) na tabela do fim.'
    ],
    dicas: [
      '1 arroba = 15 kg de carcaça. Carcaça = peso vivo × rendimento de carcaça.',
      'Lucro líquido é o que sobra no caixa. Lucro econômico desconta também o que o dinheiro renderia no CDI.'
    ]
  },
  modelos: {
    titulo: 'Modelos A/B/C: qual forma de produzir rende mais',
    paraQue: 'Compara, com o mesmo capital e em 1 ano: A = confinamento próprio, B = boitel terceirizado, C = recria a pasto + terminação no boitel.',
    passos: [
      'Abra os parâmetros dos modelos A e C e troque os valores provisórios pelos seus (instalações, mão de obra, pasto, preço do bezerro).',
      'Leia a tabela: lucro anual, retorno sobre o capital e preço de equilíbrio de cada modelo.',
      'Veja a tabela "Melhor modelo por critério em cada cenário": o vencedor muda conforme o cenário.'
    ],
    dicas: [
      'O Modelo A exige escala: com pouco capital as instalações não se pagam.',
      'O Modelo C prende o capital por mais tempo (recria + terminação).'
    ]
  },
  patrimonio: {
    titulo: 'Patrimônio: a evolução ano a ano até a fazenda',
    paraQue: 'Projeta o caixa, os animais, a terra e as dívidas ao longo do horizonte, reinvestindo os lucros, e mostra quando (e se) a compra da fazenda cabe sem quebrar o caixa.',
    passos: [
      'Defina o horizonte (10 anos ou mais) e as fases: a partir de que ano avaliar recria e comprar a fazenda.',
      'Informe a área, o preço por hectare e se a compra é à vista ou financiada.',
      'Leia o gráfico e a tabela anual. Os alertas mostram quando a compra foi adiada e quanto faltou.'
    ],
    dicas: [
      'A compra só acontece se sobrar caixa para a reserva, para o próximo lote e para 12 meses de custos e parcelas.',
      'Use "Forçar compra no ano" para ver o que acontece se você comprar antes: aparecem alertas de liquidez.'
    ]
  },
  caminhos: {
    titulo: 'Caminhos & objetivo: onde a conta fecha e alternativas',
    paraQue: 'Confere suas premissas com o mercado, procura combinações de peso e dias que fecham a conta, compara caminhos até a fazenda e calcula quanto falta para chegar lá.',
    passos: [
      'Leia a conferência com o mercado: desvios grandes em vermelho indicam premissas otimistas ou desatualizadas.',
      'Veja a tabela peso × dias: verde supera o CDI, amarelo dá lucro abaixo do CDI, vermelho dá prejuízo.',
      'Clique em "Calcular caminhos" para comparar boitel, híbrido, fazenda financiada, acerto no gancho, arrendar e renda fixa.',
      'Informe o ano desejado e clique em "Calcular aporte mensal necessário".'
    ],
    dicas: [
      'Cada caminho roda também no cenário pessimista: um caminho bom no base e ruim no pessimista é arriscado.',
      'A lista de oportunidades traz o que verificar antes de decidir, não promessas de ganho.'
    ]
  },
  cenarios: {
    titulo: 'Cenários & sensibilidade: o que acontece se algo mudar',
    paraQue: 'Testa o lote no pessimista, base e otimista, mostra quais variáveis mais mexem no lucro e estima a chance de prejuízo por simulação.',
    passos: [
      'Compare as três colunas da primeira tabela (o número de cabeças é o mesmo nas três).',
      'No tornado, as barras mais longas são as variáveis que mais pesam no lucro.',
      'Use a tabela preço de venda × preço de compra para ver a combinação que dá lucro.',
      'Clique em "Rodar 2.000 iterações" para a simulação de Monte Carlo.'
    ],
    dicas: [
      'Você pode editar os choques do pessimista e do otimista no quadro "Editar choques".',
      'As probabilidades do Monte Carlo dependem das hipóteses usadas: servem como teste de estresse, não como previsão.'
    ]
  },
  hedge: {
    titulo: 'Hedge B3: proteger o preço de venda (educacional)',
    paraQue: 'Simula a proteção com put (opção de venda) ou venda no mercado futuro de boi gordo da B3. Não envia ordens e não se conecta a corretoras.',
    passos: [
      'Consulte na corretora ou na B3 o preço futuro do vencimento próximo ao abate, um strike e o prêmio da put.',
      'Digite esses valores e o custo por contrato. A exposição em arrobas já vem do lote.',
      'Compare no gráfico o preço efetivo por arroba sem proteção, com put e com futuro.',
      'Leia os riscos que continuam mesmo com o hedge.'
    ],
    dicas: [
      'Cada contrato tem 330 arrobas. Lotes pequenos ficam parcialmente protegidos.',
      'Base = diferença entre o preço da sua região e o indicador do contrato (DATAGRO). É um risco que o hedge não elimina.'
    ]
  },
  cdi: {
    titulo: 'Renda fixa (CDI): vale mais a pena do que deixar aplicado?',
    paraQue: 'Compara a pecuária com uma aplicação a 100% do CDI, sempre líquido com líquido, no mesmo prazo e com o mesmo capital.',
    passos: [
      'Veja o primeiro quadro: um ciclo do lote contra o CDI no mesmo número de dias.',
      'Veja o segundo: o patrimônio no horizonte inteiro contra o CDI reinvestido.'
    ],
    dicas: ['O IR da renda fixa segue a tabela regressiva pelo prazo (22,5% até 180 dias, 15% acima de 720).']
  },
  calendario: {
    titulo: 'Calendário & alertas',
    paraQue: 'Lista as datas planejadas: início de cada lote, abate, recebimento, vencimento de referência na B3 e compra da fazenda, além de todos os alertas.',
    passos: ['Use as datas para planejar compras, contratos com o boitel e o vencimento do hedge.', 'Mude a "Data do primeiro lote" na aba Patrimônio para recalcular o calendário.'],
    dicas: ['O vencimento B3 mostrado é o último dia do mês do abate: confirme o calendário oficial.']
  },
  simulacoes: {
    titulo: 'Simulações: salvar, comparar e exportar',
    paraQue: 'Guarda versões do seu estudo, compara até 4 lado a lado e gera planilha, PDF e backup.',
    passos: [
      'Dê um nome à simulação e clique em "Salvar" (atualiza) ou "Salvar como nova" (cria outra).',
      'Marque de 2 a 4 simulações no histórico para comparar lado a lado.',
      'Use "Exportar planilha (CSV)" para abrir no Excel e "Relatório em PDF" para imprimir ou salvar.'
    ],
    dicas: [
      'Com o plano Pro as simulações ficam na sua conta (até 50) e aparecem em qualquer dispositivo.',
      'Faça backup em JSON de vez em quando.'
    ]
  },
  fontes: {
    titulo: 'Fontes & método',
    paraQue: 'Mostra de onde vem cada dado de mercado (com data e limitações), as fórmulas usadas e os limites do modelo.',
    passos: ['Confira a data de cada fonte antes de decidir. A plataforma não atualiza cotações sozinha.'],
    dicas: ['Os dados de mercado são de 27–28/10/2026. Atualize as premissas com cotações recentes.']
  }
};

const CHAVE_VISTAS = 'stratum_plataforma_ajuda_vistas_v1';

function abasVistas() {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTAS) || '[]')); } catch { return new Set(); }
}

function marcarVista(aba) {
  try {
    const s = abasVistas();
    s.add(aba);
    localStorage.setItem(CHAVE_VISTAS, JSON.stringify([...s]));
  } catch { /* sem armazenamento: o guia só abre de novo */ }
}

/** HTML do guia da aba. Aberto na primeira visita; depois recolhido. */
export function guiaHTML(aba) {
  const g = GUIAS[aba];
  if (!g) return '';
  const aberto = !abasVistas().has(aba);
  marcarVista(aba);
  return `<details class="guia-aba"${aberto ? ' open' : ''}>
    <summary><span class="guia-ic" aria-hidden="true">?</span> Como usar esta aba — ${esc(g.titulo)}</summary>
    <p>${esc(g.paraQue)}</p>
    <ol>${g.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    ${g.dicas.length ? `<p class="guia-dicas"><b>Dicas:</b></p><ul>${g.dicas.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    <p class="nota">Ficou com dúvida? Clique no Triguinho, no canto da tela, e pergunte.</p>
  </details>`;
}
