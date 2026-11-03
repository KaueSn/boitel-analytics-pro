// Página de plantio e outras atividades: formulário sem valores prontos, resultado por hectare e
// comparação com a pecuária e o CDI. O rascunho fica só neste navegador.
import { verificarAcesso, LINK_PLANOS, LINK_SIMULADOR } from './acesso.js';
import { definirUsuario, lerRascunho } from './armazenamento.js';
import { estadoInicial, recalcular } from './estado.js';
import { esc, moeda, num, pct, sinal, aviso, kpi, tabela } from './formato.js';
import { marcarErros } from './formulario.js';
import { grafico, paleta } from './graficos.js';
import { ATIVIDADES, CULTURAS, culturaPorId, camposDaCultura, compararComPecuaria, sensibilidadeLavoura, referenciaTerra } from '../engine/lavoura.js';
import { MUNICIPIOS } from '../engine/municipios.js';
import { UFS_ESTUDO, cdiLiquidoAno } from '../engine/estudo.js';

document.body.classList.toggle('embutida', new URLSearchParams(location.search).has('embutida'));
const $ = s => document.querySelector(s);
const CHAVE = 'stratum_plantio_rascunho_v1';

// Fontes para consultar. Só a tabela do Zarc e a do Sicor têm licença aberta confirmada; nenhum valor é copiado.
const FONTES = [
  { nome: 'IBGE: Produção Agrícola Municipal (tabela 5457)', o: 'Produtividade, área e valor da produção por município, para comparar com o seu número', url: 'https://sidra.ibge.gov.br/tabela/5457' },
  { nome: 'MAPA: Zarc, tábua de risco', o: 'Risco climático por município, solo, ciclo e período de plantio', url: 'https://dados.agricultura.gov.br/dataset/tabua-de-risco-zoneamento-agricola-de-risco-climatico' },
  { nome: 'Conab: planilhas de custos de produção', o: 'Custo por cultura e região, para conferir o que você digitou', url: 'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/custos-de-producao/planilhas-de-custos-de-producao' },
  { nome: 'Banco Central: crédito rural (Sicor)', o: 'Custeio financiado e área por produto e município. É o valor financiado, não o custo total', url: 'https://dadosabertos.bcb.gov.br/dataset/matrizdadoscreditorural' },
  { nome: 'CEPEA/ESALQ: indicadores', o: 'Preços de soja, milho, café e outros produtos', url: 'https://www.cepea.org.br/br/indicador/soja.aspx' }
];

const GRUPOS = [
  { titulo: 'Produção e venda', campos: [
    ['areaHa', 'Área', 'ha'],
    ['produtividade', 'Produtividade esperada', c => `${c.unidade} por ha`],
    ['preco', 'Preço de venda', c => `R$ por ${c.unidade}`],
    ['custoVenda', 'Frete e venda', c => `R$ por ${c.unidade}`, 'Frete, armazenagem e comissão. Deixe vazio se já estiver em outros custos.'],
    ['ciclos', 'Ciclos por ano', 'número', 'Quantos plantios a mesma área faz no ano. Os valores de produção e custo acima e abaixo são de 1 ciclo.'],
    ['mesesCapital', 'Meses com o dinheiro na lavoura', 'de 1 a 12', 'Do primeiro gasto até receber a venda. Nos outros meses o dinheiro rende CDI.']
  ] },
  { titulo: 'Custos por hectare', campos: [
    ['insumos', 'Insumos', 'R$/ha', 'Sementes ou mudas, adubo e defensivos.'],
    ['operacoes', 'Máquinas e operações', 'R$/ha', 'Próprias ou contratadas, com combustível e manutenção.'],
    ['maoDeObra', 'Mão de obra', 'R$/ha'],
    ['outros', 'Outros custos', 'R$/ha', 'Seguro, juros do custeio, assistência técnica, administração.'],
    ['arrendamento', 'Arrendamento', 'R$/ha por ano', 'Deixe vazio se a terra já for sua.']
  ] },
  { titulo: 'Formação da lavoura', campos: [
    ['implantacao', 'Implantação', 'R$/ha', 'Preparo do solo, mudas e plantio.'],
    ['manutencaoFormacao', 'Manutenção antes da primeira colheita', 'R$/ha por ano'],
    ['anosFormacao', 'Anos sem colheita', 'anos', 'Anos inteiros até a primeira colheita. Use 0 se colher já no primeiro ano.'],
    ['vidaUtilAnos', 'Vida útil da lavoura', 'anos', 'Do plantio até renovar, contando os anos sem colheita.']
  ] },
  { titulo: 'Gado na entressafra', campos: [
    ['lotacao', 'Lotação', 'cab/ha'],
    ['compraCab', 'Compra', 'R$/cab'],
    ['vendaCab', 'Venda', 'R$/cab'],
    ['custoCab', 'Custo da fase', 'R$/cab', 'Suplemento, sanidade, cerca, água, frete.'],
    ['mesesGado', 'Meses com o gado', 'de 1 a 12', 'Somados aos meses da lavoura, não passam de 12.']
  ] },
  { titulo: 'Máquinas e benfeitorias (opcional)', campos: [
    ['investimento', 'Valor a comprar', 'R$', 'Só o que precisa comprar para esta área. Deixe vazio se usar serviço contratado.'],
    ['vidaInvestimentoAnos', 'Vida útil', 'anos', 'O valor é dividido por estes anos como custo anual.']
  ] }
];

