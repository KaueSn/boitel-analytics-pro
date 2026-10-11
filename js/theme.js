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

// Helper global de ícones: usa o sprite SVG definido no index.html
// Uso em JS:  ic('book')  ->  '<svg class="ic"><use href="#i-book"></use></svg>'
function ic(nome, classeExtra) {
  return '<svg class="ic' + (classeExtra ? ' ' + classeExtra : '') + '" aria-hidden="true"><use href="#i-' + nome + '"></use></svg>';
}

// Atualiza o ícone de todos os botões de tema (SVG, evita emoji "bugado")
function atualizarBotoesTema() {
  const claro = temaAtual() === 'light';
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    const lateral = btn.classList.contains('side-theme');
    btn.innerHTML = ic(claro ? 'moon' : 'sun') + (lateral ? '<span>Tema</span>' : '');
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
