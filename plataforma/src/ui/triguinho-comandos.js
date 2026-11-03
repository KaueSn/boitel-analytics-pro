// Pedidos que o Triguinho executa: simular com os valores da frase, abrir páginas e comparar
// regiões de um estado. Sem DOM e sem rede. Regras escritas à mão: não é IA.
import { ESQUEMA_LOTE } from '../engine/premissas.js';
import { ESQUEMA_PATRIMONIO } from '../engine/patrimonio.js';
import { compararOpcoes, rankingRegioes, UFS_ESTUDO } from '../engine/estudo.js';

const brl = v => (Number.isFinite(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—');
const pc = v => (Number.isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—');

/** Páginas que o mini navegador pode abrir. Só da própria plataforma. */
export const PAGINAS = {
  painel: { nome: 'Painel', url: 'index.html', hash: 'painel', termos: ['painel', 'dashboard', 'resumo', 'inicio', 'plataforma'] },
  estudo: { nome: 'Melhor opção & região', url: 'index.html', hash: 'estudo', termos: ['melhor opcao', 'melhor regiao', 'estudo', 'ranking', 'regioes'] },
  premissas: { nome: 'Premissas', url: 'index.html', hash: 'premissas', termos: ['premissa', 'premissas', 'valores', 'campos'] },
  lote: { nome: 'Lote & zootecnia', url: 'index.html', hash: 'lote', termos: ['lote', 'zootecnia', 'dre', 'custos'] },
  modelos: { nome: 'Modelos A/B/C', url: 'index.html', hash: 'modelos', termos: ['modelos', 'modelo a', 'modelo b', 'modelo c'] },
  patrimonio: { nome: 'Patrimônio', url: 'index.html', hash: 'patrimonio', termos: ['patrimonio', 'projecao', 'fazenda'] },
  caminhos: { nome: 'Caminhos & objetivo', url: 'index.html', hash: 'caminhos', termos: ['caminhos', 'caminho', 'objetivo', 'alternativas', 'aporte'] },
  cenarios: { nome: 'Cenários', url: 'index.html', hash: 'cenarios', termos: ['cenarios', 'cenario', 'monte carlo', 'tornado', 'sensibilidade'] },
  hedge: { nome: 'Hedge B3', url: 'index.html', hash: 'hedge', termos: ['hedge', 'b3', 'put', 'protecao'] },
  cdi: { nome: 'Renda fixa (CDI)', url: 'index.html', hash: 'cdi', termos: ['cdi', 'renda fixa'] },
  calendario: { nome: 'Calendário', url: 'index.html', hash: 'calendario', termos: ['calendario', 'alertas', 'agenda'] },
  simulacoes: { nome: 'Simulações', url: 'index.html', hash: 'simulacoes', termos: ['simulacoes', 'historico', 'minhas simulacoes', 'salvas'] },
  fontes: { nome: 'Fontes & método', url: 'index.html', hash: 'fontes', termos: ['fontes', 'metodo'] },
  regiao: { nome: 'Região & logística', url: 'index.html', hash: 'regiao', termos: ['regiao', 'logistica', 'frete', 'fretes', 'frigorifico', 'frigorificos', 'mapa'] },
  guiado: { nome: 'Preenchimento guiado', url: 'index.html', hash: 'guiado', termos: ['preenchimento guiado', 'guiado'] },
  plantio: { nome: 'Estudo de plantio', url: 'plantio.html', hash: '', termos: ['plantio', 'lavoura', 'lavouras'] }
};

const UF_NOMES = [['mato grosso do sul', 'MS'], ['mato grosso', 'MT'], ['rio grande do sul', 'RS'], ['rio grande do norte', 'RN'], ['rio de janeiro', 'RJ'], ['minas gerais', 'MG'], ['minas', 'MG'], ['sao paulo', 'SP'], ['goias', 'GO'], ['tocantins', 'TO'], ['parana', 'PR'], ['santa catarina', 'SC'], ['bahia', 'BA'], ['maranhao', 'MA'], ['piaui', 'PI'], ['ceara', 'CE'], ['paraiba', 'PB'], ['pernambuco', 'PE'], ['alagoas', 'AL'], ['sergipe', 'SE'], ['espirito santo', 'ES'], ['distrito federal', 'DF'], ['rondonia', 'RO'], ['acre', 'AC'], ['amazonas', 'AM'], ['roraima', 'RR'], ['amapa', 'AP'], ['no para', 'PA'], ['do para', 'PA'], ['o para', 'PA']];

const NOME_UF = { MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', RS: 'Rio Grande do Sul', RN: 'Rio Grande do Norte', RJ: 'Rio de Janeiro', MG: 'Minas Gerais', SP: 'São Paulo', GO: 'Goiás', TO: 'Tocantins', PR: 'Paraná', SC: 'Santa Catarina', BA: 'Bahia', MA: 'Maranhão', PI: 'Piauí', CE: 'Ceará', PB: 'Paraíba', PE: 'Pernambuco', AL: 'Alagoas', SE: 'Sergipe', ES: 'Espírito Santo', DF: 'Distrito Federal', RO: 'Rondônia', AC: 'Acre', AM: 'Amazonas', RR: 'Roraima', AP: 'Amapá', PA: 'Pará' };

const EXTENSO = { um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, vinte: 20, trinta: 30, cinquenta: 50, cem: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };

function limpar(t) {
  const s = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().replace(/\bmeio milhao\b/g, '500 mil');
  return s.replace(new RegExp(`\\b(${Object.keys(EXTENSO).join('|')})\\s+(mil|milhao|milhoes)\\b`, 'g'), (_, n, m) => `${EXTENSO[n]} ${m}`);
}

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s*(mil|milhao|milhoes|k)\b)?`;

function lerNumero(txt, mult) {
  const s = /^\d{1,3}(\.\d{3})+/.test(txt) ? txt.replace(/\./g, '').replace(',', '.') : txt.replace(',', '.');
  return Number(s) * (mult === 'mil' || mult === 'k' ? 1e3 : mult ? 1e6 : 1);
}

const LOTE = 'lote', PAT = 'patrimonio';
const VARIOU = String.raw`(?:sub\w*|alta|aument\w*|maior|mais car\w*|ca[iu]\w*|queda|baix\w*|menor|desc\w*|mais barat\w*)`;

// A ordem importa: cada trecho reconhecido é apagado para não ser lido de novo por outra regra
const REGRAS = [
  { campos: ['cabecasFixas'], re: new RegExp(String.raw`${NUM}\s*(?:cabecas?|bois|animais|garrotes|novilhos)`) },
  { campos: ['mortalidadePct'], pct: true, re: new RegExp(String.raw`(?:mortalidade|mortes?)\D{0,12}${NUM}\s*%?`) },
  { campos: ['reservaPct'], pct: true, re: new RegExp(String.raw`reserva\D{0,12}${NUM}\s*%`) },
  { campos: ['cdiAnual'], pct: true, re: new RegExp(String.raw`(?:cdi|selic)\D{0,10}${NUM}\s*%?`) },
  { campos: ['bonificacaoArroba'], re: new RegExp(String.raw`bonificacao\D{0,12}${NUM}`) },
  { campos: ['gmdKg'], re: new RegExp(String.raw`(?:gmd|ganho(?: de peso| medio)?(?: diario)?)\D{0,8}${NUM}`) },
  { campos: ['pesoEntradaKg'], re: new RegExp(String.raw`(?:peso(?: de entrada| de compra)?|entrada)\D{0,8}${NUM}|(?:boi magro|boi|animal|garrote|novilho|magro)\s+(?:de|com)\s+${NUM}\s*(?:kg|quilos?)`) },
  { campos: ['diasCiclo'], re: new RegExp(String.raw`${NUM}\s*dias`) },
  { campos: ['horizonteAnos'], bloco: PAT, re: new RegExp(String.raw`${NUM}\s*anos`) },
  { campos: ['aporteMensal'], bloco: PAT, re: new RegExp(String.raw`aport\w*(?: mensal)?\D{0,12}${NUM}|${NUM}\s*(?:reais\s*)?(?:por mes|ao mes)`) },
  { campos: ['freteEntradaCab'], re: new RegExp(String.raw`frete de entrada\D{0,10}${NUM}`) },
  { campos: ['freteSaidaCab'], re: new RegExp(String.raw`frete de saida\D{0,10}${NUM}`) },
  { campos: ['freteEntradaCab', 'freteSaidaCab'], re: new RegExp(String.raw`frete\D{0,12}${NUM}`) },
  { campos: ['precoArrobaProduzida'], re: new RegExp(String.raw`(?:boitel|arroba produzida|hotelaria)(?:\s+(?:cobrando|custando|custar|for))?\s*(?:a|de|por|em|para)?\s*(?:r\$\s*)?${NUM}`) },
  { campos: ['precoCompraCab'], relativo: true, re: new RegExp(String.raw`(?:boi magro|reposicao|garrote|bezerro|magro|animal|compra)\D{0,28}?${VARIOU}\D{0,14}${NUM}\s*%`) },
  { campos: ['precoVendaArroba'], relativo: true, re: new RegExp(String.raw`(?:arroba|boi gordo|preco de venda|venda)\D{0,28}?${VARIOU}\D{0,14}${NUM}\s*%`) },
  { campos: ['precoCompraCab'], re: new RegExp(String.raw`(?:boi magro|reposicao|garrote|bezerro|magro|comprar|compra|animal)(?:\s+(?:por|custando|custar|for|a|de|em))*\s*(?:r\$\s*)?${NUM}`) },
  { campos: ['precoVendaArroba'], re: new RegExp(String.raw`${NUM}\s*(?:reais\s*)?(?:a|por|na)\s*arroba|(?:arroba|boi gordo|preco de venda|vender|venda)(?:\s+(?:for|por|custando|valendo|a|de|em|para|pra|=))*\s*(?:r\$\s*)?${NUM}`) }
];

const RE_CAPITAL = new RegExp(String.raw`(capital(?: inicial)?|tenho|investir|investindo|invisto|aplicar|colocar|coloco|com|usar|usando)(?:\s+(?:de|mais|uns|umas|cerca de|quase))*\s*(r\$\s*)?${NUM}`);
const RE_REAIS = new RegExp(String.raw`r\$\s*${NUM}`);
const GATILHO = /\b(simul\w*|calcul\w*|testa\w*|teste|e se|coloc\w*|muda\w*|mude|troc\w*|alter\w*|ajust\w*|refaz\w*|refaca|usa|use|usar|usando|consider\w*|faz|faca|tenho|invest\w*|se eu|supondo|imagina\w*|com)\b/;
const RE_DESFAZER = /^(desfaz\w*|desfaca|voltar? como estava|volta como era|voltar? ao que estava|cancela a simulacao|cancelar a simulacao)\b/;
const RE_ABRIR = /\b(abr[aei]\w*|mostr\w*|exib\w*|quero ver|me leva\w*|leve|levar|vai para|va para|ir para|navega\w*|entr[ae]r? (?:em|na|no)|acess\w*|ver (?:o|a|os|as)|veja (?:o|a|os|as))\b/;

function achaValor(m) {
  for (let i = 1; i < m.length; i += 2) if (m[i] !== undefined) return lerNumero(m[i], m[i + 1]);
  return NaN;
}

const caiu = m => /ca[iu]|queda|baix|menor|desc|barat/.test(m[0]);

/** Lê os valores pedidos na frase. Devolve mudanças ainda não aplicadas e avisos de valor fora da faixa. */
export function lerMudancas(frase) {
  let s = limpar(frase);
  const mudancas = [], avisos = [];
  const anotar = (bloco, campo, dados) => {
    const esq = (bloco === PAT ? ESQUEMA_PATRIMONIO : ESQUEMA_LOTE)[campo];
    if (dados.valor !== undefined && !(dados.valor >= esq.min && dados.valor <= esq.max)) {
      avisos.push(`${esq.rotulo}: o valor pedido está fora da faixa aceita, então não usei.`);
      return;
    }
    mudancas.push({ bloco, campo, rotulo: esq.rotulo, ...dados });
  };
  for (const r of REGRAS) {
    const m = s.match(r.re);
    if (!m) continue;
    const v = achaValor(m);
    if (!Number.isFinite(v)) continue;
    if (r.relativo) {
      if (v >= 100 && caiu(m)) { avisos.push('Uma queda de 100% ou mais não faz sentido, então não usei.'); s = s.replace(m[0], ' ; '); continue; }
      for (const c of r.campos) anotar(r.bloco || LOTE, c, { fator: 1 + (caiu(m) ? -v : v) / 100 });
    } else {
      for (const c of r.campos) anotar(r.bloco || LOTE, c, { valor: r.pct ? v / 100 : v });
    }
    s = s.replace(m[0], ' ; ');
  }
  const cap = s.match(RE_CAPITAL);
  if (cap) {
    const v = lerNumero(cap[3], cap[4]);
    if (cap[4] || cap[2] || v >= 10000 || /capital|tenho|invest|invisto|aplicar/.test(cap[1])) anotar(LOTE, 'capitalInicial', { valor: v });
  } else {
    const rs = s.match(RE_REAIS);
    if (rs) anotar(LOTE, 'capitalInicial', { valor: lerNumero(rs[1], rs[2]) });
  }
  if (/\b(por|na|de) diaria\b/.test(s)) mudancas.push({ bloco: LOTE, campo: 'modoCobranca', rotulo: ESQUEMA_LOTE.modoCobranca.rotulo, valor: 'diaria' });
  const cen = s.match(/\b(pessimista|otimista)\b|\bcenario base\b/);
  if (cen) mudancas.push({ bloco: 'filtros', campo: 'cenario', rotulo: 'Cenário', valor: cen[1] || 'base' });
  return { mudancas, avisos };
}

/** Classifica a frase. null = não é um pedido; vai para a base de respostas. */
export function interpretarPedido(frase) {
  const s = limpar(frase);
  if (!s) return null;
  if (RE_DESFAZER.test(s)) return { tipo: 'desfazer' };
  const lido = lerMudancas(frase);
  if ((lido.mudancas.length || lido.avisos.length) && GATILHO.test(s)) return { tipo: 'simular', ...lido };
  if (RE_ABRIR.test(s)) {
    const termos = Object.entries(PAGINAS).flatMap(([id, p]) => p.termos.map(t => [id, t])).sort((a, b) => b[1].length - a[1].length);
    const achado = termos.find(([, t]) => new RegExp(`\\b${t}\\b`).test(s));
    if (achado) return { tipo: 'abrir', pagina: achado[0] };
  }
  const uf = UF_NOMES.find(([n]) => new RegExp(`\\b${n}\\b`).test(s));
  if (uf && UFS_ESTUDO.includes(uf[1]) && /\b(boitel|arrend\w*|alug\w*|compr\w*|terra|terreno|fazenda|regiao|regioes|bom|boa|melhor|sobre|frigorific\w*|como e|confin\w*)\b/.test(s)) {
    return { tipo: 'regiao', uf: uf[1] };
  }
  return null;
}

/** Aplica as mudanças numa cópia do estado (a simulação aberta só muda se a página gravar o resultado). */
export function aplicarMudancas(estado, mudancas) {
  const novo = structuredClone(estado);
  for (const m of mudancas) {
    novo[m.bloco][m.campo] = m.fator !== undefined ? Math.round(novo[m.bloco][m.campo] * m.fator * 100) / 100 : m.valor;
  }
  return novo;
}

function descreverValor(m, estado) {
  const v = estado[m.bloco][m.campo];
  if (m.campo === 'modoCobranca') return 'por diária';
  if (m.campo === 'cenario') return String(v);
  const u = (m.bloco === PAT ? ESQUEMA_PATRIMONIO : ESQUEMA_LOTE)[m.campo]?.unidade || '';
  if (u.startsWith('fração')) return pc(v);
  if (u.startsWith('R$')) return Number.isInteger(v) ? brl(v) : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `${String(v).replace('.', ',')} ${u}`.trim();
}

/** Texto do resultado, comparando com a simulação anterior. */
export function descreverSimulacao(novoEstado, mudancas, avisos, antes, depois) {
  const l = depois.lote;
  const feitas = mudancas.map(m => `${m.rotulo}: ${descreverValor(m, novoEstado)}`).join('; ');
  const dif = antes?.lote ? l.lucroLiquido - antes.lote.lucroLiquido : null;
  const linhas = [`Simulei com ${feitas}.`,
    `Resultado: ${l.cabecas} cabeças por lote, lucro líquido de ${brl(l.lucroLiquido)} por lote${dif !== null && Math.abs(dif) >= 1 ? ` (${brl(Math.abs(dif))} ${dif > 0 ? 'a mais' : 'a menos'} que antes)` : ''} e retorno de ${pc(l.roiAnual)} ao ano.`,
    l.lucroEconomico < 0 ? `Nestas condições, o CDI rende ${brl(-l.lucroEconomico)} a mais por lote.` : `Nestas condições, o lote rende ${brl(l.lucroEconomico)} a mais que o CDI.`];
  try {
    const { modeloA, modeloC, patrimonio } = depois.val;
    const r = compararOpcoes(depois.p, modeloA, modeloC, patrimonio);
    linhas.push(`Com ${brl(r.capital)}, o maior resultado em 1 ano é: ${r.melhor.nome}, com ${brl(r.melhor.resultado)} (${pc(r.melhor.retornoSobreCapital)}).`);
  } catch { /* a comparação é um complemento */ }
  if (avisos?.length) linhas.push(avisos.join(' '));
  linhas.push('Se não gostar, diga "desfazer". É um estudo, não recomendação de investimento.');
  return linhas.join('\n');
}

/** Melhores regiões de um estado para cada opção, com dados do MAPA e do INCRA. */
export function descreverRegioes(uf, res) {
  const pat = res?.val?.patrimonio;
  const rk = rankingRegioes({ uf, raioKm: 200, pesoAbateKg: res?.lote?.animal?.pesoAbateKg ?? 464, lotacaoCabHa: pat?.lotacaoCabHa ?? 1, areaHa: pat?.areaHa ?? 100, custosAquisicaoPct: pat?.custosAquisicaoPct ?? 0.05 });
  const nome = NOME_UF[uf] || uf;
  if (!rk.boitel.length) return `Não tenho regiões de ${nome} no ranking.`;
  const [b, a, c] = [rk.boitel[0], rk.arrendar[0], rk.comprar[0]];
  const regiao = r => `${r.nome} (${r.ufs.join(', ')})`;
  return [`Em ${nome}, olhando frigoríficos com SIF em até 200 km e o valor da terra. Algumas regiões rurais do INCRA passam por mais de um estado.`,
    `Para boitel: ${regiao(b)}, com ${b.frigorificos} frigorífico(s) no raio.`,
    `Para arrendar: ${regiao(a)}, com terra a ${brl(a.med)} por hectare no INCRA.`,
    `Para comprar: ${regiao(c)}, com terra a ${brl(c.med)} por hectare no INCRA.`,
    'Preço do boi, oferta de boitéis, clima e qualidade da terra não entram nessa conta: confirme na região.'].join('\n');
}
