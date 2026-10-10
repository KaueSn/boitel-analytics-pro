// ============================================
// OBSERVADOR DE AUTENTICAÇÃO
// ============================================
if (isFirebaseConfigured) {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      await applyUserSession(user);
    } else {
      currentUserData = null;
      document.getElementById('adminBtn').classList.remove('show');
      showLoginScreen();
    }
  });
} else {
  // Modo de demonstração - entra automaticamente como admin
  console.log('Modo de demonstração: Firebase não configurado');
  document.getElementById('userEmail').textContent = 'demo@boitel.com';
  document.getElementById('userAvatar').textContent = 'D';
  currentUserData = { email: 'demo@boitel.com', role: 'admin', status: 'active', subscription: 'premium' };
  document.getElementById('adminBtn').classList.add('show');
  showMainApp();
}

// ============================================
// INICIALIZAÇÃO
// ============================================
window.onload = function() {
  if (!isFirebaseConfigured) {
    showMainApp();
  }
};
