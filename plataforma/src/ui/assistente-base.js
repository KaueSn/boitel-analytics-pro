// Base de conhecimento do Triguinho e busca por palavras. Sem rede e sem IA:
// respostas escritas à mão; algumas usam os números da simulação aberta (res).
// Módulo puro (sem DOM) para poder ser testado em Node.

const brl = v => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—');
const brl2 = v => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');
const pc = v => (Number.isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—');

// palavras: termos que indicam o assunto (peso 3 cada); exemplos: perguntas típicas (peso 1 por palavra em comum)
import { CONHECIMENTO, ROTULOS_CONHECIMENTO } from './assistente-conhecimento.js';

export const BASE = [
  {
    id: 'comecar', aba: 'premissas',
    palavras: ['comecar', 'inicio', 'primeiro passo', 'primeiros passos', 'por onde', 'tutorial', 'como usar', 'como funciona', 'ajuda'],
    exemplos: ['por onde começo', 'como usar a plataforma', 'me explica como funciona'],
    resposta: () => 'O jeito mais fácil: clique em "Preenchimento guiado" no topo e responda 6 perguntas.\nSe preferir fazer por conta própria:\n1. Premissas: confira os números e troque os "pendentes de cotação" pelos seus.\n2. Painel: veja lucro por lote, retorno x CDI e preço de equilíbrio.\n3. Lote & zootecnia: entenda a conta de cada animal.\n4. Caminhos & objetivo: veja onde a conta fecha e o caminho até a fazenda.\n5. Simulações: salve e compare versões.\nCada aba tem um quadro "Como usar esta aba" no topo.',
    seguintes: ['guiado', 'premissas', 'selos', 'salvar']
  },
  {
    id: 'guiado', aba: 'guiado',
    palavras: ['preenchimento guiado', 'passo a passo', 'facil', 'simples', 'sem complicacao', 'nao entendo', 'muito campo', 'complicado', 'me ajuda a preencher', 'preencher'],
    exemplos: ['tem um jeito mais fácil de preencher', 'é muito complicado', 'me ajuda a preencher'],
    resposta: () => 'Use o Preenchimento guiado: são 6 perguntas simples (quanto investir, onde, que animal, quanto tempo, como o boitel cobra e o preço de venda), cada uma com explicação. No fim, a plataforma preenche as premissas, calcula os fretes pela região e mostra o resultado no Painel. O botão fica no topo da página e também aqui embaixo.',
    seguintes: ['comecar', 'lucro']
  },
  {
    id: 'oque', palavras: ['o que e essa plataforma', 'o que e isso', 'para que serve isso', 'para que serve a plataforma', 'plataforma patrimonial', 'objetivo da plataforma'],
    exemplos: ['o que é essa plataforma', 'para que serve isso'],
    resposta: () => 'É um estudo de viabilidade da pecuária de corte: quanto rende um lote no boitel, como comparar com o CDI, quais riscos existem e se dá para chegar a uma fazenda própria reinvestindo os lucros. É uma ferramenta educacional e analítica: não é recomendação de investimento.',
    seguintes: ['comecar', 'limites']
  },
  {
    id: 'premissas', aba: 'premissas',
    palavras: ['premissa', 'alterar valor', 'mudar valor', 'editar', 'campo', 'preencher', 'digitar'],
    exemplos: ['como mudo os valores', 'onde altero o preço', 'como preencher os campos'],
    resposta: () => 'Na aba Premissas ficam todos os números: capital, peso, ganho de peso, preços, custos do boitel, fretes, impostos e CDI. Mude um campo e tudo recalcula sozinho. Percentuais são digitados em % (15 = 15%). Os links para consultar os preços da sua região ficam no quadro "Onde consultar os preços".',
    seguintes: ['selos', 'mercado', 'pendente']
  },
  {
    id: 'selos', aba: 'premissas',
    palavras: ['selo', 'informado', 'pesquisado', 'estimado', 'origem do dado', 'etiqueta'],
    exemplos: ['o que significa o selo', 'o que é informado pesquisado estimado'],
    resposta: () => 'Cada premissa tem um selo de origem:\n• Informado: veio do seu dossiê.\n• Pesquisado: dado de uma fonte com data (passe o mouse para ver).\n• Estimativa / convenção: valor técnico usual.\n• Pendente de cotação: valor provisório que você precisa trocar por uma cotação real.',
    seguintes: ['pendente', 'fontes']
  },
  {
    id: 'pendente', aba: 'premissas',
    palavras: ['pendente', 'cotacao', 'provisorio', 'sem cotacao'],
    exemplos: ['o que é pendente de cotação', 'quais valores preciso cotar'],
    resposta: () => 'Pendente de cotação = número provisório, sem fonte confirmada. Os que mais pesam no resultado: preço por arroba produzida do boitel, fretes, sanidade e comissões. Peça cotação ao boitel e à transportadora e substitua. Até lá, o resultado é só uma aproximação.',
    seguintes: ['boitel', 'premissas']
  },
  {
    id: 'mercado', aba: 'premissas',
    palavras: ['referencia de mercado', 'preco atual', 'mercado', 'cotacao atual', 'cepea', 'scot', 'regiao'],
    exemplos: ['qual o preço da arroba hoje', 'como uso os preços de mercado', 'qual região escolher'],
    resposta: () => 'A plataforma não copia cotações: as fontes de preço (CEPEA, CONAB, Scot) não permitem uso comercial. Em Premissas há o quadro "Onde consultar os preços da sua região" com os links. Consulte o preço da arroba na sua praça e o do animal no peso que vai comprar, digite e anote a data. Prefira a cotação do frigorífico ou do leiloeiro com quem vai negociar.',
    seguintes: ['fontes', 'prejuizo']
  },
  {
    id: 'filtros', palavras: ['filtro', 'cenario base', 'modelo em foco', 'horizonte', 'tamanho do lote', 'topo da pagina'],
    exemplos: ['para que servem os filtros', 'o que é modelo em foco'],
    resposta: () => 'Filtros do topo:\n• Cenário: aplica os choques pessimista/base/otimista em todas as abas.\n• Modelo em foco: destaca A, B ou C no Painel.\n• Horizonte: anos da projeção patrimonial.\n• Tamanho do lote: 0 = calcula pelo capital; outro número fixa as cabeças.',
    seguintes: ['cenarios', 'modelos']
  },
  {
    id: 'arroba', aba: 'lote',
    palavras: ['arroba', '15 kg', 'carcaca', 'rendimento de carcaca', 'rc'],
    exemplos: ['quanto é uma arroba', 'como calcula as arrobas', 'o que é rendimento de carcaça'],
    resposta: res => `1 arroba = 15 kg de carcaça. Carcaça = peso vivo × rendimento de carcaça (RC). Ex.: 464 kg × 54% = 250,6 kg = 16,7 @.${res?.lote ? ` Na sua simulação, cada animal sai com ${res.lote.animal.arrobasSaida.toFixed(2)} @.` : ''}`,
    seguintes: ['produzida', 'gmd']
  },
  {
    id: 'produzida', aba: 'lote',
    palavras: ['arroba produzida', 'por arroba', 'rc de entrada', 'rendimento de entrada', 'cobranca do boitel'],
    exemplos: ['o que é arroba produzida', 'como o boitel cobra'],
    resposta: res => `Arroba produzida = arrobas na saída − arrobas na entrada. A entrada usa o RC do contrato (normalmente 50%). O boitel cobra um preço por cada arroba produzida, e esse preço já inclui a dieta.${res?.lote ? ` Na sua simulação: ${res.lote.animal.arrobasProduzidas.toFixed(2)} @ produzidas por animal.` : ''} Confirme no contrato o RC de entrada e a regra para animais mortos.`,
    seguintes: ['boitel', 'arroba']
  },
  {
    id: 'boitel', aba: 'lote',
    palavras: ['boitel', 'diaria', 'hotelaria', 'confinamento terceirizado', 'dieta'],
    exemplos: ['diária ou arroba produzida', 'quanto custa o boitel'],
    resposta: () => 'Há duas formas de cobrança: por arroba produzida (preço inclui a dieta) ou por diária (dieta + serviço por cabeça/dia). A aba Lote compara as duas para o mesmo lote. O valor padrão por arroba usa o custo ICBC/USP (R$ 266,62), que é um piso: o boitel cobra a margem dele. Peça cotação.',
    seguintes: ['produzida', 'pendente', 'gancho']
  },
  {
    id: 'gmd', aba: 'premissas',
    palavras: ['gmd', 'ganho medio', 'ganho de peso', 'engorda', 'dias de cocho', 'dias de confinamento'],
    exemplos: ['o que é GMD', 'quantos dias confinar'],
    resposta: () => 'GMD = ganho médio diário, em kg por animal por dia. Peso de saída = peso de entrada + GMD × dias. Mais dias produzem mais arrobas, mas prendem o capital por mais tempo. A aba Caminhos testa combinações de peso de entrada e dias.',
    seguintes: ['varredura', 'arroba']
  },
  {
    id: 'mortalidade', aba: 'premissas',
    palavras: ['mortalidade', 'morte', 'refugo', 'perda de animal'],
    exemplos: ['como entra a mortalidade'],
    resposta: () => 'A mortalidade entra uma vez só: o animal morto foi comprado (custo) e não é vendido (sem receita). Não existe uma linha extra de "perda", para não contar duas vezes. O campo "Momento médio da morte" define quantos dias de diária o morto consome.',
    seguintes: ['dre']
  },
  {
    id: 'dre', aba: 'lote',
    palavras: ['dre', 'demonstrativo', 'custo total', 'linha a linha', 'despesa', 'funrural'],
    exemplos: ['onde vejo os custos', 'como ler a DRE', 'o que é funrural'],
    resposta: () => 'A DRE do lote fica na aba Lote & zootecnia: receita bruta, deduções (Funrural 1,5% e comissão de venda), custos (compra, boitel, fretes, sanidade), lucro operacional, IR, lucro líquido e, por fim, o lucro econômico (descontado o CDI).',
    seguintes: ['lucro', 'impostos']
  },
  {
    id: 'lucro', aba: 'painel',
    palavras: ['lucro', 'resultado', 'quanto ganho', 'quanto vou ganhar', 'rentabilidade', 'retorno', 'roi'],
    exemplos: ['quanto vou lucrar', 'qual o retorno', 'vale a pena'],
    resposta: res => res?.lote
      ? `Na simulação aberta: ${res.lote.cabecas} cabeças por lote, lucro líquido de ${brl(res.lote.lucroLiquido)} por lote, retorno de ${pc(res.lote.roiCiclo)} no ciclo e ${pc(res.lote.roiAnual)} ao ano. Descontando o que o dinheiro renderia no CDI, o lucro econômico é ${brl(res.lote.lucroEconomico)}.${res.lote.lucroEconomico < 0 ? ' Ou seja: com estas premissas, o CDI rende mais.' : ''}`
      : 'O lucro aparece no Painel e na aba Lote. Corrija as premissas com erro para eu conseguir calcular.',
    seguintes: ['equilibrio', 'cdi', 'prejuizo']
  },
  {
    id: 'equilibrio', aba: 'cenarios',
    palavras: ['equilibrio', 'break even', 'ponto de equilibrio', 'margem de seguranca', 'preco minimo'],
    exemplos: ['qual o preço de equilíbrio', 'qual preço mínimo da arroba'],
    resposta: res => `Preço de equilíbrio é o preço da arroba que deixa o lucro operacional em zero.${res?.lote ? ` Na sua simulação: ${brl2(res.lote.precoEquilibrio)}/@, contra ${brl2(res.lote.porCabeca.precoEfetivo)}/@ usado (margem de segurança de ${pc(res.lote.margemSegurancaPreco)}). O preço máximo de compra do animal é ${brl(res.lote.compraEquilibrio)}.` : ''} A aba Cenários mostra também o GMD e o rendimento de equilíbrio.`,
    seguintes: ['cenarios', 'lucro']
  },
  {
    id: 'prejuizo', aba: 'caminhos',
    palavras: ['prejuizo', 'negativo', 'nao fecha', 'por que perde', 'nao da lucro', 'vermelho'],
    exemplos: ['por que dá prejuízo', 'por que está negativo'],
    resposta: res => { const a = res?.precos; return 'Na terminação curta, o resultado depende muito do ágio da reposição: quanto a arroba do animal magro custa acima da arroba do boi gordo.' + (a ? ` Pelos seus preços, o ágio está em ${(a.agio * 100).toFixed(1)}% e 1 animal custa ${a.relacaoTroca.toFixed(2)} @ de boi gordo.` : '') + ' Outros fatores: preço do boitel, frete e dias de cocho. Veja na aba Caminhos as combinações de peso e dias e as alternativas.'; },
    seguintes: ['varredura', 'caminhos']
  },
  {
    id: 'cdi', aba: 'cdi',
    palavras: ['cdi', 'renda fixa', 'aplicacao', 'deixar aplicado', 'selic', 'custo de oportunidade'],
    exemplos: ['é melhor deixar no CDI', 'quanto rende o CDI'],
    resposta: res => `A comparação é sempre líquida: o CDI paga IR pela tabela regressiva e a pecuária paga Funrural e IR. CDI usado: ${res?.lote ? pc(res.lote.premissas.cdiAnual) : '13,65%'} ao ano (BCB, 27/10/2026).${res?.projecao ? ` No horizonte, a pecuária termina com ${brl(res.projecao.resumo.patrimonioFinal)}.` : ''} A aba Renda fixa mostra os dois lados.`,
    seguintes: ['lucro', 'monte']
  },
  {
    id: 'modelos', aba: 'modelos',
    palavras: ['modelo', 'modelo a', 'modelo b', 'modelo c', 'confinamento proprio', 'recria', 'comparar modelos', 'qual modelo'],
    exemplos: ['qual o melhor modelo', 'diferença entre os modelos'],
    resposta: () => 'A = confinamento próprio (instalações, mão de obra, dieta própria; exige escala). B = boitel terceirizado (sem imobilizar capital). C = recria a pasto + terminação no boitel (capital preso por mais tempo, exposto à seca). A aba Modelos compara os três com o mesmo capital e mostra qual vence em cada cenário. Não existe vencedor universal.',
    seguintes: ['filtros', 'cenarios']
  },
  {
    id: 'fazenda', aba: 'patrimonio',
    palavras: ['fazenda', 'terra', 'hectare', 'comprar terra', 'patrimonio', 'imobilizado'],
    exemplos: ['quando consigo comprar a fazenda', 'como funciona a compra da terra'],
    resposta: res => `A projeção só compra a fazenda se sobrar caixa para a reserva, para o próximo lote e para 12 meses de custos e parcelas.${res?.projecao ? (res.projecao.resumo.anoCompraFazenda ? ` Na sua simulação, a compra acontece no ano ${res.projecao.resumo.anoCompraFazenda}.` : ' Na sua simulação, a compra não cabe no horizonte: veja na aba Caminhos a área viável por ano e o aporte necessário.') : ''} Ajuste área, preço por hectare e forma de pagamento na aba Patrimônio.`,
    seguintes: ['aporte', 'caminhos']
  },
  {
    id: 'aporte', aba: 'caminhos',
    palavras: ['aporte', 'quanto falta', 'quanto preciso', 'investir por mes', 'area viavel'],
    exemplos: ['quanto preciso aportar por mês', 'quantos hectares consigo'],
    resposta: () => 'Na aba Caminhos & objetivo, item 4: informe o ano desejado e clique em "Calcular aporte mensal necessário". Logo abaixo, a tabela mostra quantos hectares o seu patrimônio comportaria em cada ano mantendo a liquidez.',
    seguintes: ['fazenda', 'caminhos']
  },
  {
    id: 'caminhos', aba: 'caminhos',
    palavras: ['caminho', 'alternativa', 'oportunidade', 'estrategia', 'o que fazer', 'opcoes'],
    exemplos: ['quais as alternativas', 'que caminho seguir'],
    resposta: () => 'A aba Caminhos compara: só boitel, boitel → recria (híbrido), fazenda financiada, boitel com acerto no gancho, seguir arrendando e renda fixa. Cada caminho roda no cenário base e no pessimista, e recebe uma leitura (supera ou não o CDI, quando a fazenda cabe). Abaixo há a lista do que verificar antes de decidir.',
    seguintes: ['aporte', 'varredura', 'gancho']
  },
  {
    id: 'varredura', aba: 'caminhos',
    palavras: ['peso de entrada', 'peso x dias', 'combinacao', 'mais pesado', 'mapa de cores', 'onde fecha'],
    exemplos: ['qual peso de compra é melhor', 'o que é a tabela peso por dias'],
    resposta: () => 'A tabela "peso × dias" refaz a conta para cada peso, mantendo o seu preço por kg, e varia os dias de cocho. Verde = supera o CDI; amarelo = lucro abaixo do CDI; vermelho = prejuízo. Passe o mouse para ver o lucro por cabeça e o preço de equilíbrio de cada célula.',
    seguintes: ['prejuizo', 'gmd']
  },
  {
    id: 'gancho', aba: 'premissas',
    palavras: ['gancho', 'acerto', 'pagamento do boitel', 'capital de giro', 'pago no final'],
    exemplos: ['o que é acerto no gancho'],
    resposta: () => '"No acerto (gancho)" significa que o boitel recebe na venda dos animais, descontado do pagamento do frigorífico. Assim o mesmo capital compra mais cabeças. "Durante o ciclo" exige o dinheiro antes da venda (opção conservadora). Mude em Premissas → Boitel → Pagamento do boitel.',
    seguintes: ['boitel', 'caminhos']
  },
  {
    id: 'cenarios', aba: 'cenarios',
    palavras: ['cenario', 'pessimista', 'otimista', 'choque', 'tornado', 'sensibilidade'],
    exemplos: ['como mudo o cenário pessimista', 'o que é o tornado'],
    resposta: () => 'O filtro "Cenário" no topo aplica os choques em todas as abas. Na aba Cenários você edita os choques (ex.: arroba −15% no pessimista), vê as três colunas lado a lado, o tornado (barras maiores = variáveis que mais mexem no lucro) e a tabela preço de venda × preço de compra.',
    seguintes: ['monte', 'equilibrio']
  },
  {
    id: 'monte', aba: 'cenarios',
    palavras: ['monte carlo', 'probabilidade', 'chance', 'risco de prejuizo', 'simulacao aleatoria', 'sharpe'],
    exemplos: ['qual a chance de dar prejuízo'],
    resposta: () => 'Na aba Cenários, clique em "Rodar 2.000 iterações". A plataforma sorteia preço, compra, GMD, custo do boitel, rendimento e mortalidade dentro das faixas mostradas e conta quantas vezes dá prejuízo ou fica abaixo do CDI. Atenção: as faixas são hipóteses, então use como teste de estresse, não como previsão.',
    seguintes: ['cenarios']
  },
  {
    id: 'hedge', aba: 'hedge',
    palavras: ['hedge', 'put', 'opcao', 'futuro', 'b3', 'proteger preco', 'travar preco', 'bgi', 'contrato'],
    exemplos: ['como proteger o preço da arroba', 'como funciona a put', 'quantos contratos'],
    resposta: res => `Na aba Hedge B3 você informa o preço futuro, o strike e o prêmio da put (consulte a corretora). Cada contrato tem 330 @.${res?.hedge ? ` Seu lote tem ${Math.round(res.hedge.premissas.arrobasExpostas)} @, o que dá ${res.hedge.contratos} contrato(s) com cobertura de ${pc(res.hedge.coberturaEfetiva)}.` : ''} A put garante um piso e deixa você ganhar na alta, pagando o prêmio. O futuro trava o preço, mas exige margem. É educacional: a plataforma não envia ordens.`,
    seguintes: ['base']
  },
  {
    id: 'base', aba: 'hedge',
    palavras: ['base', 'risco de base', 'datagro', 'diferenca regional'],
    exemplos: ['o que é risco de base'],
    resposta: () => 'Base = preço do boi na sua região − indicador que liquida o contrato. Desde fev/2025 o BGI da B3 liquida pelo indicador DATAGRO. Se a base piorar até o vencimento, a proteção cobre menos do que o esperado. É um risco que o hedge não elimina.',
    seguintes: ['hedge']
  },
  {
    id: 'impostos', palavras: ['imposto', 'ir', 'tributo', 'funrural', 'livro caixa', 'presumido', 'contador'],
    exemplos: ['como calcula o imposto', 'qual regime de IR usar'],
    resposta: () => 'Funrural (pessoa física): 1,5% da receita bruta, descontado na venda. IR: escolha em Premissas → Financeiro: sobre o resultado (padrão, alíquota de 27,5%, conservadora), presumido (20% da receita como base) ou não considerar. A escolha certa depende do seu enquadramento: confirme com o contador.',
    seguintes: ['dre']
  },
  {
    id: 'salvar', aba: 'simulacoes',
    palavras: ['salvar', 'guardar', 'historico', 'versao', 'duplicar', 'abrir simulacao', 'comparar simulacoes', 'lado a lado'],
    exemplos: ['como salvo', 'como comparo duas simulações'],
    resposta: () => 'Na aba Simulações: dê um nome e clique em "Salvar" (atualiza a aberta) ou "Salvar como nova". No histórico você abre, duplica ou exclui. Marque de 2 a 4 para comparar lado a lado. Com o plano Pro elas ficam na sua conta (até 50) e aparecem em qualquer dispositivo.',
    seguintes: ['exportar', 'conta']
  },
  {
    id: 'exportar', aba: 'simulacoes',
    palavras: ['exportar', 'pdf', 'planilha', 'excel', 'csv', 'imprimir', 'relatorio', 'backup', 'baixar'],
    exemplos: ['como gero o PDF', 'como exporto para o Excel'],
    resposta: () => 'Na aba Simulações: "Exportar planilha (CSV)" abre no Excel com premissas, unidades, DRE, projeção e fontes. "Relatório em PDF" abre a impressão: escolha "Salvar como PDF". "Backup de todas (JSON)" guarda todas as simulações num arquivo que você pode importar depois.',
    seguintes: ['salvar']
  },
  {
    id: 'conta', palavras: ['conta', 'navegador', 'outro computador', 'celular', 'sincronizar', 'onde fica salvo', 'perdi'],
    exemplos: ['onde ficam salvas as simulações', 'consigo abrir no celular'],
    resposta: () => 'Com o plano Pro ativo, as simulações ficam na sua conta e aparecem em qualquer computador ou celular (o topo da página mostra "salvo na conta"). Sem isso, ficam só neste navegador. Para trazer as do navegador para a conta, use "Copiar as simulações deste navegador para a conta" na aba Simulações.',
    seguintes: ['salvar', 'privacidade']
  },
  {
    id: 'privacidade', palavras: ['privacidade', 'quem ve', 'seguranca', 'lgpd', 'meus dados', 'admin ve'],
    exemplos: ['alguém vê meus dados', 'meus projetos são privados'],
    resposta: () => 'Seus projetos são privados: só você lê e altera, nem os administradores da Stratum conseguem abrir. Se quiser ajuda de um consultor, exporte o arquivo e envie. Você pode excluir os projetos a qualquer momento.',
    seguintes: ['conta']
  },
  {
    id: 'fontes', aba: 'fontes',
    palavras: ['fonte', 'de onde vem', 'dado de mercado', 'atualizar dados', 'confiavel', 'data dos dados'],
    exemplos: ['de onde vêm os dados', 'os preços estão atualizados'],
    resposta: () => 'A aba Fontes & método lista cada dado com fonte, data, unidade e limitações: Banco Central (CDI), B3 (contratos), ICBC/USP (custo de confinamento), MAPA (frigoríficos com SIF), INCRA (valor da terra) e IBGE (municípios). Preços de boi e de reposição você consulta pelos links e digita, porque as fontes não permitem cópia comercial.',
    seguintes: ['mercado', 'limites']
  },
  {
    id: 'limites', aba: 'fontes',
    palavras: ['limite', 'limitacao', 'garantia', 'recomendacao', 'confiar', 'precisao', 'erro'],
    exemplos: ['posso confiar no resultado', 'isso é recomendação de investimento'],
    resposta: () => 'É um estudo, não uma garantia nem recomendação de investimento. Limites principais: valores médios esperados, preços sem atualização automática, custos pendentes de cotação, IR simplificado por lote e animais avaliados pelo custo. Confirme contratos, impostos e crédito com fornecedores, corretora e contador.',
    seguintes: ['fontes', 'pendente']
  },
  {
    id: 'calendario', aba: 'calendario',
    palavras: ['calendario', 'data', 'quando', 'vencimento', 'agenda', 'prazo'],
    exemplos: ['quando começa o primeiro lote', 'qual a data do abate'],
    resposta: () => 'A aba Calendário & alertas lista início de cada lote, abate, recebimento, vencimento de referência na B3 e a compra da fazenda. Para mudar as datas, altere "Data do primeiro lote" na aba Patrimônio.',
    seguintes: ['fazenda']
  },
  {
    id: 'frete', aba: 'regiao',
    palavras: ['frete', 'transporte', 'caminhao', 'carreta', 'distancia', 'km'],
    exemplos: ['quanto custa o frete', 'como calcular o frete do gado'],
    resposta: () => 'Na aba Região & logística, informe a cidade de compra e a do boitel. A plataforma estima a distância (linha reta × 1,3) e o frete por cabeça: custo fixo da viagem + R$ por km, dividido pelas cabeças que cabem no caminhão (cerca de 400 kg por m²). Depois clique em "Usar estes fretes nas premissas". É estimativa: peça cotação à transportadora.',
    seguintes: ['frigorifico', 'boitelPerto']
  },
  {
    id: 'frigorifico', aba: 'regiao',
    palavras: ['frigorifico', 'abate', 'sif', 'onde vender', 'vender o boi', 'frigorificos'],
    exemplos: ['qual frigorífico mais perto', 'onde vendo o boi gordo'],
    resposta: () => 'A aba Região & logística lista os frigoríficos de bovinos com SIF ativo mais próximos do boitel (cadastro oficial do MAPA, outubro/2026), com capacidade de abate e frete estimado. Registro ativo não garante que comprem na sua região: ligue e pergunte preço, prazo, bonificações e quem paga o frete.',
    seguintes: ['frete', 'mercado']
  },
  {
    id: 'terraRegiao', aba: 'regiao',
    palavras: ['preco da terra', 'valor da terra', 'vtn', 'incra', 'hectare na regiao', 'quanto custa o hectare'],
    exemplos: ['quanto custa o hectare na minha região', 'o que é VTN'],
    resposta: () => 'A aba Região & logística mostra o Valor da Terra Nua (VTN) do INCRA 2026 da região rural da cidade escolhida (mínimo, médio e máximo por hectare). Atenção: o VTN é um valor fiscal, sem benfeitorias, e costuma ficar bem abaixo do preço de mercado. Use como piso e confirme com corretores e laudo.',
    seguintes: ['fazenda', 'boitelPerto']
  },
  {
    id: 'boitelPerto', aba: 'regiao',
    palavras: ['achar boitel', 'encontrar boitel', 'onde encontro', 'onde compro', 'onde acho', 'encontrar', 'boitel perto', 'melhor boitel', 'bom boitel', 'comprar gado', 'onde comprar', 'bois', 'gado', 'leilao', 'fornecedor', 'vendedor de gado'],
    exemplos: ['onde encontro um boitel', 'onde compro os bois', 'tem leilão perto'],
    resposta: () => 'Não existe cadastro oficial de boitéis nem de vendedores de gado. Na aba Região & logística há buscas prontas no Google Maps para boitéis, leilões, fazendas à venda e o sindicato rural da cidade escolhida. Antes de fechar: visite, peça referências de outros clientes e o contrato por escrito (RC de entrada, mortos, frete, pagamento).',
    seguintes: ['frete', 'boitel']
  },
  {
    id: 'erro', palavras: ['nao funciona', 'travou', 'borda vermelha', 'nao calcula', 'corrija', 'bug'],
    exemplos: ['apareceu corrija para recalcular', 'não está calculando'],
    resposta: () => 'Se aparecer "Corrija para recalcular", algum campo está fora da faixa aceita: ele fica com borda vermelha e a mensagem diz o limite. Corrija e tudo volta a calcular. Se a página travar, recarregue: a simulação aberta fica guardada como rascunho.',
    seguintes: ['premissas']
  },
  {
    id: 'tema', palavras: ['tema', 'escuro', 'claro', 'cor da tela', 'modo noturno'],
    exemplos: ['como mudo para o tema claro'],
    resposta: () => 'Clique no botão ◐ no canto superior direito para alternar entre tema claro e escuro.',
    seguintes: []
  },
  ...CONHECIMENTO
];

const PARADAS = new Set('a o e de da do das dos em no na nos nas um uma uns umas para pra por com que se eu meu minha me voce e é como qual quais quanto onde quando isso esse essa este esta tem ter ou ao aos as os ja mais muito sobre'.split(' '));

export function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const raiz = p => (p.length > 4 ? p.replace(/(oes|aes|es|s)$/, '') : p);
const tokens = t => normalizar(t).split(' ').filter(p => p && !PARADAS.has(p)).map(raiz);

/** Erro de digitação ou de transcrição: uma letra trocada, a mais, a menos ou invertida. */
function umErro(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const ra = a.slice(i), rb = b.slice(i);
  return ra.slice(1) === rb.slice(1) || ra.slice(1) === rb || ra === rb.slice(1) || (ra[0] === rb[1] && ra[1] === rb[0] && ra.slice(2) === rb.slice(2));
}

/** Mesma palavra com outra terminação (lucro/lucrar, salvo/salvar): radical comum ≥ 4 letras e ≥ 70% da menor. */
function parecida(a, b) {
  if (a === b) return true;
  const menor = Math.min(a.length, b.length);
  if (menor < 4) return false;
  let i = 0;
  while (i < menor && a[i] === b[i]) i++;
  return (i >= 4 && i / menor >= 0.7) || (menor >= 6 && umErro(a, b));
}
const contem = (conjunto, p) => [...conjunto].some(t => parecida(t, p));

/** Devolve as entradas mais prováveis para a pergunta, com pontuação. */
export function buscar(pergunta, base = BASE, minimo = 3) {
  const n = ' ' + normalizar(pergunta) + ' ';
  const tk = new Set(tokens(pergunta));
  if (!tk.size) return [];
  const curta = n.trim().split(' ').length <= 5;
  return base.map(e => {
    let s = 0;
    // Saudações e agradecimentos só valem em frase curta e com a palavra exata
    if (e.exato) {
      if (curta) for (const p of e.palavras) if (n.includes(' ' + normalizar(p) + ' ')) s += 3 + p.split(' ').length;
      return { e, s };
    }
    for (const p of e.palavras) {
      const np = normalizar(p);
      if (n.includes(' ' + np + ' ') || (np.includes(' ') && n.includes(np))) s += 3 + np.split(' ').length;
      else if (np.split(' ').length === 1 && contem(tk, raiz(np))) s += 3;
    }
    const ex = new Set(e.exemplos.flatMap(tokens));
    for (const t of tk) if (contem(ex, t)) s += 1;
    return { e, s };
  }).filter(x => x.s >= minimo).sort((a, b) => b.s - a.s);
}

const PEDE_REPETIR = /^(repete|repita|repetir|pode repetir|fala de novo|diz de novo|o que voce disse|nao ouvi)\b/;
const NAO_ENTENDEU = /^(nao entendi|explica melhor|explique melhor|como assim|nao ficou claro|me explica melhor|nao compreendi)\b/;

function montar(e, res) {
  let texto;
  try { texto = e.resposta(res); } catch { texto = e.resposta(null); }
  return { id: e.id, texto, aba: e.aba || null, link: e.link || null, seguintes: e.seguintes || [] };
}

/** Resposta pronta para exibir: texto, aba sugerida e próximos assuntos. `ultimoId` permite "repete" e "não entendi". */
export function responder(pergunta, res = null, base = BASE, ultimoId = null) {
  const n = normalizar(pergunta);
  const ultimo = ultimoId ? base.find(e => e.id === ultimoId) : null;
  if (ultimo && PEDE_REPETIR.test(n)) return montar(ultimo, res);
  if (NAO_ENTENDEU.test(n)) {
    if (!ultimo) return { id: null, texto: 'Sem problema. Me diga com as suas palavras o que você quer saber ou fazer.', aba: null, seguintes: ['comandos', 'comecar', 'melhorOpcao'] };
    const r = montar(ultimo, res);
    const ideia = r.texto.split(/(?<=[.!?])\s/)[0];
    return { ...r, texto: `Sem problema. A ideia principal é esta: ${ideia} Qual parte ficou difícil? Pergunte com as suas palavras ou escolha um tema abaixo.` };
  }
  const achados = buscar(pergunta, base);
  if (!achados.length) {
    const perto = buscar(pergunta, base, 1).map(a => a.e.id).filter(id => id !== 'saudacao' && id !== 'agradecimento').slice(0, 4);
    return {
      id: null,
      texto: perto.length
        ? 'Não tenho certeza do que você quer saber e prefiro não inventar. Talvez seja um destes temas abaixo. Também posso simular: diga, por exemplo, "simule com 500 mil e arroba a 320".'
        : 'Isso eu não sei e prefiro não inventar. Sei sobre a plataforma, os seus resultados e a pecuária de corte. Posso abrir páginas ("mostre os cenários") e simular ("e se a arroba cair 10%?").',
      aba: null,
      seguintes: perto.length ? perto : ['comandos', 'melhorOpcao', 'comecar', 'lucro']
    };
  }
  return { ...montar(achados[0].e, res), alternativas: achados.slice(1, 3).map(a => a.e.id) };
}

/** Rótulo curto de cada assunto (para os botões de sugestão). */
export const ROTULOS = {
  ...ROTULOS_CONHECIMENTO,
  comecar: 'Por onde começo?', guiado: 'Jeito fácil de preencher', oque: 'O que é a plataforma?', premissas: 'Como mudo os valores?', selos: 'O que são os selos?',
  pendente: 'O que é "pendente"?', mercado: 'Preços de mercado', filtros: 'Para que servem os filtros?', arroba: 'O que é arroba?',
  produzida: 'Arroba produzida', boitel: 'Como o boitel cobra?', gmd: 'O que é GMD?', mortalidade: 'Mortalidade', dre: 'Como ler a DRE?',
  lucro: 'Quanto vou lucrar?', equilibrio: 'Preço de equilíbrio', prejuizo: 'Por que dá prejuízo?', cdi: 'Comparar com o CDI',
  modelos: 'Modelos A, B e C', fazenda: 'Quando compro a fazenda?', aporte: 'Quanto falta?', caminhos: 'Quais as alternativas?',
  varredura: 'Tabela peso × dias', gancho: 'Acerto no gancho', cenarios: 'Cenários e tornado', monte: 'Chance de prejuízo',
  hedge: 'Como proteger o preço?', base: 'Risco de base', impostos: 'Impostos', salvar: 'Como salvar?', exportar: 'PDF e Excel',
  conta: 'Onde fica salvo?', privacidade: 'Meus dados são privados?', fontes: 'De onde vêm os dados?', limites: 'Posso confiar?',
  calendario: 'Calendário', erro: 'Não está calculando', tema: 'Tema claro/escuro',
  frete: 'Quanto custa o frete?', frigorifico: 'Frigoríficos perto', terraRegiao: 'Preço da terra na região', boitelPerto: 'Como achar boitel e gado?'
};
