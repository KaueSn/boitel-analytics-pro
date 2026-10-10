// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBg0DmU04eMjqssFFX6_xNOFTb7viCsWw4",
  authDomain: "boitel-analytics.firebaseapp.com",
  projectId: "boitel-analytics",
  storageBucket: "boitel-analytics.firebasestorage.app",
  messagingSenderId: "644965055666",
  appId: "1:644965055666:web:4a4712f99a178d7eda5dab"
};

// Admin principal (atribuído automaticamente na criação da conta)
const ADMIN_EMAIL = "kauue.neves@gmail.com";

// Inicializar Firebase
let isFirebaseConfigured = false;
let db = null;
try {
  if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseConfigured = true;
  }
} catch (error) {
  console.log("Firebase não configurado. Usando modo de demonstração.", error);
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
let isLoginMode = true;

// Aplica o modo atual (login ou cadastro) na tela
function renderAuthMode() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm) loginForm.style.display = isLoginMode ? 'block' : 'none';
  if (registerForm) registerForm.style.display = isLoginMode ? 'none' : 'block';
  const toggle = document.getElementById('toggleAuth');
  if (toggle) {
    toggle.innerHTML = isLoginMode
      ? 'Não tem conta? <button class="btn-link" onclick="toggleAuthMode()">Criar conta</button>'
      : 'Já tem conta? <button class="btn-link" onclick="toggleAuthMode()">Fazer login</button>';
  }
}

