// ============================================
// BARRA LATERAL — PERFIL E COMUNIDADE
// ============================================

// Abre a seção escolhida na barra lateral
function openSection(nome) {
  document.querySelectorAll('.side-item[data-section]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-section') === nome);
  });

  const abrirPerfil = nome === 'perfil';
  const abrirComunidade = nome === 'comunidade';
  const abrirMateriais = nome === 'materiais';

  document.getElementById('profilePanel').classList.toggle('active', abrirPerfil);
  document.getElementById('communityPanel').classList.toggle('active', abrirComunidade);
  if (abrirMateriais && typeof openMateriais === 'function') {
    openMateriais();
    return;
  }
  if (typeof closeMateriais === 'function') closeMateriais();

  // Fundo escurecido + esconde o avatar-guia enquanto um painel estiver aberto
  const algumAberto = abrirPerfil || abrirComunidade;
  const backdrop = document.getElementById('panelBackdrop');
  if (backdrop) backdrop.classList.toggle('active', algumAberto);
  document.body.classList.toggle('panel-open', algumAberto);

  if (nome === 'perfil') carregarPerfil();
  if (nome === 'comunidade') iniciarComunidade();
}

function closeSection() {
  document.getElementById('profilePanel').classList.remove('active');
  document.getElementById('communityPanel').classList.remove('active');
  if (typeof closeMateriais === 'function') closeMateriais();
  const backdrop = document.getElementById('panelBackdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('panel-open');
  document.querySelectorAll('.side-item[data-section]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-section') === 'simulador');
  });
}

// Atualiza nome/avatar da barra lateral conforme o usuário logado
function atualizarSidebar() {
  const authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
  const email = (currentUserData && currentUserData.email) || (authUser && authUser.email) || 'Usuário';
  const nome = (currentUserData && currentUserData.name) || email.split('@')[0];
  const inicial = (nome || 'U').charAt(0).toUpperCase();
  const sideName = document.getElementById('sideName');
  const sideAvatar = document.getElementById('sideAvatar');
  if (sideName) sideName.textContent = nome;
  if (sideAvatar) sideAvatar.textContent = inicial;
}

// ============================================
// PERFIL
// ============================================
function carregarPerfil() {
  const email = (currentUserData && currentUserData.email) || '';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('profileEmail', email);
  set('profileName', currentUserData && currentUserData.name);
  set('profilePhone', currentUserData && currentUserData.phone);
  set('profileBio', currentUserData && currentUserData.bio);
  const salvo = currentUserData && currentUserData.updatedAt;
  const hint = document.getElementById('profileSavedAt');
  if (hint) hint.textContent = salvo ? ('Última atualização: ' + new Date(salvo).toLocaleString('pt-BR')) : '';
}

