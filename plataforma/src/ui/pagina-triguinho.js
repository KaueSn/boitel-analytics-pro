// Página do Triguinho: conversa por texto e voz (Web Speech API do navegador), simulações
// pedidas em frases e mini navegador com as páginas da plataforma.
// Respostas de assistente-base.js. A conversa fica só na memória da página.
import { verificarAcesso, LINK_PLANOS, LINK_SIMULADOR } from './acesso.js';
import { definirUsuario, lerRascunho, salvarRascunho } from './armazenamento.js';
import { estadoInicial, recalcular } from './estado.js';
import { esc } from './formato.js';
import { responder, ROTULOS } from './assistente-base.js';
import { SVG_TRIGUINHO, NOMES_ABA } from './assistente.js';
import { textoParaFala, resumirParaFala, dividirEmPartes, ordenarVozes, vozBasica, ehComandoParar } from './voz.js';
import { interpretarPedido, aplicarMudancas, descreverSimulacao, descreverRegioes, PAGINAS } from './triguinho-comandos.js';

const $ = s => document.querySelector(s);
const SUGESTOES = ['melhorOpcao', 'comandos', 'lucro', 'melhorRegiao', 'risco', 'ganharMais'];
const MAX_SILENCIOS = 2; // na conversa por voz, encerra depois de tanto silêncio seguido
const SILENCIO_FIM_MS = 1600; // pausa que encerra a frase: não corta quem fala devagar
const CHAVE_VOZ = 'stratum_plataforma_triguinho_voz_v1';

let est = null;
let res = null;
let ultimoId = null;
let anterior = null; // estado antes da última simulação, para desfazer
let paginaAtual = null;
let historicoNav = [];
let ouvinte = null;
let emConversa = false;
let falando = false;
let silencios = 0;
let vozPt = null;
let falaAtual = 0; // cada fala nova invalida os avisos atrasados da anterior

function estado(texto, classe = '') {
  $('#tp-estado').textContent = texto;
  $('#tp-boneco').className = 'tp-boneco ' + classe;
}

function bolha(texto, quem) {
  const d = document.createElement('div');
  d.className = 'tri-msg tri-' + quem;
  d.textContent = texto;
  $('#tp-msgs').appendChild(d);
  $('#tp-msgs').scrollTop = $('#tp-msgs').scrollHeight;
  return d;
}

function botaoNaBolha(d, rotulo, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-mini tri-ir';
  b.textContent = rotulo;
  b.onclick = aoClicar;
  d.appendChild(document.createElement('br'));
  d.appendChild(b);
  return b;
}

function sugestoes(ids) {
  $('#tp-chips').replaceChildren(...ids.filter(id => ROTULOS[id]).slice(0, 6).map(id => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-mini';
    b.textContent = ROTULOS[id];
    b.onclick = () => perguntar(ROTULOS[id]);
    return b;
  }));
}

/** A plataforma aberta no mini navegador pode ter mudado a simulação: sempre parte do rascunho atual. */
function atualizarDoRascunho() {
  est = lerRascunho() || est;
  res = recalcular(est);
}

function perguntar(texto) {
  const q = String(texto || '').trim().slice(0, 300);
  if (!q) return;
  bolha(q, 'eu');
  atualizarDoRascunho();
  const pedido = interpretarPedido(q);
  if (pedido) { executarPedido(pedido); return; }
  const r = responder(q, res?.ok ? res : null, undefined, ultimoId);
  if (r.id) ultimoId = r.id;
  const d = bolha(r.texto, 'tri');
  if (r.link) {
    const a = document.createElement('a');
    a.className = 'btn-mini tri-ir';
    a.href = r.link.href;
    a.textContent = r.link.rotulo;
    d.appendChild(document.createElement('br'));
    d.appendChild(a);
  } else if (PAGINAS[r.aba]) {
    botaoNaBolha(d, 'Ver ' + PAGINAS[r.aba].nome + ' aqui →', () => abrirPagina(r.aba));
  }
  sugestoes(r.seguintes?.length ? r.seguintes : SUGESTOES);
  falar(r.texto);
}

