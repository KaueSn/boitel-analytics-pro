// Wrappers do Chart.js (carregado via CDN em index.html como `window.Chart`).
const instancias = new Map();

function cor(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

export function paleta() {
  return {
    texto: cor('--texto-2'), grade: cor('--borda'),
    serie: [cor('--c1'), cor('--c2'), cor('--c3'), cor('--c4'), cor('--c5')],
    pos: cor('--pos'), neg: cor('--neg'), aviso: cor('--aviso')
  };
}

const moedaCurta = v => {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (a >= 1e3) return (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

export function grafico(idCanvas, config) {
  const el = document.getElementById(idCanvas);
  if (!el || typeof window.Chart === 'undefined') return null;
  instancias.get(idCanvas)?.destroy();
  const p = paleta();
  const base = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { labels: { color: p.texto, boxWidth: 12 } }, tooltip: { mode: 'index', intersect: false } },
    scales: {}
  };
  const opts = { ...base, ...(config.options || {}) };
  opts.plugins = { ...base.plugins, ...(config.options?.plugins || {}) };
  for (const eixo of Object.keys(config.options?.scales || { x: 1, y: 1 })) {
    const ticks = { color: p.texto };
    if (config.moedaEixo === eixo) ticks.callback = v => moedaCurta(v);
    opts.scales[eixo] = { ticks, grid: { color: p.grade }, ...(config.options?.scales?.[eixo] || {}) };
  }
  const ch = new window.Chart(el, { type: config.type, data: config.data, options: opts });
  instancias.set(idCanvas, ch);
  return ch;
}

export function destruirTodos() {
  for (const ch of instancias.values()) ch.destroy();
  instancias.clear();
}
