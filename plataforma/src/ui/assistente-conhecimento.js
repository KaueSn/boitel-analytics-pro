// Conhecimento ampliado do Triguinho: estudo por capital, conceitos da pecuária, contratos e conversa.
// Mesmo formato de assistente-base.js. Sem valores de mercado de terceiros.
import { compararOpcoes } from '../engine/estudo.js';

const brl = v => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—');
const pc = v => (Number.isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—');

export const CONHECIMENTO = [
  {
    id: 'melhorOpcao', aba: 'estudo',
    palavras: ['melhor opcao', 'qual opcao', 'boitel ou', 'comprar ou', 'alugar ou', 'arrendar ou', 'meu capital', 'com meu dinheiro', 'o que compensa', 'o que vale mais', 'o que fazer com', 'melhor comprar', 'melhor arrendar', 'melhor alugar', 'comprar terra ou', 'comprar terreno ou', 'ou fazer boitel', 'ou arrendar', 'investir meu', 'melhor negocio', 'compensa mais'],
    exemplos: ['qual a melhor opção para o meu capital', 'é melhor comprar terra ou fazer boitel', 'alugar ou comprar terreno', 'o que compensa mais'],
    resposta: res => {
      const base = 'A aba Melhor opção & região compara boitel, arrendar terra, comprar terra e renda fixa com o mesmo capital.';
      if (!res?.val) return base;
      const r = compararOpcoes(res.p || res.val.lote, res.val.modeloA, res.val.modeloC, res.val.patrimonio);
      if (r.superaCdi) return `${base} Com ${brl(r.capital)} e os preços informados, o maior resultado em 1 ano é: ${r.melhor.nome}, com ${brl(r.melhor.resultado)} (${pc(r.melhor.retornoSobreCapital)}). Confira os valores provisórios antes de decidir.`;
      return `${base} Com ${brl(r.capital)} e os preços informados, nenhuma opção de pecuária supera a renda fixa, que daria ${brl(r.melhor.resultado)} em 1 ano (${pc(r.melhor.retornoSobreCapital)}).${r.melhorPecuaria ? ` A mais próxima é: ${r.melhorPecuaria.nome}, com ${brl(r.melhorPecuaria.resultado)}.` : ''} Isso depende dos preços digitados: teste os seus.`;
    },
    seguintes: ['melhorRegiao', 'capitalMinimo', 'outrasAtividades']
  },
  {
    id: 'melhorRegiao', aba: 'estudo',
    palavras: ['melhor regiao', 'qual regiao', 'qual estado', 'em qual estado', 'em qual regiao', 'melhor estado', 'melhor lugar', 'onde fazer', 'onde investir', 'melhor cidade', 'qual cidade'],
    exemplos: ['qual a melhor região para boitel', 'em qual estado comprar terra', 'qual o melhor lugar para arrendar'],
    resposta: () => 'Na aba Melhor opção & região há um ranking de regiões para boitel, arrendamento e compra, por estado. Ele usa dados oficiais: frigoríficos com SIF (MAPA) e valor da terra (INCRA). Preço do boi, oferta de boitéis, clima e qualidade da terra não entram: confira na região antes de decidir.',
    seguintes: ['melhorOpcao', 'frigorifico', 'arrendamento']
  },
  {
    id: 'capitalMinimo', aba: 'estudo',
    palavras: ['capital minimo', 'quanto preciso para comecar', 'com quanto', 'pouco dinheiro', 'pouco capital', 'quanto preciso ter', 'valor minimo'],
    exemplos: ['com quanto posso começar', 'tenho pouco capital'],
    resposta: () => 'A aba Melhor opção & região mostra o capital mínimo de cada opção, calculado com os seus preços: boitel e recria consideram uma carreta cheia de animais mais a reserva; confinamento próprio exige instalações e escala mínima; a compra considera a terra sem passar de metade do capital disponível.',
    seguintes: ['melhorOpcao', 'reserva']
  },
  {
    id: 'outrasAtividades', aba: 'estudo',
    palavras: ['plantio', 'plantar', 'lavoura', 'soja', 'milho', 'cafe', 'cana', 'graos', 'hortifruti', 'outras atividades', 'outras opcoes', 'outra atividade', 'ilp', 'integracao lavoura'],
    exemplos: ['e se eu plantar soja', 'outras opções do agro dão mais lucro', 'vale mais a pena lavoura'],
    resposta: () => 'Outras atividades do agro, como grãos, café, cana, hortifrúti ou integração lavoura-pecuária, podem dar lucro maior conforme a região e o capital, mas têm outras exigências: máquinas, janela de plantio, clima, crédito e comercialização. Na página de estudo de plantio você informa a cultura, a região, a área e os seus custos e preços, e ela calcula o resultado por hectare e compara com a pecuária e o CDI, no mesmo capital e prazo. Não tenho custos nem preços dessas culturas: os números são sempre os seus.',
    link: { href: 'plantio.html', rotulo: 'Abrir o estudo de plantio →' },
    seguintes: ['melhorOpcao', 'limites']
  },
  {
    id: 'arrendamento', aba: 'estudo',
    palavras: ['arrendamento', 'arrendar', 'alugar terra', 'alugar terreno', 'alugar pasto', 'aluguel de terra', 'aluguel de pasto', 'teto do arrendamento', 'contrato de arrendamento'],
    exemplos: ['quanto custa arrendar terra', 'como funciona o arrendamento'],
    resposta: () => 'No arrendamento você paga um valor fixo para usar a terra e fica com o resultado e o risco da atividade. O Estatuto da Terra (art. 95, XII) limita o valor a 15% do valor cadastral do imóvel por ano, ou até 30% em glebas de exploração intensiva. A lei também trata de prazos mínimos e renovação: faça o contrato por escrito, com orientação jurídica.',
    seguintes: ['parceria', 'melhorRegiao']
  },
  {
    id: 'parceria',
    palavras: ['parceria', 'parceria pecuaria', 'meia', 'dividir o lucro', 'socio'],
    exemplos: ['o que é parceria pecuária', 'posso fazer parceria'],
    resposta: () => 'Na parceria rural, o dono da terra e o parceiro dividem resultados e riscos em percentuais definidos no contrato, em vez de um valor fixo como no arrendamento. Exige menos caixa no início, mas você também divide o lucro. A lei fixa limites para a parte do proprietário: confira com um advogado antes de assinar.',
    seguintes: ['arrendamento', 'melhorOpcao']
  },
  {
    id: 'confinamento',
    palavras: ['confinamento', 'o que e confinar', 'semiconfinamento', 'cocho'],
    exemplos: ['o que é confinamento'],
    resposta: () => 'Confinamento é a engorda em currais, com dieta controlada no cocho, para o animal ganhar peso mais rápido. No boitel você usa o confinamento de outra pessoa e paga pelo serviço. No confinamento próprio você arca com instalações, dieta, mão de obra e custos fixos.',
    seguintes: ['boitel', 'modelos']
  },
  {
    id: 'fases', palavras: ['recria', 'terminacao', 'cria', 'fases da pecuaria', 'ciclo completo', 'engorda'],
    exemplos: ['o que é recria', 'o que é terminação', 'quais as fases da pecuária'],
    resposta: () => 'As fases da pecuária de corte são: cria (do nascimento à desmama), recria (da desmama até o animal ficar pronto para engordar, normalmente a pasto) e terminação (engorda final até o abate, em pasto ou confinamento). A plataforma estuda a terminação em boitel e a recria seguida de terminação.',
    seguintes: ['reposicao', 'modelos']
  },
  {
    id: 'reposicao',
    palavras: ['reposicao', 'boi magro', 'garrote', 'bezerro', 'novilho', 'que animal comprar', 'qual animal'],
    exemplos: ['o que é boi magro', 'o que é reposição', 'qual animal comprar'],
    resposta: res => `Reposição é o animal comprado para recriar ou engordar. Do mais leve ao mais pesado: bezerro, garrote e boi magro.${res?.precos ? ` Pelos seus preços, o animal custa R$ ${res.precos.precoKgReposicao.toFixed(2).replace('.', ',')} por kg vivo.` : ''} Animais mais leves costumam custar mais por kg. Consulte o preço da sua região nos links da aba Premissas.`,
    seguintes: ['agio', 'varredura']
  },
  {
    id: 'agio', aba: 'caminhos',
    palavras: ['agio', 'relacao de troca', 'troca'],
    exemplos: ['o que é ágio', 'o que é relação de troca'],
    resposta: res => `Relação de troca é quantas arrobas de boi gordo são necessárias para comprar 1 animal. Ágio é quanto a arroba do animal magro custa acima da arroba do boi gordo.${res?.precos ? ` Pelos seus preços: relação de troca de ${res.precos.relacaoTroca.toFixed(2).replace('.', ',')} @ e ágio de ${pc(res.precos.agio)}.` : ''} Quanto maior o ágio, mais difícil a terminação curta fechar com lucro.`,
    seguintes: ['prejuizo', 'reposicao']
  },
  {
    id: 'quebra',
    palavras: ['quebra', 'jejum', 'perda de peso', 'balanca'],
    exemplos: ['o que é quebra de peso'],
    resposta: () => 'Quebra é a perda de peso do animal entre a fazenda e a balança, por jejum, estresse e transporte. Ela cresce com a distância. Se o rendimento de carcaça informado já considera o peso de fazenda, deixe a quebra em 0 nas premissas para não contar duas vezes.',
    seguintes: ['arroba', 'frete']
  },
  {
    id: 'documentos',
    palavras: ['gta', 'guia de transito', 'documento', 'documentos', 'nota fiscal', 'vacina', 'sanidade'],
    exemplos: ['o que é GTA', 'que documentos preciso'],
    resposta: () => 'Para movimentar animais é obrigatória a GTA (Guia de Trânsito Animal), emitida pelo serviço de defesa agropecuária do seu estado, além de nota fiscal e vacinação em dia conforme o calendário da sua região. Confirme as exigências com a defesa agropecuária local.',
    seguintes: ['frete', 'limites']
  },
  {
    id: 'sif',
    palavras: ['o que e sif', 'sif significa', 'inspecao federal'],
    exemplos: ['o que é SIF'],
    resposta: () => 'SIF é o Serviço de Inspeção Federal, do Ministério da Agricultura. Frigorífico com SIF pode vender para outros estados e, com as habilitações necessárias, exportar. A aba Região & logística lista os frigoríficos de bovinos com SIF ativo.',
    seguintes: ['frigorifico']
  },
  {
    id: 'itr',
    palavras: ['itr', 'imposto da terra', 'imposto territorial', 'car', 'cadastro ambiental', 'georreferenciamento', 'escritura', 'itbi', 'custos da compra'],
    exemplos: ['o que é ITR', 'quais custos para comprar terra'],
    resposta: () => 'Ao comprar terra, considere além do preço: ITBI, escritura, registro e georreferenciamento. Depois vêm o ITR anual, que depende da área e do grau de utilização, o CAR (Cadastro Ambiental Rural) e a manutenção de pastagens e cercas. Confira certidões e passivo ambiental antes de pagar qualquer sinal.',
    seguintes: ['fazenda', 'terraRegiao']
  },
  {
    id: 'boiChina',
    palavras: ['boi china', 'china', 'bonificacao', 'premio', 'exportacao', 'novilho precoce'],
    exemplos: ['o que é boi China', 'como ganhar bonificação'],
    resposta: () => 'Bonificação é um valor extra por arroba pago pelo frigorífico por características do lote. O "boi China" é o animal jovem aceito para esse mercado, em geral até 30 meses. As regras e valores mudam: pergunte a grade de bonificação do frigorífico e informe no campo Bonificação das premissas.',
    seguintes: ['frigorifico', 'lucro']
  },
  {
    id: 'reserva',
    palavras: ['reserva', 'reserva de seguranca', 'capital de giro', 'liquidez', 'imprevisto'],
    exemplos: ['para que serve a reserva', 'o que é capital de giro'],
    resposta: res => `A reserva é a parte do capital guardada para imprevistos, como doença, atraso de pagamento ou queda de preço. Capital de giro é o que fica aplicado nos animais durante o ciclo.${res?.lote ? ` Na sua simulação: reserva de ${brl(res.lote.reserva)} e ${brl(res.lote.capitalEmpregado)} na operação.` : ''}`,
    seguintes: ['gancho', 'lucro']
  },
  {
    id: 'credito',
    palavras: ['financiamento', 'financiar', 'financiamento para comprar', 'credito', 'plano safra', 'emprestimo', 'banco', 'pronamp', 'pronaf', 'lca', 'titulo isento'],
    exemplos: ['posso financiar', 'como funciona o plano safra'],
    resposta: () => 'O Plano Safra tem linhas de custeio, comercialização e investimento com limites por produtor. As taxas e o enquadramento mudam a cada safra, por isso não informo valores: consulte seu banco ou cooperativa. A aba Patrimônio permite simular a compra da fazenda financiada, com os juros e o prazo que você informar.',
    seguintes: ['fazenda', 'caminhos']
  },
  {
    id: 'comandos',
    palavras: ['como funciona o triguinho', 'o que voce sabe', 'o que voce faz', 'o que sabe fazer', 'o que voce consegue', 'me ajuda', 'preciso de ajuda', 'nao sei o que fazer', 'como falo com voce', 'o que posso pedir', 'voce faz simulacao'],
    exemplos: ['o que você sabe fazer', 'o que posso te pedir'],
    resposta: () => 'Posso fazer três coisas. Responder sobre a plataforma e a pecuária de corte. Abrir páginas ao lado da conversa: diga "mostre os cenários" ou "abra o painel". E simular com o que você pedir: diga "simule com 500 mil, arroba a 320 e 120 dias" ou "e se a arroba cair 10%?". Se não gostar do resultado, diga "desfazer".',
    seguintes: ['melhorOpcao', 'lucro', 'risco']
  },
  {
    id: 'nome', palavras: ['como voce se chama', 'qual seu nome', 'qual o seu nome', 'quem e o triguinho'],
    exemplos: [],
    resposta: () => 'Eu me chamo Triguinho. Ajudo você a usar a plataforma, simular e entender os resultados.',
    seguintes: ['comandos', 'comecar']
  },
  {
    id: 'quantosBois', aba: 'lote',
    palavras: ['quantos bois', 'quantas cabecas', 'quantos animais', 'tamanho do lote', 'quantos cabem'],
    exemplos: ['quantos bois consigo comprar', 'quantas cabeças dá para comprar com meu dinheiro'],
    resposta: res => (res?.lote
      ? `Com ${brl(res.val?.lote?.capitalInicial)} e os preços da simulação, cabem ${res.lote.cabecas} cabeças por lote, já guardando a reserva. Para testar outro valor, diga "simule com 500 mil".`
      : 'Depende do capital, do preço do animal e da reserva. Diga "simule com 500 mil" que eu calculo.'),
    seguintes: ['lucro', 'capitalMinimo']
  },
  {
    id: 'valePena', aba: 'estudo',
    palavras: ['vale a pena', 'bom negocio', 'da dinheiro', 'da lucro', 'ficar rico', 'compensa investir', 'investir em boi', 'investir em gado', 'investir na pecuaria'],
    exemplos: ['vale a pena investir em boi', 'é um bom negócio', 'boi dá dinheiro'],
    resposta: res => {
      const base = 'Depende dos seus preços, e não há garantia de lucro.';
      if (!res?.lote) return `${base} A aba Melhor opção & região compara com a renda fixa.`;
      const eco = res.lote.lucroEconomico;
      return `${base} Com os números da simulação, o lote dá ${brl(res.lote.lucroLiquido)} de lucro líquido e ${pc(res.lote.roiAnual)} ao ano. ${eco < 0 ? `Isso fica ${brl(-eco)} abaixo do que o mesmo dinheiro renderia no CDI.` : `Isso fica ${brl(eco)} acima do CDI.`} Teste outros preços: diga "e se a arroba subir 10%?". É um estudo, não recomendação de investimento.`;
    },
    seguintes: ['melhorOpcao', 'risco', 'ganharMais']
  },
  {
    id: 'risco', aba: 'cenarios',
    palavras: ['risco', 'riscos', 'arriscado', 'perder dinheiro', 'posso perder', 'seguro investir', 'perigoso'],
    exemplos: ['qual o risco', 'é arriscado', 'posso perder dinheiro'],
    resposta: res => `Os maiores riscos são: queda do preço da arroba, reposição cara, ganho de peso abaixo do esperado, morte de animais, calote ou atraso no pagamento e preço do boitel.${res?.lote ? ` Na sua simulação, a margem de segurança no preço da arroba é de ${pc(res.lote.margemSegurancaPreco)}.` : ''} A aba Cenários testa o pessimista e a chance de prejuízo. Sim, é possível perder dinheiro.`,
    seguintes: ['monte', 'hedge', 'equilibrio']
  },
  {
    id: 'precoAgora', aba: 'premissas',
    palavras: ['preco do boi', 'preco da arroba', 'quanto esta a arroba', 'arroba hoje', 'boi hoje', 'cotacao de hoje', 'quanto esta o boi', 'preco hoje', 'quanto custa um boi'],
    exemplos: ['qual o preço do boi hoje', 'quanto está a arroba'],
    resposta: res => `Não tenho cotação ao vivo: as fontes de preço não permitem uso comercial. Em Premissas há links para consultar a sua praça.${res?.val?.lote ? ` Na simulação você está usando ${brl(res.val.lote.precoVendaArroba)} por arroba e ${brl(res.val.lote.precoCompraCab)} pelo animal.` : ''} Para testar outro preço, diga "simule com arroba a 320".`,
    seguintes: ['mercado', 'equilibrio']
  },
  {
    id: 'racas',
    palavras: ['raca', 'racas', 'nelore', 'angus', 'cruzamento', 'cruzado', 'cruzados'],
    exemplos: ['qual a melhor raça', 'nelore ou angus'],
    resposta: () => 'O Nelore é a base do rebanho de corte brasileiro: rústico e adaptado ao calor. Cruzados, como Angus com Nelore, costumam ganhar peso mais rápido e dar melhor acabamento, e podem receber bonificação, mas costumam custar mais na compra. Não há raça melhor em qualquer situação: pergunte ao boitel e ao frigorífico o que eles preferem e ajuste GMD e preços na simulação.',
    seguintes: ['gmd', 'boiChina']
  },
  {
    id: 'dieta',
    palavras: ['o que o boi come', 'alimentacao', 'racao', 'silagem', 'dieta do confinamento', 'o que come', 'volumoso', 'concentrado'],
    exemplos: ['o que o boi come', 'qual a dieta do confinamento'],
    resposta: () => 'No confinamento a dieta mistura volumoso, como silagem, com concentrado, como milho e farelos, formulada por nutricionista, com adaptação gradual nos primeiros dias. No boitel por arroba produzida, a dieta já está no preço. Na cobrança por diária, ela entra como custo nutricional por dia.',
    seguintes: ['boitel', 'gmd']
  },
  {
    id: 'pesoAbate', aba: 'lote',
    palavras: ['peso de abate', 'quanto pesa um boi', 'quanto pesa o boi', 'boi gordo pesa', 'quilos abate', 'peso de saida', 'peso final', 'com quantos quilos'],
    exemplos: ['quanto pesa um boi gordo', 'com quantos quilos abate'],
    resposta: res => (res?.lote
      ? `Na sua simulação, o animal sai com ${Math.round(res.lote.animal.pesoAbateKg)} kg, que dão ${res.lote.animal.arrobasSaida.toFixed(1).replace('.', ',')} arrobas. O peso sai da conta: peso de entrada + ganho diário × dias.`
      : 'O peso de saída é o peso de entrada + ganho diário × dias de cocho.'),
    seguintes: ['arroba', 'gmd']
  },
  {
    id: 'epoca',
    palavras: ['melhor mes', 'melhor epoca', 'entressafra', 'safra', 'quando vender', 'quando comprar boi', 'epoca do ano', 'periodo seco', 'sazonalidade'],
    exemplos: ['qual o melhor mês para comprar boi', 'o que é entressafra'],
    resposta: () => 'Entressafra é o período seco, quando há menos boi de pasto pronto e a arroba tende a ficar mais firme. Por isso muitos confinam para vender nessa época. Não é regra: o preço depende também da exportação e da oferta. Mude a data em Patrimônio e teste preços diferentes.',
    seguintes: ['hedge', 'calendario']
  },
  {
    id: 'outrosInvestimentos', aba: 'cdi',
    palavras: ['poupanca', 'tesouro direto', 'tesouro', 'cdb', 'acoes', 'bolsa de valores', 'fundo imobiliario', 'dolar', 'bitcoin'],
    exemplos: ['quanto rende na poupança', 'é melhor tesouro direto'],
    resposta: res => `A plataforma compara só com o CDI${res?.val?.lote ? `, em ${pc(res.val.lote.cdiAnual)} ao ano nas suas premissas,` : ''} já líquido de imposto. Não comparo poupança, Tesouro, ações ou outros produtos: fale com um profissional habilitado para isso.`,
    seguintes: ['cdi', 'limites']
  },
  {
    id: 'empresa',
    palavras: ['abrir empresa', 'cnpj', 'pessoa juridica', 'pessoa fisica', 'produtor rural', 'inscricao estadual', 'mei', 'preciso de contador'],
    exemplos: ['preciso abrir empresa', 'preciso de CNPJ', 'preciso de contador'],
    resposta: () => 'A forma de atuar, como produtor rural pessoa física ou empresa, muda imposto e documentos, e depende do seu caso. A simulação considera por padrão pessoa física. Vale conversar com um contador antes do primeiro lote e pedir a inscrição exigida no seu estado.',
    seguintes: ['impostos', 'documentos']
  },
  {
    id: 'ganharMais', aba: 'caminhos',
    palavras: ['ganhar mais', 'lucrar mais', 'reduzir custo', 'reduzir custos', 'diminuir custo', 'aumentar lucro', 'melhorar resultado', 'melhorar o lucro', 'economizar'],
    exemplos: ['como faço para ganhar mais', 'como reduzir custo'],
    resposta: res => `O que mais mexe no resultado: comprar melhor o animal${res?.precos ? ` (o ágio está em ${(res.precos.agio * 100).toFixed(1).replace('.', ',')}%)` : ''}, vender melhor a arroba, negociar o boitel, reduzir o frete com uma região mais próxima e buscar bonificação. A aba Cenários mostra no tornado o que pesa mais, e a aba Caminhos testa peso e dias. Me diga uma mudança, como "e se o boi magro cair 5%?", que eu calculo.`,
    seguintes: ['varredura', 'cenarios', 'boiChina']
  },
  {
    id: 'indicadores', aba: 'painel',
    palavras: ['o que e roi', 'significa roi', 'payback', 'tir', 'vpl', 'roi', 'taxa interna', 'tempo de retorno', 'quanto tempo demora', 'quanto tempo para ter retorno', 'quanto tempo leva', 'ciclo demora'],
    exemplos: ['o que é payback', 'o que é TIR', 'quanto tempo demora para ter retorno'],
    resposta: res => `ROI é o lucro dividido pelo capital usado. TIR é a taxa que resume o retorno no tempo. Payback é quanto tempo leva para recuperar o investido.${res?.lote && res.p ? ` Na sua simulação: ${res.p.diasCiclo} dias de cocho por ciclo, retorno de ${pc(res.lote.roiCiclo)} no ciclo e ${pc(res.lote.roiAnual)} ao ano.` : ''}`,
    seguintes: ['lucro', 'cdi']
  },
  {
    id: 'contratoBoitel', aba: 'lote',
    palavras: ['contrato com o boitel', 'contrato do boitel', 'contrato de boitel', 'o que pedir no contrato', 'clausula'],
    exemplos: ['como funciona o contrato com o boitel'],
    resposta: () => 'Peça por escrito: forma de cobrança e valor, rendimento de carcaça de entrada, regra para animais mortos ou refugados, quem paga frete, quando o boitel recebe e quem vende o gado. Compare a proposta na aba Lote e leve o contrato a um advogado se o valor for alto.',
    seguintes: ['produzida', 'gancho']
  },
  {
    id: 'plano',
    palavras: ['plano pro', 'cancelar', 'cancelamento', 'assinatura', 'custa o plano', 'mensalidade', 'pagamento do plano'],
    exemplos: ['como cancelar o plano', 'quanto custa o plano'],
    resposta: () => 'Valores e cancelamento do plano ficam na sua conta, no simulador da Stratum Agro. Eu não tenho esses dados aqui.',
    seguintes: ['conta', 'privacidade']
  },
  {
    id: 'contato',
    palavras: ['falo com voces', 'falar com alguem', 'falar com voces', 'atendimento', 'suporte', 'contato', 'telefone', 'whatsapp', 'consultor'],
    exemplos: ['como falo com vocês'],
    resposta: () => 'Para falar com a equipe, use os contatos do site da Stratum Agro. Se quiser ajuda de um consultor com os números, exporte a simulação na aba Simulações e envie o arquivo.',
    seguintes: ['exportar', 'privacidade']
  },
  {
    id: 'vozRuim',
    palavras: ['voz robotica', 'voz ruim', 'voz estranha', 'mudar a voz', 'trocar a voz', 'outra voz', 'voz esta', 'voz natural', 'me escuta', 'esta me ouvindo'],
    exemplos: ['a voz está ruim', 'como mudo a voz', 'você me escuta'],
    resposta: () => 'A voz vem do seu navegador. Na página do Triguinho, escolha outra em "Voz" e clique em Ouvir. As mais naturais e gratuitas costumam estar no Microsoft Edge, como a Francisca. No Chrome, procure "Google português do Brasil". Eu ouço pelo botão Falar ou pela Conversa por voz.',
    seguintes: ['voz', 'comandos']
  },
  {
    id: 'piada', palavras: ['piada', 'me conta', 'conta uma', 'cantar', 'seu time'],
    exemplos: [],
    resposta: () => 'Essa não é a minha especialidade: sou melhor com arrobas do que com piadas. Quer que eu simule alguma coisa?',
    seguintes: ['comandos', 'melhorOpcao']
  },
  {
    id: 'voz', palavras: ['falar com voce', 'por voz', 'microfone', 'audio', 'mandar audio', 'enviar audio', 'pagina do triguinho', 'conversar por voz'],
    exemplos: ['posso falar com você', 'como envio áudio'],
    resposta: () => 'Na página do Triguinho você fala pelo microfone e eu respondo em voz alta. O botão "Falar" faz uma pergunta, e "Conversa por voz" continua ouvindo depois de cada resposta. Funciona no Chrome e no Edge. Ainda não dá para enviar um arquivo de áudio gravado.',
    seguintes: ['ia', 'comecar']
  },
  {
    id: 'ia', palavras: ['voce e uma ia', 'inteligencia artificial', 'voce e um robo', 'quem e voce', 'quem criou', 'chatgpt', 'seu nome'],
    exemplos: ['quem é você', 'você é uma inteligência artificial'],
    resposta: () => 'Sou o Triguinho, o assistente da Plataforma Patrimonial da Stratum Agro. Não sou uma inteligência artificial: procuro a sua pergunta numa base de respostas escritas e uso os números da sua simulação. Por isso, sobre assuntos fora dela eu aviso que não sei, em vez de inventar.',
    seguintes: ['comecar', 'limites']
  },
  {
    id: 'saudacao', exato: true, palavras: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'e ai'],
    exemplos: [],
    resposta: () => 'Olá! Eu explico como usar a plataforma e os resultados da sua simulação. Pergunte, por exemplo: qual a melhor opção para o meu capital?',
    seguintes: ['melhorOpcao', 'comecar', 'guiado']
  },
  {
    id: 'agradecimento', exato: true, palavras: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'agradeco'],
    exemplos: [],
    resposta: () => 'Por nada! Se surgir outra dúvida, é só perguntar.',
    seguintes: ['melhorOpcao', 'lucro']
  }
];

