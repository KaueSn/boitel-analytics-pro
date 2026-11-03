// Triguinho: personagem que responde dúvidas sobre como usar a plataforma.
// Respostas vêm de assistente-base.js (sem IA, sem rede). Textos inseridos com textContent.
import { responder, ROTULOS } from './assistente-base.js';

const CHAVE_SAUDACAO = 'stratum_plataforma_triguinho_v1';
export const NOMES_ABA = {
  painel: 'Painel', estudo: 'Melhor opção & região', premissas: 'Premissas', lote: 'Lote & zootecnia', modelos: 'Modelos A/B/C', patrimonio: 'Patrimônio',
  caminhos: 'Caminhos & objetivo', cenarios: 'Cenários', hedge: 'Hedge B3', cdi: 'Renda fixa (CDI)',
  calendario: 'Calendário', simulacoes: 'Simulações', fontes: 'Fontes & método', regiao: 'Região & logística'
};

export const SVG_TRIGUINHO = `<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">
  <path d="M50 95 V46" stroke="#bd8f28" stroke-width="5" stroke-linecap="round"/>
  <path d="M50 88 C34 86 27 75 31 66 C43 70 50 78 50 88 Z" fill="#d4af37"/>
  <path d="M50 88 C66 86 73 75 69 66 C57 70 50 78 50 88 Z" fill="#e8c75f"/>
  <g fill="#f2dd93"><ellipse cx="50" cy="19" rx="5.2" ry="7.4"/><ellipse cx="50" cy="32" rx="5.4" ry="7.4"/>
    <ellipse cx="38.5" cy="25.5" rx="7.4" ry="4.7" transform="rotate(-34 38.5 25.5)"/><ellipse cx="61.5" cy="25.5" rx="7.4" ry="4.7" transform="rotate(34 61.5 25.5)"/>
    <ellipse cx="35.5" cy="37" rx="7.6" ry="4.9" transform="rotate(-32 35.5 37)"/><ellipse cx="64.5" cy="37" rx="7.6" ry="4.9" transform="rotate(32 64.5 37)"/></g>
  <g stroke="#f7e29a" stroke-width="2.4" stroke-linecap="round"><path d="M50 11 L50 3"/><path d="M38 18 L30 8"/><path d="M62 18 L70 8"/><path d="M35 30 L27 21"/><path d="M65 30 L73 21"/></g>
  <g class="tri-olhos"><circle cx="43.5" cy="56" r="4.6" fill="#0a0e17"/><circle cx="56.5" cy="56" r="4.6" fill="#0a0e17"/>
    <circle cx="45.1" cy="54.4" r="1.6" fill="#fff"/><circle cx="58.1" cy="54.4" r="1.6" fill="#fff"/></g>
  <path d="M44 64 Q50 69 56 64" stroke="#0a0e17" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</svg>`;

const SUGESTOES_INICIAIS = ['melhorOpcao', 'guiado', 'lucro', 'frete', 'fazenda', 'prejuizo'];

