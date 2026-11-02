// Orquestração da interface: acesso, filtros, abas, recálculo e rascunho.
import { estadoInicial, recalcular } from './estado.js';
import { esc, aviso } from './formato.js';
import { marcarErros } from './formulario.js';
import { verificarAcesso, LINK_PLANOS, LINK_SIMULADOR } from './acesso.js';
import { definirUsuario, salvarRascunho, lerRascunho, usarArmazenamento } from './armazenamento.js';
import { criarArmazenamentoConta } from './armazenamento-conta.js';
import { guiaHTML } from './ajuda.js';
import { iniciarAssistente } from './assistente.js';
import { abrirGuiado } from './guiado.js';
import { REGIOES } from '../engine/mercado.js';
import * as A from './abas-analise.js';
import * as P from './abas-planejamento.js';
import * as G from './abas-gestao.js';
import * as RG from './abas-regiao.js';

const ABAS = [
  ['painel', 'Painel', A.painel], ['premissas', 'Premissas', G.premissas], ['regiao', 'Região & logística', RG.regiao], ['lote', 'Lote & zootecnia', A.lote],
  ['modelos', 'Modelos A/B/C', A.modelos], ['patrimonio', 'Patrimônio', P.patrimonio], ['caminhos', 'Caminhos & objetivo', P.caminhos],
  ['cenarios', 'Cenários & sensibilidade', A.cenarios], ['hedge', 'Hedge B3', P.hedge], ['cdi', 'Renda fixa (CDI)', P.cdi],
  ['calendario', 'Calendário & alertas', P.calendario], ['simulacoes', 'Simulações', G.simulacoes], ['fontes', 'Fontes & método', G.fontes]
];

let estado = estadoInicial();
let res = null;
let abaAtual = 'painel';
let idAberto = null;
let timer = null;

const $ = s => document.querySelector(s);

const ctx = {
  get estado() { return estado; },
  get res() { return res; },
  atualizar(bloco, campo, valor) { estado[bloco][campo] = valor; agendar(); },
  recalcular: () => agendar(),
  recarregarAba: () => { calcularAgora(); montarAba(); sincronizarFiltros(); },
  salvarRascunho: () => salvarRascunho(estado),
  idAberto(v) { if (v !== undefined) idAberto = v; return idAberto; },
  abrirEstado(novo, id) { estado = novo; idAberto = id; ctx.recarregarAba(); },
  calcular: e => recalcular(e),
  abrirGuiado: () => abrirGuiado(ctx),
  irParaAba(id) {
    if (!ABAS.some(a => a[0] === id)) return;
    abaAtual = id;
    montarAba();
    document.getElementById('conteudo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function agendar() {
  clearTimeout(timer);
  timer = setTimeout(() => { calcularAgora(); renderResultados(); }, 250);
}

function calcularAgora() {
  res = recalcular(estado);
  salvarRascunho(estado);
  const box = $('#erros');
  if (!res.ok) {
    box.innerHTML = aviso('Corrija para recalcular: ' + res.erros.map(e => e.mensagem).join(' · '), 'critico');
    document.querySelectorAll('#aba-forms').forEach(f => marcarErros(f, res.erros));
  } else {
    box.innerHTML = '';
    document.querySelectorAll('#aba-forms').forEach(f => marcarErros(f, []));
  }
}

function renderResultados() {
  const aba = ABAS.find(a => a[0] === abaAtual)[2];
  const el = $('#aba-res');
  if (!res?.ok || !aba.resultados) { el.innerHTML = ''; return; }
  try {
    aba.resultados(el, ctx);
  } catch (e) {
    console.error(e);
    el.innerHTML = aviso('Erro ao exibir esta aba. Revise as premissas; se persistir, exporte a simulação e reporte.', 'critico');
  }
}

function montarAba() {
  const aba = ABAS.find(a => a[0] === abaAtual)[2];
  document.querySelectorAll('.aba-btn').forEach(b => {
    const ativo = b.dataset.aba === abaAtual;
    b.classList.toggle('ativo', ativo);
    b.setAttribute('aria-selected', String(ativo));
    b.tabIndex = ativo ? 0 : -1;
  });
  const forms = $('#aba-forms');
  forms.innerHTML = '';
  forms.onchange = forms.oninput = null;
  if (aba.forms) aba.forms(forms, ctx);
  forms.insertAdjacentHTML('afterbegin', guiaHTML(abaAtual));
  if (res && !res.ok) marcarErros(forms, res.erros);
  renderResultados();
  $('#conteudo').setAttribute('aria-labelledby', 'tab-' + abaAtual);
}

function sincronizarFiltros() {
  $('#f-regiao').value = estado.filtros.regiao;
  $('#f-cenario').value = estado.filtros.cenario;
  $('#f-modelo').value = estado.filtros.modelo;
  $('#f-horizonte').value = estado.patrimonio.horizonteAnos;
  $('#f-lote').value = estado.lote.cabecasFixas;
  $('#nome-aberto').textContent = estado.nome;
}

function montarFiltros() {
  $('#f-regiao').innerHTML = Object.entries(REGIOES).map(([k, r]) => `<option value="${k}">${esc(r.nome)}</option>`).join('');
  const ligar = (sel, fn) => $(sel).addEventListener('change', e => { fn(e.target.value); ctx.recarregarAba(); });
  ligar('#f-regiao', v => { estado.filtros.regiao = v; });
  ligar('#f-cenario', v => { estado.filtros.cenario = v; });
  ligar('#f-modelo', v => { estado.filtros.modelo = v; });
  ligar('#f-horizonte', v => { estado.patrimonio.horizonteAnos = Number(v); });
  ligar('#f-lote', v => { estado.lote.cabecasFixas = Number(v) || 0; });
  sincronizarFiltros();
}

function montarAbas() {
  const nav = $('#abas');
  nav.innerHTML = ABAS.map(([id, nome]) => `<button role="tab" class="aba-btn" id="tab-${id}" data-aba="${id}" aria-controls="conteudo">${esc(nome)}</button>`).join('');
  nav.onclick = e => {
    const b = e.target.closest('.aba-btn');
    if (!b) return;
    abaAtual = b.dataset.aba;
    try { sessionStorage.setItem('stratum_plataforma_aba', abaAtual); } catch { /* opcional */ }
    montarAba();
  };
  nav.onkeydown = e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const i = ABAS.findIndex(a => a[0] === abaAtual);
    const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length;
    abaAtual = ABAS[j][0];
    montarAba();
    $('#tab-' + abaAtual).focus();
  };
}

function bloquear(titulo, texto, link, rotulo) {
  $('#app').hidden = true;
  const b = $('#bloqueio');
  b.hidden = false;
  b.innerHTML = `<div class="cartao bloqueio"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p>${link ? `<a class="btn" href="${esc(link)}">${esc(rotulo)}</a>` : ''}</div>`;
}

function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', atual);
  try { localStorage.setItem('boitel_theme', atual); } catch { /* opcional */ }
  if (res?.ok) renderResultados();
}