// Sempre volta para o modo de login (ao abrir a tela ou ao sair)
function resetAuthMode() {
  isLoginMode = true;
  renderAuthMode();
  hideError();
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  renderAuthMode();
  hideError();
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

function hideError() {
  document.getElementById('errorMessage').classList.remove('show');
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').classList.add('active');
  if (typeof atualizarSidebar === 'function') atualizarSidebar();
  calcular();
  maybeStartTutorial();
}

function showLoginScreen() {
  resetAuthMode();
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').classList.remove('active');
}

// Estado global do usuário autenticado (documento do Firestore)
let currentUserData = null;

function updateUserUI(user) {
  if (user) {
    const email = user.email || 'Usuário';
    const initial = email.charAt(0).toUpperCase();
    document.getElementById('userEmail').textContent = email;
    document.getElementById('userAvatar').textContent = initial;
  }
}

// ============================================
// TOASTS
// ============================================
function showToast(message, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ' ' + type : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'all 0.25s ease';
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

// ============================================
// LOADING STATE EM BOTÕES
// ============================================
function setLoading(btn, isLoading, label) {
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> ' + (label || 'Aguarde...');
  } else {
    btn.classList.remove('loading');
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

// ============================================
// GERENCIAMENTO DE USUÁRIOS (FIRESTORE)
// ============================================
// Cria o documento do usuário no Firestore caso ainda não exista
async function createUserDocument(user) {
  if (!db) return null;
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return { id: snap.id, ...snap.data() };

  const isAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias de trial

  const doc = {
    email: user.email || '',
    role: isAdmin ? 'admin' : 'user',
    status: 'active',
    subscription: 'trial',
    subscriptionStart: now.toISOString(),
    subscriptionEnd: trialEnd.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  await ref.set(doc);
  return { id: user.uid, ...doc };
}

async function getUserData(uid) {
  if (!db) return null;
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function loadAllUsers() {
  if (!db) return [];
  const snap = await db.collection('users').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function updateUserRole(uid, role) {
  await db.collection('users').doc(uid).update({ role, updatedAt: new Date().toISOString() });
}

async function updateUserStatus(uid, status) {
  await db.collection('users').doc(uid).update({ status, updatedAt: new Date().toISOString() });
}

async function updateUserSubscription(uid, subscription, dias = 30) {
  const end = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  await db.collection('users').doc(uid).update({
    subscription,
    subscriptionStart: new Date().toISOString(),
    subscriptionEnd: subscription === 'expired' ? new Date().toISOString() : end.toISOString(),
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// ENFORCEMENT DE ASSINATURA / STATUS
// ============================================
function isSubscriptionActive(data) {
  if (!data) return true;                   // sem dados (demo/legado): não bloquear
  if (data.role === 'admin') return true;   // admin sempre tem acesso
  if (data.status === 'inactive') return false;
  const fim = data.subscriptionEnd ? new Date(data.subscriptionEnd) : null;
  if (data.subscription && data.subscription !== 'expired' && fim && fim.getTime() < Date.now()) {
    return false;                           // trial/premium vencido
  }
  return data.subscription !== 'expired';
}

// Aplica a sessão do usuário: carrega dados, valida acesso e ajusta a UI
async function applyUserSession(user) {
  updateUserUI(user);

  if (db) {
    try {
      currentUserData = await getUserData(user.uid) || await createUserDocument(user);
    } catch (e) {
      console.warn('Falha ao carregar dados do usuário:', e);
    }
  }

  // Bloqueio por conta inativa ou assinatura expirada
  if (!isSubscriptionActive(currentUserData)) {
    showLoginScreen();
    showError('Acesso bloqueado: sua conta está inativa ou a assinatura expirou. Contate o administrador.');
    if (isFirebaseConfigured) await firebase.auth().signOut();
    return;
  }

  // Botão do painel admin apenas para administradores
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) adminBtn.classList.toggle('show', !!currentUserData && currentUserData.role === 'admin');

  showMainApp();
}

// Login com e-mail e senha
async function loginWithEmail(btn) {
  if (!isFirebaseConfigured) {
    showError('Firebase não configurado. Configure as credenciais no código.');
    return;
  }

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Por favor, preencha todos os campos.');
    return;
  }

  hideError();
  setLoading(btn, true, 'Entrando...');
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    // A transição de tela é feita pelo observador onAuthStateChanged
  } catch (error) {
    showError(getAuthErrorMessage(error.code));
  } finally {
    setLoading(btn, false);
  }
}

// Registro com e-mail e senha
async function registerWithEmail(btn) {
  if (!isFirebaseConfigured) {
    showError('Firebase não configurado. Configure as credenciais no código.');
    return;
  }

  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

  if (!email || !password || !passwordConfirm) {
    showError('Por favor, preencha todos os campos.');
    return;
  }

  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== passwordConfirm) {
    showError('As senhas não coincidem.');
    return;
  }

  hideError();
  setLoading(btn, true, 'Criando conta...');
  try {
    await firebase.auth().createUserWithEmailAndPassword(email, password);
  } catch (error) {
    showError(getAuthErrorMessage(error.code));
  } finally {
    setLoading(btn, false);
  }
}

// Login com Google
async function loginWithGoogle(btn) {
  if (!isFirebaseConfigured) {
    showError('Firebase não configurado. Configure as credenciais no código.');
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  hideError();
  setLoading(btn, true, 'Conectando...');
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (error) {
    // Popup bloqueado ou indisponível: tenta o fluxo por redirecionamento
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      try {
        await firebase.auth().signInWithRedirect(provider);
        return;
      } catch (redirectError) {
        showError(getAuthErrorMessage(redirectError.code));
      }
    } else {
      showError(getAuthErrorMessage(error.code));
    }
  } finally {
    setLoading(btn, false);
  }
}

// Logout
async function logout() {
  if (isFirebaseConfigured) {
    await firebase.auth().signOut();
  }
  currentUserData = null;
  document.getElementById('adminBtn').classList.remove('show');
  document.getElementById('guideAvatar').classList.add('hidden');
  document.querySelectorAll('.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
  showLoginScreen();
}

// Mapeamento de erros do Firebase
function getAuthErrorMessage(code) {
  const errorMessages = {
    'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'Credenciais inválidas.',
    'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
    'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro método de login.',
    'auth/popup-blocked': 'O popup foi bloqueado pelo navegador. Permita popups para este site.',
    'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
    'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase. Adicione-o em Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Método de login desabilitado no Firebase. Ative "E-mail/senha" e "Google" em Authentication → Sign-in method.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/requires-recent-login': 'Faça login novamente para concluir esta ação.'
  };
  return errorMessages[code] || 'Erro na autenticação. Tente novamente.';
}

// ============================================
// PAINEL ADMINISTRATIVO
// ============================================
function openAdminPanel() {
  if (!currentUserData || currentUserData.role !== 'admin') {
    showToast('Acesso restrito a administradores.', 'error');
    return;
  }
  document.getElementById('adminPanel').classList.add('active');
  loadUsersTable();
}

function closeAdminPanel() {
  document.getElementById('adminPanel').classList.remove('active');
}

async function loadUsersTable() {
  const body = document.getElementById('adminUsersBody');
  if (!db) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding:32px;">Firestore indisponível no modo demonstração.</td></tr>';
    return;
  }
  body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding:32px;">Carregando usuários...</td></tr>';
  try {
    const users = await loadAllUsers();
    renderAdminStats(users);
    renderUsersTable(users);
  } catch (e) {
    console.error(e);
    body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-light); padding:32px;">Erro ao carregar usuários. Verifique as regras do Firestore.</td></tr>';
  }
}

function renderAdminStats(users) {
  document.getElementById('statTotal').textContent = users.length;
  document.getElementById('statActive').textContent = users.filter(u => u.status === 'active').length;
  document.getElementById('statPremium').textContent = users.filter(u => u.subscription === 'premium').length;
  document.getElementById('statAdmins').textContent = users.filter(u => u.role === 'admin').length;
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; }
}

function renderUsersTable(users) {
  const body = document.getElementById('adminUsersBody');
  if (!users.length) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding:32px;">Nenhum usuário cadastrado.</td></tr>';
    return;
  }
  body.innerHTML = users.map(u => {
    const isSelf = currentUserData && u.email === currentUserData.email;
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    const nextSub = u.subscription === 'premium' ? 'trial' : 'premium';
    return `
      <tr>
        <td>${u.email}${isSelf ? ' <span class="pill user">você</span>' : ''}</td>
        <td><span class="pill ${u.role}">${u.role}</span></td>
        <td><span class="pill ${u.status}">${u.status}</span></td>
        <td><span class="pill ${u.subscription}">${u.subscription}</span></td>
        <td>${fmtDate(u.subscriptionEnd)}</td>
        <td>
          <div class="admin-actions">
            <button class="btn-mini" ${isSelf ? 'disabled' : ''} onclick="changeUserRole('${u.id}','${nextRole}')">${u.role === 'admin' ? 'Rebaixar' : 'Promover'}</button>
            <button class="btn-mini ${u.status === 'active' ? 'danger' : ''}" ${isSelf ? 'disabled' : ''} onclick="changeUserStatus('${u.id}','${nextStatus}')">${u.status === 'active' ? 'Desativar' : 'Ativar'}</button>
            <button class="btn-mini" onclick="changeUserSubscription('${u.id}','${nextSub}')">${u.subscription === 'premium' ? '→ Trial' : '→ Premium'}</button>
            <button class="btn-mini danger" onclick="expireUser('${u.id}')">Expirar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function changeUserRole(uid, role) {
  try { await updateUserRole(uid, role); showToast('Permissão atualizada.'); loadUsersTable(); }
  catch (e) { showToast('Erro ao atualizar permissão.', 'error'); }
}

async function changeUserStatus(uid, status) {
  try { await updateUserStatus(uid, status); showToast('Status atualizado.'); loadUsersTable(); }
  catch (e) { showToast('Erro ao atualizar status.', 'error'); }
}

async function changeUserSubscription(uid, sub) {
  try {
    await updateUserSubscription(uid, sub, sub === 'premium' ? 365 : 30);
    showToast('Assinatura atualizada.');
    loadUsersTable();
  } catch (e) {
    showToast('Erro ao atualizar assinatura.', 'error');
  }
}

async function expireUser(uid) {
  try { await updateUserSubscription(uid, 'expired'); showToast('Assinatura expirada.'); loadUsersTable(); }
  catch (e) { showToast('Erro ao expirar assinatura.', 'error'); }
}