export const ROTULOS_CONHECIMENTO = {
  melhorOpcao: 'Melhor opção para o capital', melhorRegiao: 'Melhor região', capitalMinimo: 'Com quanto começar?',
  outrasAtividades: 'E outras atividades?', arrendamento: 'Como é o arrendamento?', parceria: 'O que é parceria?',
  confinamento: 'O que é confinamento?', fases: 'Fases da pecuária', reposicao: 'O que é reposição?', agio: 'Ágio e relação de troca',
  quebra: 'Quebra de peso', documentos: 'Documentos e GTA', sif: 'O que é SIF?', itr: 'Custos de comprar terra', boiChina: 'Bonificação e Boi China',
  reserva: 'Reserva e giro', comandos: 'O que você sabe fazer?', nome: 'Seu nome', quantosBois: 'Quantos bois cabem?', valePena: 'Vale a pena?', risco: 'Quais os riscos?', precoAgora: 'Preço do boi hoje', racas: 'Nelore ou cruzado?', dieta: 'O que o boi come?', pesoAbate: 'Peso de saída', epoca: 'Melhor época', outrosInvestimentos: 'Poupança e Tesouro', empresa: 'Preciso de empresa?', ganharMais: 'Como ganhar mais?', indicadores: 'ROI, TIR e payback', contratoBoitel: 'Contrato do boitel', plano: 'Plano e cancelamento', contato: 'Falar com a equipe', vozRuim: 'Mudar a voz', piada: 'Uma piada', credito: 'Financiamento', voz: 'Posso falar por voz?', ia: 'Quem é você?', saudacao: 'Oi', agradecimento: 'Obrigado'
};