let res = null;
let dados = {};
let chaveRascunho = CHAVE;
let timer = null;

const lerDados = () => { try { return JSON.parse(localStorage.getItem(chaveRascunho) || '{}') || {}; } catch { return {}; } };
const gravarDados = () => { try { localStorage.setItem(chaveRascunho, JSON.stringify(dados)); } catch { /* sem armazenamento: segue sem rascunho */ } };

function campoHTML([campo, rotulo, un, nota], cultura) {
  const unidade = typeof un === 'function' ? un(cultura) : un;
  return `<div class="campo"><label for="pl-${campo}">${esc(rotulo)} <span class="un">(${esc(unidade)})</span></label>
    <input type="number" inputmode="decimal" step="any" min="0" id="pl-${campo}" data-campo="${campo}" value="${esc(dados[campo] ?? '')}">
    ${nota ? `<small class="nota">${esc(nota)}</small>` : ''}</div>`;
}

function montarFormulario() {
  const cultura = culturaPorId(dados.cultura);
  const pedidos = new Set(camposDaCultura(dados.cultura));
  const uf = dados.uf || '';
  const cidades = uf ? MUNICIPIOS.filter(m => m[4] === uf).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')) : [];
  const grupos = cultura ? GRUPOS.map(g => ({ ...g, campos: g.campos.filter(c => pedidos.has(c[0])) })).filter(g => g.campos.length) : [];
  $('#pl-form').innerHTML = `
    <section class="cartao"><h3>O que, onde e com quanto</h3>
      <div class="grade-campos">
        <div class="campo"><label for="pl-cultura">Cultura</label><select id="pl-cultura" data-campo="cultura"><option value="">Escolha…</option>
          ${Object.entries(ATIVIDADES).map(([id, a]) => `<optgroup label="${esc(a.nome)}">${CULTURAS.filter(c => c.atividade === id).map(c => `<option value="${c.id}"${c.id === dados.cultura ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>`).join('')}
        </select></div>
        <div class="campo"><label for="pl-uf">Estado</label><select id="pl-uf" data-campo="uf"><option value="">Escolha…</option>${UFS_ESTUDO.map(u => `<option value="${u}"${u === uf ? ' selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="campo"><label for="pl-municipio">Município</label><select id="pl-municipio" data-campo="municipio"${uf ? '' : ' disabled'}><option value="">${uf ? 'Escolha…' : 'Escolha o estado antes'}</option>${cidades.map(m => `<option value="${m[0]}"${String(m[0]) === String(dados.municipio) ? ' selected' : ''}>${esc(m[1])}</option>`).join('')}</select></div>
        <div class="campo"><label for="pl-capital">Capital disponível <span class="un">(R$)</span></label><input type="number" inputmode="decimal" step="any" min="0" id="pl-capital" data-campo="capital" value="${esc(dados.capital ?? '')}"><small class="nota">Começa com o capital da sua simulação de pecuária. Todas as opções usam este valor.</small></div>
      </div>
    </section>
    ${cultura?.atividade && ATIVIDADES[cultura.atividade].tipo === 'perene' ? `<section class="cartao">${aviso('Lavoura de vários anos: os custos e a produtividade abaixo são de um ano normal em produção. O resultado é a média por ano em toda a vida da lavoura, contando os anos sem colheita.', 'info')}</section>` : ''}
    ${grupos.map(g => `<fieldset class="grupo cartao"><legend>${esc(g.titulo)}</legend><div class="grade-campos">${g.campos.map(c => campoHTML(c, cultura)).join('')}</div></fieldset>`).join('')}`;
}

function pendencias(erros) {
  const faltam = [];
  if (!culturaPorId(dados.cultura)) return ['Escolha a cultura.'];
  if (!dados.uf) faltam.push('Escolha o estado.');
  else if (!dados.municipio) faltam.push('Escolha o município.');
  if (!(Number(dados.capital) > 0)) faltam.push('Informe o capital disponível.');
  return [...faltam, ...erros.map(e => e.mensagem)];
}

function veredito(r) {
  const e = r.estudo;
  const nome = esc(e.cultura.nome);
  if (!e.viavel) {
    return `Com ${moeda(r.capital)} e a reserva de ${pct(1 - e.disponivel / r.capital, 0)}, <b>${nome} em ${num(e.areaHa, 1)} ha não cabe no capital</b>: precisa de ${moeda(e.capitalMinimo)}. Com estes custos, cabem cerca de ${num(e.areaMaxima, 1)} ha.`;
  }
  const cdi = r.diferencaCdi >= 0 ? `${moeda(r.diferencaCdi)} a mais que a renda fixa` : `${moeda(-r.diferencaCdi)} a menos que a renda fixa`;
  const pec = r.melhorPecuaria ? (r.diferencaPecuaria >= 0 ? `${moeda(r.diferencaPecuaria)} a mais que a melhor opção de pecuária (${esc(r.melhorPecuaria.nome)})` : `${moeda(-r.diferencaPecuaria)} a menos que a melhor opção de pecuária (${esc(r.melhorPecuaria.nome)})`) : 'nenhuma opção de pecuária cabe neste capital';
  return `Com ${moeda(r.capital)} e os números informados, <b>${nome}</b> daria <b class="${sinal(e.resultado)}">${moeda(e.resultado)} no ano</b> (${pct(e.retornoSobreCapital)} sobre o capital): ${cdi} e ${pec}.`;
}

function cartaoPerene(e) {
  const v = e.perene;
  return `<section class="cartao"><h3>O caminho até a primeira colheita</h3>
    <div class="kpis">
      ${kpi('Primeira colheita', `${num(v.primeiraColheitaAno)}º ano`)}
      ${kpi('Caixa do 1º ano', `<span class="${sinal(v.caixaAno1Ha)}">${moeda(v.caixaAno1Ha * e.areaHa)}</span>`, { sub: `${moeda(v.caixaAno1Ha)}/ha` })}
      ${kpi('Resultado de um ano em produção', `<span class="${sinal(v.margemProducaoHa)}">${moeda(v.margemProducaoHa)}/ha</span>`, { sub: 'Antes de IR' })}
      ${kpi('Formação recuperada em', v.anosParaRecuperar === null ? 'Não recupera' : `${num(v.anosParaRecuperar, 1)} anos`, { sub: 'Sem juros' })}
    </div>
    ${aviso('A comparação usa a média anual da vida toda e não desconta o tempo de espera. Nos primeiros anos, a conta real é a de cima: o dinheiro sai antes de voltar, e a lavoura não vira dinheiro rápido como um lote de bois ou uma aplicação.')}
  </section>`;
}

function renderResultados() {
  const el = $('#pl-res');
  const { modeloA: pA, modeloC: pC, patrimonio: pPat } = res.val;
  const capital = Number(dados.capital);
  const r = compararComPecuaria(dados, res.p, pA, pC, pPat, capital > 0 ? capital : res.p.capitalInicial);
  const faltam = pendencias(r.ok ? [] : r.erros);
  marcarErros($('#pl-form'), dados.cultura && !r.ok ? r.erros.filter(e => dados[e.campo] !== undefined && dados[e.campo] !== '') : []);
  if (faltam.length) {
    el.innerHTML = `<section class="cartao"><h3>Para calcular, falta:</h3><ul class="lista">${faltam.map(f => `<li>${esc(f)}</li>`).join('')}</ul></section>${fontesHTML()}`;
    return;
  }
  const e = r.estudo;
  const un = e.cultura.unidade;
  const terra = referenciaTerra(dados.municipio);
  const cidade = MUNICIPIOS.find(m => String(m[0]) === String(dados.municipio));
  const sens = sensibilidadeLavoura(dados, res.p, capital);
  el.innerHTML = `
    <section class="cartao destaque"><h3>Vale mais a pena?</h3>
      <p>${veredito(r)}</p>
      <p class="nota">Região: ${esc(cidade?.[1] || '')}/${esc(dados.uf)}. Todos os valores são os que você digitou; a região só entra na referência de terra abaixo. Clima, solo e crédito não entram na conta.</p>
    </section>

    <section class="cartao"><h3>Resultado por hectare</h3>
      <div class="kpis">
        ${kpi('Receita por ha', moeda(e.porHa.receita), { sub: e.perene ? 'Média por ano da vida' : 'No ano' })}
        ${kpi('Resultado antes de IR', `<span class="${sinal(e.porHa.resultadoOperacional)}">${moeda(e.porHa.resultadoOperacional)}/ha</span>`, { sub: `Total ${moeda(e.lucroOperacional)}` })}
        ${kpi('Resultado depois de IR', `<span class="${sinal(e.porHa.resultado)}">${moeda(e.porHa.resultado)}/ha</span>`, { sub: `Total ${moeda(e.lucro)}` })}
        ${kpi('Capital na atividade', moeda(e.capitalEmpregado), { sub: `${moeda(e.porHa.capital)}/ha sem máquinas` })}
        ${kpi('Preço de equilíbrio', e.precoEquilibrio === null ? '—' : moeda(e.precoEquilibrio, 2), { sub: `por ${esc(un)}, você informou ${moeda(e.entrada.preco, 2)}` })}
        ${kpi('Produtividade de equilíbrio', e.produtividadeEquilibrio === null ? 'Não há' : num(e.produtividadeEquilibrio, 1), { sub: `${esc(un)} por ha, você informou ${num(e.entrada.produtividade, 1)}` })}
      </div>
      <p class="nota">Inclui Funrural de ${pct(res.p.funruralPct)} e IR com o regime das premissas da pecuária, para comparar nas mesmas condições.${e.depreciacaoAno > 0 ? ` Inclui ${moeda(e.depreciacaoAno)} por ano de máquinas e benfeitorias.` : ''} Equilíbrio = resultado antes de IR igual a zero.</p>
      ${terra ? `<p>Terra na região (${esc(terra.nome)}): VTN médio de ${moeda(terra.vtnMedio)}/ha e teto estimado do arrendamento de ${moeda(terra.tetoArrendamentoHa)}/ha por ano. <small>INCRA, Pauta de Valores 2026; teto de 15% do Estatuto da Terra. O VTN aproxima o valor cadastral.</small></p>` : ''}
      ${terra && e.entrada.arrendamento > terra.tetoArrendamentoHa ? aviso('O arrendamento digitado passa do teto estimado de 15%. A lei admite até 30% em glebas de exploração intensiva: confira o contrato com orientação jurídica.', 'info') : ''}
    </section>

    ${e.perene ? cartaoPerene(e) : ''}

    <section class="cartao"><h3>Comparação com a pecuária e o CDI, com ${moeda(r.capital)}</h3>
      ${tabela(['Opção', 'Situação', 'Capital na operação', 'Resultado da operação', 'Dinheiro parado (CDI)', 'Resultado no ano', 'Sobre o capital'],
        r.linhas.map(l => [
          `<b>${esc(l.nome)}</b>${l.id === r.melhor.id ? ' <span class="selo selo-pesquisado">maior resultado</span>' : ''}<br><small>${esc(l.oQue)}</small>`,
          l.viavel ? 'Cabe no capital' : '<span class="neg">Não cabe</span>',
          l.viavel ? moeda(l.capitalEmpregado) : '—',
          l.viavel && l.id !== 'cdi' ? `<span class="${sinal(l.lucroAnual)}">${moeda(l.lucroAnual)}</span>` : '—',
          l.viavel ? moeda(l.rendimentoParado) : '—',
          l.viavel ? `<b class="${sinal(l.resultado)}">${moeda(l.resultado)}</b>` : '—',
          l.viavel ? pct(l.retornoSobreCapital) : '—'
        ]))}
      <p class="nota">Conta de 1 ano com o mesmo capital para todas as opções: resultado da operação + dinheiro parado rendendo CDI líquido (${pct(cdiLiquidoAno(res.p.cdiAnual))} ao ano). Na lavoura, o dinheiro também rende nos meses fora da atividade. A pecuária usa as premissas da <a href="index.html#estudo">sua simulação</a>${res.cenario !== 'base' ? `, no cenário ${esc(res.cenario)}` : ''}; confira se os preços dela estão atualizados.</p>
      <div class="graf"><canvas id="g-plantio"></canvas></div>
    </section>

    <section class="cartao"><h3>E se a safra ou o preço decepcionarem?</h3>
      ${tabela(['Situação', 'Depois de IR, por ha', 'Depois de IR, total', 'Resultado no ano, com CDI'], sens.map(s => [
        esc(s.nome), `<span class="${sinal(s.porHa)}">${moeda(s.porHa)}</span>`, `<span class="${sinal(s.lucro)}">${moeda(s.lucro)}</span>`, e.viavel ? `<b class="${sinal(s.resultado)}">${moeda(s.resultado)}</b>` : '—'
      ]))}
      <p class="nota">A queda de 20% é só um teste, não uma previsão. Compare com o risco do seu município no Zarc.</p>
    </section>

    <section class="cartao"><h3>O que esta conta não mostra</h3>
      <ul class="lista">
        <li>Clima, solo, pragas e janela de plantio: confira o Zarc antes de escolher a data e o seguro.</li>
        <li>Conhecimento e estrutura: máquinas, armazém, equipe e comprador para a produção mudam o resultado real.</li>
        <li>Valorização ou perda de valor da terra e venda da lavoura formada.</li>
        <li>Duas safras no mesmo ano: estude cada uma e some, ou use os ciclos em hortifrúti.</li>
        <li>Crédito rural: juros do custeio entram só se você somar em outros custos.</li>
      </ul>
    </section>
    ${fontesHTML()}`;
  const c = paleta();
  const vis = r.linhas.filter(l => l.viavel);
  grafico('g-plantio', {
    type: 'bar', moedaEixo: 'y',
    data: { labels: vis.map(l => l.nome), datasets: [{ label: 'Resultado no ano', data: vis.map(l => l.resultado), backgroundColor: vis.map(l => (l.id === 'atividade' ? c.serie[0] : l.id === 'cdi' ? c.serie[1] : l.resultado >= 0 ? c.pos : c.neg)) }] },
    options: { plugins: { legend: { display: false } } }
  });
}

function fontesHTML() {
  return `<details class="cartao" open><summary>Onde consultar os números da sua região</summary>
    <ul class="lista">${FONTES.map(f => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}</a>: ${esc(f.o)}.</li>`).join('')}</ul>
    <p class="nota">Links para as fontes originais. A plataforma é paga, então não copia estes valores para dentro da página: consulte e digite. Confira as condições de uso de cada fonte.</p>
  </details>`;
}

function ligarFormulario() {
  const form = $('#pl-form');
  form.addEventListener('input', ev => {
    const campo = ev.target.dataset?.campo;
    if (!campo) return;
    dados[campo] = ev.target.value;
    if (ev.target.tagName === 'SELECT') {
      if (campo === 'uf') dados.municipio = '';
      gravarDados();
      montarFormulario();
      renderResultados();
      document.getElementById('pl-' + campo)?.focus();
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => { gravarDados(); renderResultados(); }, 250);
  });
}

function bloquear(titulo, texto, link, rotulo) {
  const b = $('#bloqueio');
  b.hidden = false;
  b.innerHTML = `<div class="cartao bloqueio"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${link ? `<a class="btn" href="${esc(link)}">${esc(rotulo)}</a>` : ''}</div>`;
}

async function iniciar() {
  const acesso = await verificarAcesso();
  if (acesso.modo === 'sem_login') return bloquear('Entre na sua conta', 'A Plataforma Patrimonial faz parte do plano Pro. Entre no simulador e volte para esta página.', LINK_SIMULADOR, 'Entrar no simulador');
  if (acesso.modo === 'sem_plano') return bloquear('Recurso do plano Pro', 'Sua conta está ativa, mas o estudo de plantio é exclusivo do plano Pro.', LINK_PLANOS, 'Ver o plano Pro');
  if (acesso.modo === 'erro') return bloquear('Não foi possível verificar o acesso', acesso.mensagem, '', '');
  definirUsuario(acesso.usuario?.uid || null);
  chaveRascunho = CHAVE + (acesso.usuario?.uid ? '_' + String(acesso.usuario.uid).replace(/[^a-zA-Z0-9@._-]/g, '') : '');
  $('#usuario').textContent = acesso.modo === 'local' ? 'modo local (desenvolvimento)' : acesso.usuario.nome || acesso.usuario.email;
  const estado = lerRascunho() || estadoInicial();
  res = recalcular(estado);
  if (!res.ok) res = recalcular(estadoInicial());
  res.cenario = estado.filtros.cenario;
  dados = lerDados();
  dados.capital ??= res.p.capitalInicial;
  $('#bloqueio').hidden = true;
  $('#pl-app').hidden = false;
  montarFormulario();
  ligarFormulario();
  renderResultados();
}

iniciar();