export function iniciarAssistente(ctx) {
  const raiz = document.createElement('div');
  raiz.className = 'tri';
  raiz.innerHTML = `
    <div class="tri-painel" id="tri-painel" role="dialog" aria-modal="false" aria-labelledby="tri-titulo" hidden>
      <div class="tri-topo"><strong id="tri-titulo">Triguinho — tire suas dúvidas</strong>
        <span class="tri-acoes"><button type="button" class="btn-mini tri-esconder" title="Tira o Triguinho da tela; volta pela etiqueta “? Ajuda”">Esconder</button>
        <button type="button" class="tri-fechar" aria-label="Minimizar o chat" title="Minimizar">–</button></span></div>
      <div class="tri-msgs" aria-live="polite"></div>
      <div class="tri-chips" aria-label="Sugestões de perguntas"></div>
      <form class="tri-form"><label for="tri-pergunta" class="sr">Sua pergunta</label>
        <input id="tri-pergunta" autocomplete="off" maxlength="200" placeholder="Ex.: quanto vou lucrar?">
        <button type="submit" class="btn">Perguntar</button></form>
      <p class="tri-aviso"><a href="triguinho.html">Abrir a página do Triguinho (conversa por voz)</a>. Respostas sobre como usar a plataforma, com os números da sua simulação. Não é recomendação de investimento.</p>
    </div>
    <div class="tri-balao" hidden></div>
    <button type="button" class="tri-boneco" aria-expanded="false" aria-controls="tri-painel" title="Pergunte ao Triguinho">${SVG_TRIGUINHO}<span class="sr">Abrir o assistente Triguinho</span></button>
    <button type="button" class="tri-mini" hidden title="Mostrar o Triguinho">? Ajuda</button>`;
  document.body.appendChild(raiz);

  const painel = raiz.querySelector('.tri-painel');
  const msgs = raiz.querySelector('.tri-msgs');
  const chips = raiz.querySelector('.tri-chips');
  const input = raiz.querySelector('#tri-pergunta');
  const boneco = raiz.querySelector('.tri-boneco');
  const balao = raiz.querySelector('.tri-balao');

  function bolha(texto, quem) {
    const d = document.createElement('div');
    d.className = 'tri-msg tri-' + quem;
    d.textContent = texto;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function mostrarSugestoes(ids) {
    chips.replaceChildren(...ids.filter(id => ROTULOS[id]).slice(0, 4).map(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn-mini';
      b.textContent = ROTULOS[id];
      b.onclick = () => perguntar(ROTULOS[id]);
      return b;
    }));
  }

  function perguntar(texto) {
    const q = String(texto || '').trim().slice(0, 200);
    if (!q) return;
    bolha(q, 'eu');
    const r = responder(q, ctx.res?.ok ? ctx.res : null);
    const d = bolha(r.texto, 'tri');
    if (r.aba === 'guiado') {
      const ir = document.createElement('button');
      ir.type = 'button';
      ir.className = 'btn-mini tri-ir';
      ir.textContent = 'Abrir o preenchimento guiado →';
      ir.onclick = () => { fechar(false); ctx.abrirGuiado(); };
      d.appendChild(document.createElement('br'));
      d.appendChild(ir);
    } else if (r.aba && NOMES_ABA[r.aba]) {
      const ir = document.createElement('button');
      ir.type = 'button';
      ir.className = 'btn-mini tri-ir';
      ir.textContent = 'Ir para ' + NOMES_ABA[r.aba] + ' →';
      ir.onclick = () => { fechar(false); ctx.irParaAba(r.aba); };
      d.appendChild(document.createElement('br'));
      d.appendChild(ir);
    }
    mostrarSugestoes(r.seguintes?.length ? r.seguintes : SUGESTOES_INICIAIS);
  }

  const mini = raiz.querySelector('.tri-mini');
  const CHAVE_ESCONDIDO = 'stratum_plataforma_triguinho_escondido_v1';
  function esconder(sim) {
    painel.hidden = true;
    balao.hidden = true;
    boneco.hidden = sim;
    mini.hidden = !sim;
    boneco.setAttribute('aria-expanded', 'false');
    try { localStorage.setItem(CHAVE_ESCONDIDO, sim ? '1' : '0'); } catch { /* opcional */ }
    (sim ? mini : boneco).focus();
  }

  function abrir() {
    if (boneco.hidden) { boneco.hidden = false; mini.hidden = true; }
    painel.hidden = false;
    balao.hidden = true;
    boneco.setAttribute('aria-expanded', 'true');
    if (!msgs.childElementCount) {
      bolha('Olá! Eu sou o Triguinho. Pergunte qualquer coisa sobre como usar a plataforma: o que cada campo significa, como ler os resultados, como salvar… Ou toque numa sugestão.', 'tri');
      mostrarSugestoes(SUGESTOES_INICIAIS);
    }
    input.focus();
  }

  function fechar(devolverFoco = true) {
    painel.hidden = true;
    boneco.setAttribute('aria-expanded', 'false');
    if (devolverFoco) boneco.focus();
  }

  boneco.onclick = () => (painel.hidden ? abrir() : fechar());
  raiz.querySelector('.tri-fechar').onclick = () => fechar();
  raiz.querySelector('.tri-esconder').onclick = () => esconder(true);
  mini.onclick = () => { esconder(false); abrir(); };
  // Clicar fora do chat minimiza
  document.addEventListener('pointerdown', e => { if (!painel.hidden && !raiz.contains(e.target)) fechar(false); });
  raiz.querySelector('.tri-form').onsubmit = e => { e.preventDefault(); perguntar(input.value); input.value = ''; };
  painel.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  balao.onclick = abrir;

  let escondido = false;
  try { escondido = localStorage.getItem(CHAVE_ESCONDIDO) === '1'; } catch { /* opcional */ }
  if (escondido) { boneco.hidden = true; mini.hidden = false; return { abrir, perguntar }; }

  // Saudação curta na primeira visita
  let jaViu = false;
  try { jaViu = localStorage.getItem(CHAVE_SAUDACAO) === '1'; localStorage.setItem(CHAVE_SAUDACAO, '1'); } catch { /* opcional */ }
  if (!jaViu) {
    balao.textContent = 'Oi! Sou o Triguinho. Clique em mim para tirar dúvidas sobre a plataforma.';
    balao.hidden = false;
    setTimeout(() => { balao.hidden = true; }, 12000);
  }
  return { abrir, perguntar };
}
