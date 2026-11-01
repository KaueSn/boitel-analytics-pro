// Controle de acesso da página: exige login no simulador e plano Pro (ou admin).
// IMPORTANTE: é um bloqueio de interface. O motor roda no navegador, então quem
// baixar os arquivos consegue executá-lo. Proteção real exigiria servir o cálculo
// por uma API autenticada (ver docs/INTEGRACAO.md).
const firebaseConfig = {
  // Configuração web pública do projeto (a mesma de js/auth.js; não é segredo).
  apiKey: 'AIzaSyBg0DmU04eMjqssFFX6_xNOFTb7viCsWw4',
  authDomain: 'boitel-analytics.firebaseapp.com',
  projectId: 'boitel-analytics',
  storageBucket: 'boitel-analytics.firebasestorage.app',
  messagingSenderId: '644965055666',
  appId: '1:644965055666:web:4a4712f99a178d7eda5dab'
};

export const LINK_PLANOS = 'https://stratum-agro.vercel.app/#planos';
export const LINK_SIMULADOR = '../';

const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '[::1]', ''];

function assinaturaAtiva(d) {
  if (!d) return false;
  if (d.role === 'admin') return true;
  if (d.status === 'inactive') return false;
  const fim = d.subscriptionEnd ? new Date(d.subscriptionEnd) : null;
  if (d.subscription && d.subscription !== 'expired' && fim && fim.getTime() < Date.now()) return false;
  return d.subscription !== 'expired';
}

export function temAcessoPro(d) {
  if (!d) return false;
  if (d.role === 'admin') return true;
  return d.plan === 'pro' && assinaturaAtiva(d);
}

/**
 * Resolve o acesso. Retorna { modo: 'local'|'pro'|'sem_login'|'sem_plano'|'erro', usuario }.
 * Em localhost a página abre em modo local de desenvolvimento.
 */
export function verificarAcesso() {
  if (HOSTS_LOCAIS.includes(location.hostname) || location.protocol === 'file:') {
    return Promise.resolve({ modo: 'local', usuario: null });
  }
  if (typeof window.firebase === 'undefined') return Promise.resolve({ modo: 'erro', mensagem: 'Não foi possível carregar o Firebase.' });
  return new Promise(resolve => {
    try {
      if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
      const off = window.firebase.auth().onAuthStateChanged(async user => {
        off();
        if (!user) return resolve({ modo: 'sem_login' });
        try {
          const snap = await window.firebase.firestore().collection('users').doc(user.uid).get();
          const d = snap.exists ? snap.data() : null;
          resolve({ modo: temAcessoPro(d) ? 'pro' : 'sem_plano', usuario: { uid: user.uid, email: user.email, nome: d?.name || '' } });
        } catch {
          resolve({ modo: 'erro', mensagem: 'Não foi possível verificar o seu plano agora. Tente de novo.' });
        }
      });
    } catch {
      resolve({ modo: 'erro', mensagem: 'Falha ao iniciar a autenticação.' });
    }
  });
}