async function salvarPerfil(btn) {
  if (!db || !firebase.auth().currentUser) {
    showToast('Faça login para salvar o perfil.', 'error');
    return;
  }
  const nome = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const bio = document.getElementById('profileBio').value.trim();
  setLoading(btn, true, 'Salvando...');
  try {
    const uid = firebase.auth().currentUser.uid;
    const updatedAt = new Date().toISOString();
    await db.collection('users').doc(uid).update({ name: nome, phone, bio, updatedAt });
    currentUserData = Object.assign({}, currentUserData, { name: nome, phone, bio, updatedAt });
    atualizarSidebar();
    carregarPerfil();
    showToast('Perfil atualizado!');
  } catch (e) {
    console.error(e);
    showToast('Erro ao salvar perfil. Verifique as regras do Firestore.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ============================================
// COMUNIDADE (artigos / perguntas + respostas)
// ============================================
let postsUnsubscribe = null;
let postAtualId = null;

function iniciarComunidade() {
  const lista = document.getElementById('postList');
  if (!db) {
    lista.innerHTML = '<div class="post-empty">Comunidade disponível apenas com login conectado.</div>';
    return;
  }
  if (postsUnsubscribe) return; // já está escutando em tempo real
  lista.innerHTML = '<div class="post-empty">Carregando publicações...</div>';
  postsUnsubscribe = db.collection('community_posts')
    .orderBy('criadoEm', 'desc')
    .limit(50)
    .onSnapshot(snap => {
      const posts = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      renderPosts(posts);
    }, err => {
      console.error(err);
      lista.innerHTML = '<div class="post-empty">Erro ao carregar a comunidade. Verifique as regras do Firestore.</div>';
    });
}

async function publicarPost(btn) {
  if (!db || !firebase.auth().currentUser) {
    showToast('Faça login para publicar.', 'error');
    return;
  }
  const titulo = document.getElementById('postTitle').value.trim();
  const texto = document.getElementById('postBody').value.trim();
  const tipo = document.getElementById('postType').value;
  if (!titulo || !texto) {
    showToast('Preencha título e conteúdo.', 'warning');
    return;
  }
  setLoading(btn, true, 'Publicando...');
  try {
    const authUser = firebase.auth().currentUser;
    const autor = (currentUserData && currentUserData.name) || (authUser.email || '').split('@')[0];
    await db.collection('community_posts').add({
      uid: authUser.uid,
      autor,
      tipo,
      titulo,
      texto,
      criadoEm: new Date().toISOString(),
      respostas: 0
    });
    document.getElementById('postTitle').value = '';
    document.getElementById('postBody').value = '';
    showToast('Publicado na comunidade!');
  } catch (e) {
    console.error(e);
    showToast('Erro ao publicar. Verifique as regras do Firestore.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

function renderPosts(posts) {
  const lista = document.getElementById('postList');
  if (!posts.length) {
    lista.innerHTML = '<div class="post-empty">Nenhuma publicação ainda. Seja o primeiro!</div>';
    return;
  }
  lista.innerHTML = posts.map(p => {
    const texto = p.texto || '';
    return '<div class="post-card" onclick="abrirPost(\'' + p.id + '\')">' +
      '<div class="post-card-top">' +
        '<span class="post-tag ' + p.tipo + '">' + p.tipo + '</span>' +
        '<span class="post-date">' + fmtPostDate(p.criadoEm) + '</span>' +
      '</div>' +
      '<div class="post-title">' + escapeHtml(p.titulo) + '</div>' +
      '<div class="post-excerpt">' + escapeHtml(texto.slice(0, 140)) + (texto.length > 140 ? '…' : '') + '</div>' +
      '<div class="post-meta">por ' + escapeHtml(p.autor || 'anônimo') + ' · ' + (p.respostas || 0) + ' resposta(s)</div>' +
    '</div>';
  }).join('');
}

async function abrirPost(id) {
  postAtualId = id;
  const box = document.getElementById('postDetail');
  box.style.display = 'block';
  box.innerHTML = '<div class="post-empty">Carregando...</div>';
  try {
    const doc = await db.collection('community_posts').doc(id).get();
    if (!doc.exists) { box.innerHTML = ''; box.style.display = 'none'; return; }
    const p = Object.assign({ id: doc.id }, doc.data());

    // Busca as respostas sem orderBy (evita exigir índice composto) e ordena no cliente
    const answersSnap = await db.collection('community_answers').where('postId', '==', id).get();
    const answers = answersSnap.docs.map(d => d.data())
      .sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));

    box.innerHTML =
      '<div class="post-detail-head">' +
        '<span class="post-tag ' + p.tipo + '">' + p.tipo + '</span>' +
        '<button class="btn-mini" onclick="fecharPost()">← Voltar</button>' +
      '</div>' +
      '<h3 class="post-detail-title">' + escapeHtml(p.titulo) + '</h3>' +
      '<div class="post-detail-meta">por ' + escapeHtml(p.autor || 'anônimo') + ' · ' + fmtPostDate(p.criadoEm) + '</div>' +
      '<p class="post-detail-text">' + escapeHtml(p.texto || '') + '</p>' +
      '<div class="answers">' +
        '<div class="answers-title">Respostas (' + answers.length + ')</div>' +
        (answers.map(a =>
          '<div class="answer"><div class="answer-author">' + escapeHtml(a.autor || 'anônimo') + ' · ' + fmtPostDate(a.criadoEm) + '</div><div>' + escapeHtml(a.texto || '') + '</div></div>'
        ).join('') || '<div class="post-empty">Seja o primeiro a responder.</div>') +
      '</div>' +
      '<textarea id="answerText" class="fld" rows="2" placeholder="Escreva sua resposta..."></textarea>' +
      '<button class="btn-primary" onclick="responderPost(this)">Responder</button>';

    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="post-empty">Erro ao abrir a publicação.</div>';
  }
}

function fecharPost() {
  const box = document.getElementById('postDetail');
  box.style.display = 'none';
  box.innerHTML = '';
  postAtualId = null;
}

async function responderPost(btn) {
  if (!db || !firebase.auth().currentUser || !postAtualId) return;
  const texto = document.getElementById('answerText').value.trim();
  if (!texto) { showToast('Escreva sua resposta.', 'warning'); return; }
  setLoading(btn, true, 'Enviando...');
  try {
    const authUser = firebase.auth().currentUser;
    const autor = (currentUserData && currentUserData.name) || (authUser.email || '').split('@')[0];
    const postId = postAtualId;
    await db.collection('community_answers').add({
      postId, uid: authUser.uid, autor, texto, criadoEm: new Date().toISOString()
    });
    try {
      await db.collection('community_posts').doc(postId).update({
        respostas: firebase.firestore.FieldValue.increment(1)
      });
    } catch (e) { /* contador é opcional */ }
    await abrirPost(postId);
    showToast('Resposta enviada!');
  } catch (e) {
    console.error(e);
    showToast('Erro ao responder. Verifique as regras do Firestore.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

function fmtPostDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