// --- Pedidos: simular, abrir página, regiões, desfazer ---
function executarPedido(c) {
  if (c.tipo === 'desfazer') return desfazer();
  if (c.tipo === 'abrir') {
    abrirPagina(c.pagina);
    const t = `Abri ${PAGINAS[c.pagina].nome} aqui ao lado.`;
    bolha(t, 'tri');
    return falar(t);
  }
  if (c.tipo === 'regiao') {
    const t = descreverRegioes(c.uf, res?.ok ? res : null);
    botaoNaBolha(bolha(t, 'tri'), 'Ver o ranking completo aqui →', () => abrirPagina('estudo'));
    return falar(t);
  }
  if (!c.mudancas.length) {
    const t = c.avisos.join(' ') || 'Não entendi os valores. Tente "simule com 500 mil e arroba a 320".';
    bolha(t, 'tri');
    return falar(t);
  }
  const novo = aplicarMudancas(est, c.mudancas);
  const depois = recalcular(novo);
  if (!depois.ok) {
    const t = 'Não consegui simular com esses valores: ' + (depois.erros[0]?.mensagem || 'confira os números.');
    bolha(t, 'tri');
    return falar(t);
  }
  const antes = res?.ok ? res : null;
  anterior = structuredClone(est);
  est = novo;
  res = depois;
  salvarRascunho(est);
  const t = descreverSimulacao(novo, c.mudancas, c.avisos, antes, depois);
  const d = bolha(t, 'tri');
  botaoNaBolha(d, 'Desfazer', e => { e.target.remove(); desfazer(); });
  abrirPagina(paginaAtual && paginaAtual !== 'guiado' ? paginaAtual : 'painel', true);
  sugestoes(['risco', 'ganharMais', 'melhorOpcao', 'salvar']);
  falar(t);
}

function desfazer() {
  if (!anterior) {
    const t = 'Não há simulação para desfazer.';
    bolha(t, 'tri');
    return falar(t);
  }
  est = anterior;
  anterior = null;
  res = recalcular(est);
  salvarRascunho(est);
  if (paginaAtual) abrirPagina(paginaAtual, true);
  const t = 'Pronto, voltei os valores de antes da última simulação.';
  bolha(t, 'tri');
  falar(t);
}

// --- Mini navegador: só páginas da própria plataforma ---
const enderecoDe = id => `${PAGINAS[id].url}?embutida=1${PAGINAS[id].hash ? '#' + PAGINAS[id].hash : ''}`;

function abrirPagina(id, recarregar = false) {
  if (!PAGINAS[id]) return;
  const quadro = $('#tp-nav-quadro');
  const mudou = paginaAtual !== id;
  const mesmoArquivo = paginaAtual && PAGINAS[paginaAtual].url === PAGINAS[id].url;
  if (mudou && paginaAtual) historicoNav.push(paginaAtual);
  paginaAtual = id;
  $('#tp-nav').hidden = false;
  $('#tp-app').classList.add('com-nav');
  $('#tp-nav-pagina').value = id;
  $('#tp-nav-voltar').disabled = !historicoNav.length;
  $('#tp-nav-externo').href = `${PAGINAS[id].url}${PAGINAS[id].hash ? '#' + PAGINAS[id].hash : ''}`;
  // Mesma plataforma já aberta: troca de aba sem recarregar. Valores mudaram: precisa recarregar.
  if (!mesmoArquivo) quadro.src = enderecoDe(id);
  else {
    if (mudou) quadro.contentWindow.location.hash = PAGINAS[id].hash;
    if (recarregar) quadro.contentWindow.location.reload();
  }
}

function fecharNavegador() {
  $('#tp-nav').hidden = true;
  $('#tp-app').classList.remove('com-nav');
  $('#tp-nav-quadro').src = 'about:blank';
  paginaAtual = null;
  historicoNav = [];
}

function iniciarNavegador() {
  $('#tp-nav-pagina').replaceChildren(...Object.entries(PAGINAS).map(([id, p]) => Object.assign(document.createElement('option'), { value: id, textContent: p.nome })));
  $('#tp-nav-pagina').onchange = e => abrirPagina(e.target.value);
  $('#tp-nav-recarregar').onclick = () => { if (paginaAtual) abrirPagina(paginaAtual, true); };
  $('#tp-nav-fechar').onclick = fecharNavegador;
  $('#tp-nav-voltar').onclick = () => {
    const volta = historicoNav.pop();
    if (!volta) return;
    abrirPagina(volta);
    historicoNav.pop(); // abrirPagina registrou a página de onde saímos
    $('#tp-nav-voltar').disabled = !historicoNav.length;
  };
}

// --- Falar (resposta em voz alta) ---
function escolherVoz() {
  const vozes = ordenarVozes(window.speechSynthesis?.getVoices?.());
  if (!vozes.length) return;
  let salva = null;
  try { salva = localStorage.getItem(CHAVE_VOZ); } catch { /* opcional */ }
  vozPt = vozes.find(v => v.name === salva) || vozes[0];
  $('#tp-vozes').replaceChildren(...vozes.map(v => Object.assign(document.createElement('option'), { value: v.name, textContent: v.name.replace(/^Microsoft /, '').replace(/ - Portuguese \(Brazil\)| \(Brazil\)/, '') })));
  $('#tp-vozes').value = vozPt.name;
  $('#tp-escolha-voz').hidden = false;
  atualizarDicaVoz(vozes);
}

