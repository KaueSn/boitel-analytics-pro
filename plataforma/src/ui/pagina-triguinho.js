// Página do Triguinho: conversa por texto e voz (Web Speech API do navegador).
// Respostas de assistente-base.js. A conversa fica só na memória da página.
import { verificarAcesso, LINK_PLANOS, LINK_SIMULADOR } from './acesso.js';
import { definirUsuario, lerRascunho } from './armazenamento.js';
import { estadoInicial, recalcular } from './estado.js';
import { esc } from './formato.js';
import { responder, ROTULOS } from './assistente-base.js';
import { SVG_TRIGUINHO, NOMES_ABA } from './assistente.js';
import { textoParaFala, ehComandoParar } from './voz.js';

const $ = s => document.querySelector(s);
const SUGESTOES = ['melhorOpcao', 'comecar', 'lucro', 'melhorRegiao', 'outrasAtividades', 'voz'];
const MAX_SILENCIOS = 2; // na conversa por voz, encerra depois de tanto silêncio seguido

let res = null;
let ouvinte = null;
let emConversa = false;
let falando = false;
let silencios = 0;
let vozPt = null;

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

function perguntar(texto) {
  const q = String(texto || '').trim().slice(0, 300);
  if (!q) return;
  bolha(q, 'eu');
  const r = responder(q, res?.ok ? res : null);
  const d = bolha(r.texto, 'tri');
  if (r.aba === 'guiado' || NOMES_ABA[r.aba]) {
    const a = document.createElement('a');
    a.className = 'btn-mini tri-ir';
    a.href = 'index.html#' + r.aba;
    a.textContent = r.aba === 'guiado' ? 'Abrir o preenchimento guiado →' : 'Abrir ' + NOMES_ABA[r.aba] + ' →';
    d.appendChild(document.createElement('br'));
    d.appendChild(a);
  }
  sugestoes(r.seguintes?.length ? r.seguintes : SUGESTOES);
  falar(r.texto);
}

// --- Falar (resposta em voz alta) ---
function escolherVoz() {
  const vozes = window.speechSynthesis?.getVoices?.() || [];
  vozPt = vozes.find(v => v.lang === 'pt-BR') || vozes.find(v => v.lang?.startsWith('pt')) || null;
}

function aoTerminarDeFalar() {
  if (!falando) return;
  falando = false;
  estado('Pronto para conversar');
  atualizarBotoes();
  if (emConversa) ouvir();
}

function falar(texto) {
  const lerAtivo = $('#tp-ler').checked && 'speechSynthesis' in window;
  if (!lerAtivo) {
    if (emConversa) ouvir();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(textoParaFala(texto));
  u.lang = 'pt-BR';
  if (vozPt) u.voice = vozPt;
  falando = true;
  estado('Falando…', 'falando');
  atualizarBotoes();
  u.onend = aoTerminarDeFalar;
  u.onerror = aoTerminarDeFalar;
  // Alguns navegadores não avisam o fim da fala: garante que a conversa não trave
  const limite = Math.max(4000, texto.length * 110);
  setTimeout(() => { if (falando && !window.speechSynthesis.speaking) aoTerminarDeFalar(); }, limite);
  window.speechSynthesis.speak(u);
}

function pararTudo(mensagem = 'Pronto para conversar') {
  emConversa = false;
  silencios = 0;
  $('#tp-conversa').setAttribute('aria-pressed', 'false');
  falando = false;
  try { window.speechSynthesis?.cancel(); } catch { /* opcional */ }
  if (ouvinte) { try { ouvinte.abort(); } catch { /* já parado */ } ouvinte = null; }
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
  try { window.speechSynthesis?.cancel(); } catch { /* opcional */ }
  falando = false;
  const r = new SR();
  r.lang = 'pt-BR';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let final = '';
  let erroFatal = null;
  r.onresult = e => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t; else parcial += t;
    }
    $('#tp-pergunta').value = (final + parcial).trim();
  };
  r.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') erroFatal = 'Sem permissão para usar o microfone. Libere o microfone nas configurações do navegador e tente de novo.';
    else if (e.error === 'audio-capture') erroFatal = 'Nenhum microfone encontrado neste aparelho.';
    else if (e.error === 'network') erroFatal = 'O serviço de voz do navegador não respondeu. Verifique a internet ou escreva a pergunta.';
    else if (e.error !== 'no-speech' && e.error !== 'aborted') erroFatal = 'Não consegui ouvir. Tente de novo ou escreva a pergunta.';
  };
  r.onend = () => {
    if (ouvinte !== r) return; // parado de propósito
    ouvinte = null;
    atualizarBotoes();
    if (erroFatal) { pararTudo(erroFatal); return; }
    const frase = final.trim();
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
  $('#tp-falar').disabled = !!ouvinte || emConversa;
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

  const est = lerRascunho() || estadoInicial();
  res = recalcular(est);
  $('#tp-simulacao').textContent = `"${est.nome}"`;

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
  }
  $('#tp-parar').onclick = () => pararTudo();
  $('#tp-ler').onchange = e => { if (!e.target.checked) { try { window.speechSynthesis.cancel(); } catch { /* opcional */ } if (falando) aoTerminarDeFalar(); } };
  $('#tp-form').onsubmit = e => {
    e.preventDefault();
    const v = $('#tp-pergunta').value;
    $('#tp-pergunta').value = '';
    perguntar(v);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') pararTudo(); });
  window.addEventListener('beforeunload', () => { try { window.speechSynthesis?.cancel(); } catch { /* opcional */ } });

  bolha('Olá! Eu sou o Triguinho. Pode escrever ou clicar em Falar. Pergunte, por exemplo, qual a melhor opção para o seu capital.', 'tri');
  if (res.ok === false) bolha('Sua simulação tem campos com erro. Corrija na plataforma para eu usar os seus números.', 'tri');
  sugestoes(SUGESTOES);
  $('#tp-pergunta').focus();
}

iniciar();
