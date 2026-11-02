// Dados de mercado pesquisados, com fonte, data, unidade e limitações.
// Coletados em 28/10/2026 diretamente nas páginas das fontes primárias.
// Nada aqui é cotação em tempo real: a plataforma não consulta as fontes
// automaticamente. Atualize os valores à mão e registre a nova data.

export const DATA_COLETA = '2026-10-28';

export const FONTES = [
  {
    id: 'cepea-boi',
    nome: 'Indicador do Boi Gordo CEPEA/ESALQ (estado de SP)',
    url: 'https://www.cepea.org.br/br/indicador/boi-gordo.aspx',
    data: '2026-10-28',
    valor: 389.05,
    unidade: 'R$/@ (15 kg de carcaça), à vista, sem Funrural',
    limitacoes: 'Referência paulista. Praças de MG pagam diferente (ver Scot). Não é o índice de liquidação do contrato BGI desde fev/2025.',
    serie: [
      ['2026-10-07', 376.10], ['2026-10-08', 376.30], ['2026-10-09', 377.80], ['2026-10-13', 378.00],
      ['2026-10-14', 379.40], ['2026-10-15', 380.20], ['2026-10-16', 380.70], ['2026-10-19', 380.70],
      ['2026-10-20', 380.45], ['2026-10-21', 380.40], ['2026-10-22', 380.55], ['2026-10-23', 381.40],
      ['2026-10-26', 381.40], ['2026-10-27', 386.30], ['2026-10-28', 389.05]
    ]
  },
  {
    id: 'cepea-boi-prazo',
    nome: 'Boi gordo CEPEA — média a prazo, SP',
    url: 'https://www.cepea.org.br/br/indicador/boi-gordo.aspx',
    data: '2026-10-28',
    valor: 393.43,
    unidade: 'R$/@, a prazo (prazo médio de 7 dias)',
    limitacoes: 'Calculado pelo CEPEA a partir do indicador à vista e do CDI de 30 dias.'
  },
  {
    id: 'scot-boi-sp',
    nome: 'Boi gordo Scot — SP Barretos/Araçatuba',
    url: 'https://www.scotconsultoria.com.br/cotacoes/boi-gordo/',
    data: '2026-10-27',
    valor: 376.0,
    unidade: 'R$/@ à vista, bruto (R$ 370,00 com desconto do Funrural)',
    limitacoes: 'Boi comum. "Boi China" (até 30 meses, até 4 dentes) tem ágio. Conteúdo da Scot não pode ser reproduzido sem autorização; use só como referência pessoal.'
  },
  {
    id: 'scot-boi-mg',
    nome: 'Boi gordo Scot — MG Triângulo / Belo Horizonte',
    url: 'https://www.scotconsultoria.com.br/cotacoes/boi-gordo/',
    data: '2026-10-27',
    valor: 371.0,
    unidade: 'R$/@ à vista, bruto (R$ 365,00 com desconto do Funrural); base −1,34% sobre SP',
    limitacoes: 'MG Norte e Sul: R$ 369,00. Mesmas restrições de uso da Scot.'
  },
  {
    id: 'scot-reposicao-sp',
    nome: 'Reposição Scot — macho Nelore, SP',
    url: 'https://www.scotconsultoria.com.br/cotacoes/reposicao/',
    data: '2026-10-27',
    valor: 4581.67,
    unidade: 'R$/cabeça — garrote 18 meses, 300 kg (R$ 15,27/kg vivo)',
    limitacoes: 'Boi magro 375 kg: R$ 5.070,50 (R$ 13,52/kg). Animal de 320 kg fica entre as duas categorias; preço real depende de raça, sanidade, frete e negociação.'
  },
  {
    id: 'scot-reposicao-mg',
    nome: 'Reposição Scot — macho Nelore, MG',
    url: 'https://www.scotconsultoria.com.br/cotacoes/reposicao/',
    data: '2026-10-27',
    valor: 4428.79,
    unidade: 'R$/cabeça — garrote 18 meses, 300 kg (R$ 14,76/kg vivo)',
    limitacoes: 'Boi magro 375 kg em MG: R$ 5.186,46 (R$ 13,83/kg). Bezerro 12 meses 240 kg: R$ 3.975,16.'
  },
  {
    id: 'cepea-bezerro',
    nome: 'Indicador do Bezerro CEPEA/ESALQ — MS',
    url: 'https://www.cepea.org.br/br/indicador/bezerro.aspx',
    data: '2026-10-28',
    valor: 3533.54,
    unidade: 'R$/cabeça (peso médio 198 kg), descontado o prazo pelo CDI',
    limitacoes: 'Mato Grosso do Sul; serve só como referência de tendência para recria em MG/SP.'
  },
  {
    id: 'icbc-set26',
    nome: 'ICBC — Índice de Custo de Bovinos Confinados (LAE FMVZ/USP), ed. 112',
    url: 'https://www.farmnews.com.br/gestao/custo-do-confinamento-bovino-sobe-em-setembro-quanto-custa-produzir-uma-arroba/',
    data: '2026-09-30',
    valor: 266.62,
    unidade: 'R$/@ produzida — confinamento médio de SP (grande: R$ 264,91; GO: R$ 235,87)',
    limitacoes: 'É CUSTO DE PRODUÇÃO de um confinamento próprio, não o PREÇO cobrado por boitel (que inclui a margem do prestador). Usado só como piso de referência.'
  },
  {
    id: 'icbc-mar26-operacional',
    nome: 'ICBC ed. 106 — custo operacional por cabeça/dia',
    url: 'https://www.farmnews.com.br/gestao/custo-de-producao-de-bovinos-confinados-em-marco-de-2026-impacto-pela-alta-dos-combustiveis/',
    data: '2026-03-31',
    valor: 3.85,
    unidade: 'R$/cab/dia — custo operacional, confinamento médio de SP (grande: R$ 3,05)',
    limitacoes: 'Exclui a dieta. Dado de março; os custos variaram depois.'
  },
  {
    id: 'bcb-cdi',
    nome: 'CDI anualizado base 252 — BCB/SGS série 4389',
    url: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/5?formato=json',
    data: '2026-10-27',
    valor: 0.1365,
    unidade: '% a.a. (13,65%)',
    limitacoes: 'Taxa observada, não projeção. A meta Selic (série 432) estava em 13,75% a.a.'
  },
  {
    id: 'b3-bgi',
    nome: 'B3 — Futuro de Boi Gordo com liquidação financeira (BGI)',
    url: 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CD95C8AFE30196115C00A725D2.htm',
    data: '2026-10-28',
    valor: 330,
    unidade: 'arrobas líquidas por contrato; cotação em R$/@; tick R$ 0,05; vencimento na última sessão do mês; todos os meses',
    limitacoes: 'Contratos com vencimento a partir de fev/2025 liquidam pelo indicador DATAGRO, não pelo CEPEA. Preços futuros, prêmios e liquidez NÃO foram coletados: informe manualmente.'
  },
  {
    id: 'b3-opcoes-bgi',
    nome: 'B3 — Opções sobre Futuro de Boi Gordo',
    url: 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C995C8A43A01961170D471654A.htm',
    data: '2026-10-28',
    valor: 330,
    unidade: 'arrobas por contrato; estilo americano; prêmio em R$/@ (tick R$ 0,01); vencimento no último dia útil do mês',
    limitacoes: 'Titular não deposita margem e não tem ajuste diário. Exercício automático se estiver dentro do dinheiro. Prêmios e strikes disponíveis não foram coletados.'
  },
  {
    id: 'scot-terra',
    nome: 'Scot — preço médio da terra com pastagem',
    url: 'https://www.scotconsultoria.com.br/noticias/todas-noticias/60897/fique-sabendo-qual-o-preco-da-terra-com-pastagem.htm',
    data: '2026-09-16',
    valor: 56800,
    unidade: 'R$/hectare — média de SP',
    limitacoes: 'Média estadual; a variação regional é grande. O valor de MG não aparece no resumo público: informe manualmente (ex.: VTN da EMATER-MG).'
  },
  {
    id: 'lei-funrural',
    nome: 'Funrural pessoa física (Lei 8.212/1991 art. 25, redação da Lei 13.606/2018)',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm',
    data: '2018-01-09',
    valor: 0.015,
    unidade: '% da receita bruta (1,2% previdência + 0,1% RAT + 0,2% SENAR)',
    limitacoes: 'Vale para produtor PF que contribui sobre a receita. PJ, opção pela folha e liminares mudam a alíquota. Confirme com o contador.'
  },
  {
    id: 'lei-ir-rf',
    nome: 'IR sobre renda fixa — tabela regressiva (Lei 11.033/2004, art. 1º)',
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11.033.htm',
    data: '2004-12-21',
    valor: 0.15,
    unidade: '22,5% até 180 d; 20% de 181 a 360 d; 17,5% de 361 a 720 d; 15% acima de 720 d',
    limitacoes: 'Não confirmei nesta pesquisa se houve mudança legal em 2025–2026. LCA/LCI e CRA para PF eram isentos. Verifique antes de decidir.'
  },
  {
    id: 'mapa-sif',
    nome: 'MAPA — Estabelecimentos registrados no SIF (dados abertos)',
    url: 'https://dados.agricultura.gov.br/dataset/servico-de-inspecao-federal-sif',
    data: '2026-10-02',
    valor: 79,
    unidade: 'frigoríficos de bovinos com SIF ativo em MG (19), SP (19), GO (18) e MS (23); capacidade em cabeças/hora',
    limitacoes: 'Registro ativo não garante que a planta esteja abatendo nem comprando na sua região. Confirme por telefone.'
  },
  {
    id: 'incra-vtn',
    nome: 'INCRA — Pauta de Valores da Terra Nua 2026',
    url: 'https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria/Pauta_de_Valores_2026.xlsx',
    data: '2026-01-01',
    valor: 7978,
    unidade: 'R$/ha — VTN médio por região rural (ex.: região de Uberlândia R$ 7.978; Ribeirão Preto R$ 28.707)',
    limitacoes: 'Valor fiscal da terra sem benfeitorias; costuma ficar bem abaixo do preço de mercado. Use como piso.'
  },
  {
    id: 'ibge-municipios',
    nome: 'Coordenadas dos municípios (kelvins/municipios-brasileiros, dados do IBGE)',
    url: 'https://github.com/kelvins/municipios-brasileiros',
    data: '2026-11-01',
    valor: 1823,
    unidade: 'municípios de MG, SP, GO e MS (sede municipal)',
    limitacoes: 'Distâncias calculadas em linha reta × 1,3 (fator de estrada): estimativa, não rota real.'
  },
  {
    id: 'frete-opecuarista',
    nome: 'O Pecuarista — "Quanto custa transportar boi" e calculadora de lotação',
    url: 'https://www.opecuarista.com.br/posts/quanto-custa-transportar-boi-e-quanto-perde-em-quebra/',
    data: '2026-05-02',
    valor: 9.6,
    unidade: 'R$/km + R$ 1.720 fixos por viagem (calibrado nas faixas por distância); lotação a ~400 kg/m²',
    limitacoes: 'Fonte secundária, com "revisão técnica independente pendente" segundo o próprio site. Peça cotação à transportadora.'
  },
  {
    id: 'simulador-frete',
    nome: 'Frete por cabeça (ida + volta) — base do simulador Stratum atual (js/data.js)',
    url: '',
    data: '2025-10-10',
    valor: 260,
    unidade: 'R$/cab ida+volta — SP R$ 260; MG R$ 410',
    limitacoes: 'NÃO VERIFICADO: sem fonte primária identificada. Peça cotação à transportadora.'
  }
];