function atualizarDicaVoz(vozes) {
  const dica = $('#tp-dica-voz');
  dica.hidden = !vozBasica(vozes[0]);
  dica.textContent = 'Este navegador só tem vozes básicas, que soam robóticas. Para uma voz mais natural e gratuita, abra esta página no Microsoft Edge ou no Google Chrome.';
}

function aoTerminarDeFalar() {
  if (!falando) return;
  falando = false;
  estado('Pronto para conversar');
  atualizarBotoes();
  if (emConversa) ouvir();
}

/** Encerra o microfone sem disparar a lógica de fim (usado quando a resposta vai ser falada). */
function largarMicrofone() {
  if (!ouvinte) return;
  const r = ouvinte;
  ouvinte = null;
  try { r.abort(); } catch { /* já parado */ }
}

function falar(texto, forcar = false) {
  const lerAtivo = (forcar || $('#tp-ler').checked) && 'speechSynthesis' in window;
  if (!lerAtivo) {
    if (emConversa) ouvir();
    return;
  }
  largarMicrofone(); // senão ele ouve a própria voz
  const id = ++falaAtual;
  const sintese = window.speechSynthesis;
  sintese.cancel();
  const partes = dividirEmPartes(resumirParaFala(textoParaFala(texto)));
  falando = true;
  estado('Falando… clique em Falar para interromper', 'falando');
  atualizarBotoes();
  const proxima = i => {
    if (id !== falaAtual) return;
    if (i >= partes.length) { aoTerminarDeFalar(); return; }
    const u = new SpeechSynthesisUtterance(partes[i]);
    u.lang = vozPt?.lang || 'pt-BR';
    if (vozPt) u.voice = vozPt;
    u.rate = 1.03;
    let feito = false;
    // Alguns navegadores não avisam o fim da fala: garante que a conversa não trave
    const limite = setTimeout(() => { if (id === falaAtual) { sintese.cancel(); seguir(); } }, 4000 + partes[i].length * 130);
    function seguir() {
      if (feito) return;
      feito = true;
      clearTimeout(limite);
      proxima(i + 1);
    }
    u.onend = seguir;
    u.onerror = seguir;
    sintese.speak(u);
  };
  setTimeout(() => proxima(0), 60); // o Chrome ignora speak() logo depois de cancel()
}

function pararTudo(mensagem = 'Pronto para conversar') {
  emConversa = false;
  silencios = 0;
  $('#tp-conversa').setAttribute('aria-pressed', 'false');
  falando = false;
  falaAtual++;
  try { window.speechSynthesis?.cancel(); } catch { /* opcional */ }
  largarMicrofone();
  estado(mensagem);
  atualizarBotoes();
}

// --- Ouvir (microfone) ---
function classeReconhecimento() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function ouvir() {
  const SR = classeReconhecimento();
  if (!SR || ouvinte) return;
  falaAtual++;
  try { window.speechSynthesis?.cancel(); } catch { /* opcional */ }
  falando = false;
  const r = new SR();
  r.lang = 'pt-BR';
  r.interimResults = true;
  // No Android o modo contínuo repete o texto; lá o próprio navegador encerra a frase
  r.continuous = !/Android/i.test(navigator.userAgent);
  r.maxAlternatives = 1;
  let final = '';
  let parcial = '';
  let erroFatal = null;
  let fimDaFrase = null;
  r.onresult = e => {
    parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t; else parcial += t;
    }
    $('#tp-pergunta').value = (final + parcial).trim();
    if (r.continuous) {
      clearTimeout(fimDaFrase);
      fimDaFrase = setTimeout(() => { try { r.stop(); } catch { /* já parado */ } }, SILENCIO_FIM_MS);
    }
  };
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') erroFatal = 'Sem permissão para usar o microfone. Libere o microfone nas configurações do navegador e tente de novo.';
    else if (e.error === 'audio-capture') erroFatal = 'Nenhum microfone encontrado neste aparelho.';
    else if (e.error === 'network') erroFatal = 'O serviço de voz do navegador não respondeu. Verifique a internet ou escreva a pergunta.';
    else if (e.error !== 'no-speech' && e.error !== 'aborted') erroFatal = 'Não consegui ouvir. Tente de novo ou escreva a pergunta.';
  };
  r.onend = () => {
    clearTimeout(fimDaFrase);
    if (ouvinte !== r) return; // parado de propósito
    ouvinte = null;
    atualizarBotoes();
    if (erroFatal) { pararTudo(erroFatal); return; }
    // Às vezes o navegador termina sem marcar o texto como final: aproveita o parcial
    const frase = (final + ' ' + parcial).trim();
    $('#tp-pergunta').value = '';
    if (frase) {
      silencios = 0;
      estado('Pronto para conversar');
      if (emConversa && ehComandoParar(frase)) { pararTudo('Conversa encerrada.'); return; }
      perguntar(frase);
      return;
    }
    if (emConversa && ++silencios <= MAX_SILENCIOS) { ouvir(); return; }
    pararTudo(emConversa ? 'Encerrei a conversa porque não ouvi nada. Clique para retomar.' : 'Não ouvi nada. Clique em Falar e tente de novo.');
  };
  ouvinte = r;
  try {
    r.start();
    estado('Ouvindo… pode falar', 'ouvindo');
  } catch {
    ouvinte = null;
    pararTudo('Não consegui ligar o microfone. Tente de novo.');
    return;
  }
  atualizarBotoes();
}