async function iniciar() {
  $('#btn-tema').onclick = alternarTema;
  const acesso = await verificarAcesso();
  if (acesso.modo === 'sem_login') return bloquear('Entre na sua conta', 'A Plataforma Patrimonial faz parte do plano Pro. Entre no simulador e volte para esta página.', LINK_SIMULADOR, 'Entrar no simulador');
  if (acesso.modo === 'sem_plano') return bloquear('Recurso do plano Pro', 'Sua conta está ativa, mas a Plataforma Patrimonial (estudo completo do projeto, cenários, hedge e projeção até a fazenda) é exclusiva do plano Pro.', LINK_PLANOS, 'Ver o plano Pro');
  if (acesso.modo === 'erro') return bloquear('Não foi possível verificar o acesso', acesso.mensagem, '', '');
  definirUsuario(acesso.usuario?.uid || null);
  let ondeSalva = 'salvo neste navegador';
  if (acesso.modo === 'pro' && window.firebase?.firestore) {
    // Usa a conta se as regras de users/{uid}/projetos já estiverem publicadas; senão segue no navegador.
    try {
      const conta = criarArmazenamentoConta(window.firebase.firestore(), acesso.usuario.uid);
      await conta.listar();
      usarArmazenamento(conta);
      ondeSalva = 'salvo na conta';
    } catch (e) {
      console.info('Projetos na conta indisponíveis; usando o navegador.', e?.code || e?.message);
    }
  }
  $('#usuario').textContent = acesso.modo === 'local' ? 'modo local (desenvolvimento)' : `${acesso.usuario.nome || acesso.usuario.email} · ${ondeSalva}`;
  $('#bloqueio').hidden = true;
  $('#app').hidden = false;
  estado = lerRascunho() || estadoInicial();
  try { abaAtual = sessionStorage.getItem('stratum_plataforma_aba') || 'painel'; } catch { /* opcional */ }
  if (!ABAS.some(a => a[0] === abaAtual)) abaAtual = 'painel';
  montarAbas();
  montarFiltros();
  calcularAgora();
  montarAba();
  iniciarAssistente(ctx);
  $('#btn-guiado').onclick = () => abrirGuiado(ctx);
  $('#btn-nova').onclick = () => {
    if (!confirm('Começar uma simulação nova com as premissas do dossiê? A atual continua no histórico se tiver sido salva.')) return;
    ctx.abrirEstado(estadoInicial(), null);
  };
}

iniciar();