export function fonte(id) {
  return FONTES.find(f => f.id === id) || null;
}

/**
 * Preço de reposição por kg vivo interpolado linearmente entre as categorias da
 * Scot (garrote 300 kg e boi magro 375 kg, macho Nelore). Fora da faixa, usa o extremo.
 */
export function precoReposicaoKgInterpolado(regiao, pesoKg) {
  const pts = REGIOES[regiao]?.pontosReposicao;
  if (!pts) return null;
  if (pesoKg <= pts[0][0]) return pts[0][1];
  if (pesoKg >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (pesoKg <= x1) return y0 + (y1 - y0) * (pesoKg - x0) / (x1 - x0);
  }
  return null;
}

/** Predefinições regionais de referência (todas editáveis na interface). */
export const REGIOES = {
  SP: {
    nome: 'São Paulo (Barretos/Araçatuba)',
    precoVendaArroba: 376.0, fontePreco: 'scot-boi-sp',
    pontosReposicao: [[240, 16.74], [300, 15.27], [375, 13.52]],
    precoReposicaoKg: 15.27, fonteReposicao: 'scot-reposicao-sp',
    freteEntradaCab: 130, freteSaidaCab: 130, fonteFrete: 'simulador-frete',
    precoTerraHa: 56800, fonteTerra: 'scot-terra'
  },
  MG: {
    nome: 'Minas Gerais (Triângulo/BH)',
    precoVendaArroba: 371.0, fontePreco: 'scot-boi-mg',
    pontosReposicao: [[240, 16.56], [300, 14.76], [375, 13.83]],
    precoReposicaoKg: 14.76, fonteReposicao: 'scot-reposicao-mg',
    freteEntradaCab: 205, freteSaidaCab: 205, fonteFrete: 'simulador-frete',
    precoTerraHa: null, fonteTerra: null // sem dado verificado: informe à mão
  }
};