function atualizarBotoes() {
  const ativo = !!ouvinte || falando || emConversa;
  $('#tp-parar').hidden = !ativo;
  // Enquanto ele fala, Falar interrompe e passa a ouvir
  $('#tp-falar').disabled = !!ouvinte || (emConversa && !falando);
  $('#tp-conversa').textContent = emConversa ? 'Conversa por voz ligada' : 'Conversa por voz';
}

function bloquear(titulo, texto, link, rotulo) {
  const b = $('#bloqueio');
  b.hidden = false;
  b.innerHTML = `<div class="cartao bloqueio"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${link ? `<a class="btn" href="${esc(link)}">${esc(rotulo)}</a>` : ''}</div>`;
}

async function iniciar() {
  const acesso = await verificarAcesso();
  if (acesso.modo === 'sem_login') return bloquear('Entre na sua conta', 'O Triguinho faz parte do plano Pro. Entre no simulador e volte para esta página.', LINK_SIMULADOR, 'Entrar no simulador');
  if (acesso.modo === 'sem_plano') return bloquear('Recurso do plano Pro', 'Sua conta está ativa, mas a conversa com o Triguinho é exclusiva do plano Pro.', LINK_PLANOS, 'Ver o plano Pro');
  if (acesso.modo === 'erro') return bloquear('Não foi possível verificar o acesso', acesso.mensagem, '', '');
  definirUsuario(acesso.usuario?.uid || null);
  $('#usuario').textContent = acesso.modo === 'local' ? 'modo local (desenvolvimento)' : (acesso.usuario.nome || acesso.usuario.email);
  $('#bloqueio').hidden = true;
  $('#tp-app').hidden = false;
  $('#tp-boneco').innerHTML = SVG_TRIGUINHO;

  est = lerRascunho() || estadoInicial();
  res = recalcular(est);
  $('#tp-simulacao').textContent = `"${est.nome}"`;
  iniciarNavegador();

  if (classeReconhecimento()) {
    $('#tp-falar').onclick = () => { silencios = 0; ouvir(); };
    $('#tp-conversa').onclick = () => {
      if (emConversa) { pararTudo(); return; }
      emConversa = true;
      silencios = 0;
      $('#tp-conversa').setAttribute('aria-pressed', 'true');
      atualizarBotoes();
      ouvir();
    };
  } else {
    $('#tp-falar').disabled = true;
    $('#tp-conversa').disabled = true;
    $('#tp-sem-voz').hidden = false;
    $('#tp-sem-voz').textContent = 'Este navegador não reconhece voz. Use o Chrome ou o Edge para falar, ou escreva a pergunta.';
  }
  if (!('speechSynthesis' in window)) {
    $('#tp-ler').checked = false;
    $('#tp-ler').disabled = true;
  } else {
    escolherVoz();
    window.speechSynthesis.onvoiceschanged = escolherVoz;
    $('#tp-vozes').onchange = e => {
      vozPt = ordenarVozes(window.speechSynthesis.getVoices()).find(v => v.name === e.target.value) || vozPt;
      try { localStorage.setItem(CHAVE_VOZ, e.target.value); } catch { /* opcional */ }
    };
    $('#tp-ouvir').onclick = () => falar('Olá, eu sou o Triguinho. Esta é a voz que vou usar para responder.', true);
  }
  $('#tp-parar').onclick = () => pararTudo();
  $('#tp-ler').onchange = e => { if (!e.target.checked) { falaAtual++; try { window.speechSynthesis.cancel(); } catch { /* opcional */ } if (falando) aoTerminarDeFalar(); } };
  $('#tp-form').onsubmit = e => {
    e.preventDefault();
    const v = $('#tp-pergunta').value;
    $('#tp-pergunta').value = '';
    perguntar(v);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') pararTudo(); });
  window.addEventListener('beforeunload', () => { try { window.speechSynthesis?.cancel(); } catch { /* opcional */ } });

  bolha('Olá! Eu sou o Triguinho. Pergunte o que quiser, peça uma simulação ("simule com 500 mil e arroba a 320") ou uma página ("mostre os cenários").', 'tri');
  if (res.ok === false) bolha('Sua simulação tem campos com erro. Corrija na plataforma para eu usar os seus números.', 'tri');
  sugestoes(SUGESTOES);
  $('#tp-pergunta').focus();
}

iniciar();
