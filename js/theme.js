// ============================================
// TEMA CLARO / ESCURO
// ============================================
// Aplica o tema salvo o mais cedo possível (evita "flash" de cor)
(function aplicarTemaInicial() {
  try {
    const t = localStorage.getItem('boitel_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function temaAtual() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Atualiza o ícone de todos os botões de tema
function atualizarBotoesTema() {
  const claro = temaAtual() === 'light';
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.textContent = claro ? '🌙' : '☀️';
    btn.setAttribute('title', claro ? 'Mudar para tema escuro' : 'Mudar para tema claro');
    btn.setAttribute('aria-label', claro ? 'Mudar para tema escuro' : 'Mudar para tema claro');
  });
}

function toggleTheme() {
  const novo = temaAtual() === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', novo);
  try { localStorage.setItem('boitel_theme', novo); } catch (e) {}
  atualizarBotoesTema();
}

document.addEventListener('DOMContentLoaded', atualizarBotoesTema);
