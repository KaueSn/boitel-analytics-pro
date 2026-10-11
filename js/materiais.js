// ============================================
// MATERIAIS DE APOIO — CATÁLOGO E LEITOR
// ============================================
// Renderiza a lista de cursos, o leitor de aulas e o "documentário"
// (narração em texto com capítulos). Guarda o progresso no navegador.

const MAT_PROGRESS_KEY = 'boitel_materiais_progresso_v1';

let matTemaAtual = 'Todos';
let matBuscaAtual = '';
let matCursoAtual = null;
let matAbaAtual = 'aulas';

// ---------- PROGRESSO ----------
function matLerProgresso() {
  try {
    return JSON.parse(localStorage.getItem(MAT_PROGRESS_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

function matSalvarProgresso(obj) {
  try { localStorage.setItem(MAT_PROGRESS_KEY, JSON.stringify(obj)); } catch (e) {}
}

function matTotalAulas() {
  return MATERIAIS.reduce((soma, c) => soma + c.aulas.length, 0);
}

function matTotalConcluidas() {
  const prog = matLerProgresso();
  return MATERIAIS.reduce((soma, c) => soma + (prog[c.id] ? prog[c.id].length : 0), 0);
}

function matAulasConcluidas(id) {
  const prog = matLerProgresso();
  return prog[id] || [];
}

// ---------- ABRIR / FECHAR ----------
function openMateriais() {
  // Fecha os drawers laterais sem mexer no item ativo da barra lateral
  ['profilePanel', 'communityPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  const backdrop = document.getElementById('panelBackdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('panel-open');

  matCursoAtual = null;
  matAbaAtual = 'aulas';

  const catalogo = document.getElementById('matCatalogo');
  const leitor = document.getElementById('matLeitor');
  if (catalogo) catalogo.style.display = '';
  if (leitor) { leitor.style.display = 'none'; leitor.innerHTML = ''; }

  const busca = document.getElementById('matBusca');
  if (busca) busca.value = '';
  matBuscaAtual = '';

  renderMateriais();
  document.getElementById('materiaisPanel').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMateriais() {
  const painel = document.getElementById('materiaisPanel');
  if (painel) painel.classList.remove('active');
  document.body.style.overflow = '';
  // Devolve o destaque da barra lateral ao Simulador
  document.querySelectorAll('.side-item[data-section]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-section') === 'simulador');
  });
}

// ---------- CATÁLOGO ----------
function renderMateriais() {
  const grid = document.getElementById('matCatalogo');
  if (!grid) return;

  // Filtros por tema
  const filtros = document.getElementById('matFiltros');
  if (filtros) {
    const temas = ['Todos'].concat(MATERIAIS.map(c => c.tema).filter((t, i, a) => a.indexOf(t) === i));
    filtros.innerHTML = temas.map(t =>
      '<button class="mat-chip' + (t === matTemaAtual ? ' active' : '') + '" onclick="matEscolherTema(\'' + t + '\')">' + t + '</button>'
    ).join('');
  }

  // Barra de progresso global
  const prog = document.getElementById('matProgressoGlobal');
  if (prog) {
    const feitas = matTotalConcluidas();
    const total = matTotalAulas();
    const pct = total ? Math.round((feitas / total) * 100) : 0;
    prog.innerHTML =
      '<span>' + ic('cert') + ' Seu progresso: <strong>' + feitas + ' de ' + total + '</strong> aulas (' + pct + '%)</span>' +
      '<span class="mat-progress-track"><span class="mat-progress-fill" style="width:' + pct + '%"></span></span>' +
      (feitas ? '<button class="mat-chip" onclick="matZerarProgresso()">Zerar</button>' : '');
  }

  // Filtragem
  const termo = matBuscaAtual.trim().toLowerCase();
  const lista = MATERIAIS.filter(c => {
    const okTema = matTemaAtual === 'Todos' || c.tema === matTemaAtual;
    if (!okTema) return false;
    if (!termo) return true;
    const alvo = [c.titulo, c.tema, c.nivel, c.resumo, c.documentario.titulo, c.documentario.sinopse]
      .concat(c.aulas.map(a => a.titulo))
      .concat(c.aulas.map(a => a.objetivo))
      .join(' ').toLowerCase();
    return alvo.indexOf(termo) !== -1;
  });

  if (!lista.length) {
    grid.innerHTML = '<div class="mat-empty">Nenhum material encontrado para "' + escapeHtml(matBuscaAtual) + '". Tente outro termo ou tema.</div>';
    return;
  }

  grid.innerHTML = lista.map(c => {
    const feitas = matAulasConcluidas(c.id).length;
    const concluido = feitas >= c.aulas.length;
    return (
      '<article class="mat-card" onclick="abrirCurso(\'' + c.id + '\')">' +
        '<div class="mat-card-cover">' +
          '<span class="mat-badge">' + c.tema + '</span>' +
          '<span class="mat-level">' + c.nivel + '</span>' +
          '<img src="' + c.capa + '" alt="Capa do curso ' + escapeHtml(c.titulo) + '" loading="lazy">' +
          (concluido ? '<span class="mat-card-done">' + ic('check') + ' Concluído</span>' : '') +
        '</div>' +
        '<div class="mat-card-body">' +
          '<h3 class="mat-card-title">' + escapeHtml(c.titulo) + '</h3>' +
          '<p class="mat-card-desc">' + escapeHtml(c.resumo) + '</p>' +
          '<div class="mat-card-meta">' +
            '<span>' + ic('level') + c.aulas.length + ' aulas</span>' +
            '<span>' + ic('video') + 'Documentário</span>' +
          '</div>' +
          '<button class="mat-cta">' + ic('play') + (feitas ? 'Continuar estudando' : 'Abrir curso') + '</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');
}

function matEscolherTema(tema) {
  matTemaAtual = tema;
  renderMateriais();
}

function filtrarMateriais() {
  const el = document.getElementById('matBusca');
  matBuscaAtual = el ? el.value : '';
  renderMateriais();
}

function matZerarProgresso() {
  matSalvarProgresso({});
  if (matCursoAtual) abrirCurso(matCursoAtual.id, matAbaAtual);
  renderMateriais();
  if (typeof showToast === 'function') showToast('Progresso zerado.');
}

// ---------- LEITOR ----------
function abrirCurso(id, aba) {
  const curso = MATERIAIS.filter(c => c.id === id)[0];
  if (!curso) return;
  matCursoAtual = curso;
  matAbaAtual = aba || matAbaAtual || 'aulas';

  const catalogo = document.getElementById('matCatalogo');
  const leitor = document.getElementById('matLeitor');
  if (catalogo) catalogo.style.display = 'none';
  if (leitor) leitor.style.display = '';

  const feitas = matAulasConcluidas(curso.id).length;

  const html =
    '<button class="mat-back" onclick="voltarMateriais()">' + ic('back') + ' Voltar aos materiais</button>' +

    '<div class="mat-reader-head">' +
      '<div class="mat-reader-cover"><img src="' + curso.capa + '" alt="Capa do curso ' + escapeHtml(curso.titulo) + '"></div>' +
      '<div class="mat-reader-info">' +
        '<h2>' + escapeHtml(curso.titulo) + '</h2>' +
        '<p>' + escapeHtml(curso.resumo) + '</p>' +
        '<div class="mat-reader-meta">' +
          '<span class="mat-pill">' + ic('book') + curso.tema + '</span>' +
          '<span class="mat-pill">' + ic('level') + curso.nivel + '</span>' +
          '<span class="mat-pill">' + ic('cap') + curso.aulas.length + ' aulas</span>' +
          '<span class="mat-pill">' + ic('video') + 'Documentário · ' + curso.documentario.duracao + '</span>' +
          '<span class="mat-pill">' + ic('check') + feitas + ' concluída(s)</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="mat-tabs">' +
      '<button class="mat-tab' + (matAbaAtual === 'aulas' ? ' active' : '') + '" onclick="matTrocarAba(\'aulas\')">' + ic('book') + ' Aulas escritas</button>' +
      '<button class="mat-tab' + (matAbaAtual === 'documentario' ? ' active' : '') + '" onclick="matTrocarAba(\'documentario\')">' + ic('video') + ' Documentário</button>' +
    '</div>' +

    '<div id="matConteudo">' + (matAbaAtual === 'documentario' ? matRenderDocumentario(curso) : matRenderAulas(curso)) + '</div>';

  leitor.innerHTML = html;
  const shell = document.querySelector('#materiaisPanel .mat-shell');
  if (shell) shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function voltarMateriais() {
  matCursoAtual = null;
  const catalogo = document.getElementById('matCatalogo');
  const leitor = document.getElementById('matLeitor');
  if (catalogo) catalogo.style.display = '';
  if (leitor) { leitor.style.display = 'none'; leitor.innerHTML = ''; }
  renderMateriais();
}

function matTrocarAba(aba) {
  matAbaAtual = aba;
  if (matCursoAtual) abrirCurso(matCursoAtual.id, aba);
}

// ---------- AULAS ----------
function matRenderAulas(curso) {
  const feitas = matAulasConcluidas(curso.id);
  return curso.aulas.map((a, i) => {
    const aberta = i === 0;
    const concluida = feitas.indexOf(i) !== -1;
    return (
      '<div class="mat-lesson' + (aberta ? ' open' : '') + '" id="matAula' + i + '">' +
        '<div class="mat-lesson-head" onclick="matToggleAula(' + i + ')">' +
          '<div class="mat-lesson-num">' + (i + 1) + '</div>' +
          '<div class="mat-lesson-titles">' +
            '<h3>' + escapeHtml(a.titulo) + '</h3>' +
            '<span>' + escapeHtml(a.objetivo) + '</span>' +
          '</div>' +
          '<div class="mat-lesson-right">' +
            '<span class="mat-len">' + ic('time') + escapeHtml(a.duracao) + '</span>' +
            '<button class="mat-done-toggle' + (concluida ? ' on' : '') + '" title="Marcar aula como concluída" ' +
              'onclick="event.stopPropagation(); matConcluirAula(' + i + ')">' + ic('check') + '</button>' +
            '<span class="mat-chevron">' + ic('arrow') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mat-lesson-body">' +
          '<div class="mat-objetivo"><strong>Objetivo da aula:</strong> ' + escapeHtml(a.objetivo) + '</div>' +
          a.conteudo.map(p => '<p>' + escapeHtml(p) + '</p>').join('') +
          '<div class="mat-subhead">' + ic('check') + ' Pontos-chave</div>' +
          '<ul class="mat-points">' + a.pontos.map(p => '<li>' + ic('check') + '<span>' + escapeHtml(p) + '</span></li>').join('') + '</ul>' +
          '<div class="mat-pratica">' +
            '<div class="mat-pratica-title">' + ic('spark') + ' Aplicação prática</div>' +
            escapeHtml(a.pratica) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function matToggleAula(i) {
  const el = document.getElementById('matAula' + i);
  if (el) el.classList.toggle('open');
}

function matConcluirAula(i) {
  if (!matCursoAtual) return;
  const prog = matLerProgresso();
  const id = matCursoAtual.id;
  const lista = prog[id] || [];
  const pos = lista.indexOf(i);
  if (pos === -1) lista.push(i); else lista.splice(pos, 1);
  prog[id] = lista;
  matSalvarProgresso(prog);

  const el = document.getElementById('matAula' + i);
  if (el) {
    const btn = el.querySelector('.mat-done-toggle');
    if (btn) btn.classList.toggle('on', lista.indexOf(i) !== -1);
  }
  if (typeof showToast === 'function' && lista.indexOf(i) !== -1) showToast('Aula marcada como concluída.');
}

// ---------- DOCUMENTÁRIO ----------
function matRenderDocumentario(curso) {
  const doc = curso.documentario;
  return (
    '<div class="mat-doc-hero">' +
      '<img src="' + curso.capa + '" alt="Cena do documentário ' + escapeHtml(doc.titulo) + '">' +
      '<div class="mat-doc-hero-info">' +
        '<span class="mat-doc-tag">' + ic('video') + ' Documentário narrado</span>' +
        '<h3>' + escapeHtml(doc.titulo) + '</h3>' +
        '<p>' + escapeHtml(doc.sinopse) + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="mat-doc-note">' + ic('bulb') +
      '<span>Os capítulos abaixo são a <strong>narração completa em texto</strong>, no formato de roteiro de documentário. Toque em cada capítulo para ler. Você pode estudar sem pressa, no seu ritmo.</span>' +
    '</div>' +
    doc.capitulos.map((cap, i) =>
      '<div class="mat-chapter' + (i === 0 ? ' open' : '') + '" id="matCap' + i + '">' +
        '<div class="mat-chapter-time">' + cap.t + '</div>' +
        '<div class="mat-chapter-body">' +
          '<div class="mat-chapter-head" onclick="matToggleCapitulo(' + i + ')">' +
            '<h4>' + escapeHtml(cap.titulo) + '</h4>' +
            '<span class="mat-chevron">' + ic('arrow') + '</span>' +
          '</div>' +
          '<div class="mat-chapter-text">' + cap.texto.map(p => '<p>' + escapeHtml(p) + '</p>').join('') + '</div>' +
        '</div>' +
      '</div>'
    ).join('')
  );
}

function matToggleCapitulo(i) {
  const el = document.getElementById('matCap' + i);
  if (el) el.classList.toggle('open');
}

// Fecha com ESC
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const painel = document.getElementById('materiaisPanel');
    if (painel && painel.classList.contains('active')) {
      if (matCursoAtual) voltarMateriais(); else closeMateriais();
    }
  }
});
