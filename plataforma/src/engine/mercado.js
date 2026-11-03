// Dados de mercado pesquisados, com fonte, data, unidade e limitações.
// Coletados em 28/10/2026 diretamente nas páginas das fontes primárias.
// Nada aqui é cotação em tempo real: a plataforma não consulta as fontes
// automaticamente. Atualize os valores à mão e registre a nova data.

export const DATA_COLETA = '2026-10-28';

export const FONTES = [
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
];

export function fonte(id) {
  return FONTES.find(f => f.id === id) || null;
}

/**
 * Onde consultar os preços da sua região. A plataforma NÃO reproduz esses valores:
 * CEPEA (CC BY-NC) e CONAB autorizam só uso sem fins lucrativos e a Scot proíbe a
 * reprodução sem autorização. O usuário consulta e digita nas premissas.
 */
export const CONSULTA_PRECOS = [
  { nome: 'CEPEA/ESALQ — Indicador do boi gordo (SP)', o: 'Preço da arroba do boi gordo, diário', url: 'https://www.cepea.org.br/br/indicador/boi-gordo.aspx' },
  { nome: 'CEPEA/ESALQ — Indicador do bezerro (MS)', o: 'Preço do bezerro, diário', url: 'https://www.cepea.org.br/br/indicador/bezerro.aspx' },
  { nome: 'Scot Consultoria — Boi gordo por praça', o: 'Arroba por estado e região (MG Triângulo, Norte, Sul, GO, MS…)', url: 'https://www.scotconsultoria.com.br/cotacoes/boi-gordo/' },
  { nome: 'Scot Consultoria — Reposição', o: 'Bezerro, garrote e boi magro por estado, em R$/cab e R$/kg', url: 'https://www.scotconsultoria.com.br/cotacoes/reposicao/' },
  { nome: 'CONAB — Preços agropecuários', o: 'Preços por estado e município (séries semanais e mensais)', url: 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html' },
  { nome: 'IEA/SP — Banco de dados de preços', o: 'Preços recebidos pelo produtor em SP', url: 'http://iea.agricultura.sp.gov.br/out/Bancodedados.php' },
  { nome: 'B3 — Futuro de boi gordo (BGI)', o: 'Preço futuro por vencimento (para hedge)', url: 'https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CD95C8AFE30196115C00A725D2.htm' }
];
