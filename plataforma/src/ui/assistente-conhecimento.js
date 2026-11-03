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
    resposta: () => 'Outras atividades do agro, como grãos, café, cana, hortifrúti ou integração lavoura-pecuária, podem dar lucro maior conforme a região e o capital, mas têm outras exigências: máquinas, janela de plantio, clima, crédito e comercialização. Esta plataforma compara só pecuária e renda fixa, então não tenho números para essas atividades. Um estudo próprio para plantio pode ser feito em uma nova página aqui no site.',
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
    palavras: ['financiamento', 'credito', 'plano safra', 'emprestimo', 'banco', 'pronamp', 'pronaf', 'lca', 'titulo isento'],
    exemplos: ['posso financiar', 'como funciona o plano safra'],
    resposta: () => 'O Plano Safra tem linhas de custeio, comercialização e investimento com limites por produtor. As taxas e o enquadramento mudam a cada safra, por isso não informo valores: consulte seu banco ou cooperativa. A aba Patrimônio permite simular a compra da fazenda financiada, com os juros e o prazo que você informar.',
    seguintes: ['fazenda', 'caminhos']
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
    id: 'saudacao', palavras: ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'tudo bem', 'e ai'],
    exemplos: [],
    resposta: () => 'Olá! Eu explico como usar a plataforma e os resultados da sua simulação. Pergunte, por exemplo: qual a melhor opção para o meu capital?',
    seguintes: ['melhorOpcao', 'comecar', 'guiado']
  },
  {
    id: 'agradecimento', palavras: ['obrigado', 'obrigada', 'valeu', 'muito obrigado', 'agradeco'],
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
  reserva: 'Reserva e giro', credito: 'Financiamento', voz: 'Posso falar por voz?', ia: 'Quem é você?', saudacao: 'Oi', agradecimento: 'Obrigado'
};
