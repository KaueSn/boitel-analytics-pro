// Formatação pt-BR e escape de HTML (todo texto dinâmico passa por esc()).

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtMoeda2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function moeda(v, casas = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return '—';
  return (casas ? fmtMoeda2 : fmtMoeda).format(v);
}

export function num(v, casas = 0) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (!Number.isFinite(v)) return '∞';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function pct(v, casas = 1) {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
}

/**
 * Lê número digitado à brasileira ou com ponto decimal: "123,45", "123.45", "250.000",
 * "1.234,50" e "R$ 300". Devolve NaN se não for número.
 */
export function numeroBR(texto) {
  const s = String(texto ?? '').replace(/R\$|\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
}

export function data(iso) {
  if (!iso) return '—';
  if (iso.length > 10) return new Date(iso).toLocaleDateString('pt-BR'); // data-hora: fuso local
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Data de hoje no fuso local, em ISO (AAAA-MM-DD). */
export function hojeISO() {
  const t = new Date();
  return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Valor de premissa formatado conforme a unidade do esquema. */
export function valorPremissa(def, v) {
  if (typeof v !== 'number') return esc(v);
  if (def.unidade?.startsWith('fração')) return pct(v, 2);
  if (def.unidade?.startsWith('R$')) return moeda(v, 2);
  return num(v, Number.isInteger(v) ? 0 : 2);
}

/** Classe CSS de sinal para valores financeiros. */
export function sinal(v) {
  return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
}

export function kpi(rotulo, valor, { sub = '', classe = '', titulo = '' } = {}) {
  return `<div class="kpi ${classe}"${titulo ? ` title="${esc(titulo)}"` : ''}><div class="kpi-rot">${esc(rotulo)}</div><div class="kpi-val">${valor}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}

export function aviso(texto, tipo = 'risco') {
  const ic = { critico: '⛔', risco: '⚠', info: 'ℹ', ok: '✓' }[tipo] || '•';
  return `<div class="alerta alerta-${esc(tipo)}"><span aria-hidden="true">${ic}</span><span>${esc(texto)}</span></div>`;
}

export function tabela(cabecalho, linhas, { classe = '' } = {}) {
  return `<div class="tabela-wrap"><table class="tabela ${classe}"><thead><tr>${cabecalho.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
