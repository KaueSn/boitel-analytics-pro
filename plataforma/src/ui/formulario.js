// Formulários gerados a partir dos esquemas do motor, com selo de origem do dado.
import { esc } from './formato.js';
import { ROTULO_ORIGEM } from '../engine/premissas.js';
import { fonte } from '../engine/mercado.js';

const ehFracao = d => typeof d.unidade === 'string' && d.unidade.startsWith('fração');
const unidadeTela = d => (ehFracao(d) ? d.unidade.replace('fração', '%') : d.unidade || '');

const ROTULOS_OPCAO = {
  arroba_produzida: 'Por arroba produzida', diaria: 'Por diária',
  durante: 'Durante o ciclo', final: 'No acerto (gancho)',
  pf_resultado: 'PF — sobre o resultado', pf_presumido: 'PF — presumido 20% da receita', nenhum: 'Não considerar',
  se_mais_rentavel: 'Só se for mais rentável', sempre: 'Sempre',
  avista: 'À vista', financiado: 'Financiado', price: 'Tabela Price', sac: 'SAC',
  baixo: 'Para baixo', proximo: 'Mais próximo', cima: 'Para cima'
};

function selo(def) {
  const f = def.fonte ? fonte(def.fonte) : null;
  const dica = [def.nota, f ? `Fonte: ${f.nome} (${f.data})` : ''].filter(Boolean).join(' — ');
  return `<span class="selo selo-${esc(def.origem)}" title="${esc(dica || ROTULO_ORIGEM[def.origem])}">${esc(ROTULO_ORIGEM[def.origem] || def.origem)}</span>`;
}

function campoHTML(prefixo, campo, def, valor) {
  const id = `${prefixo}-${campo}`;
  let input;
  if (def.tipo === 'opcao') {
    input = `<select id="${id}" data-campo="${esc(campo)}">${def.opcoes.map(o => `<option value="${esc(o)}"${o === valor ? ' selected' : ''}>${esc(ROTULOS_OPCAO[o] || o)}</option>`).join('')}</select>`;
  } else if (def.tipo === 'booleano') {
    input = `<input type="checkbox" id="${id}" data-campo="${esc(campo)}"${valor ? ' checked' : ''}>`;
  } else if (def.tipo === 'texto') {
    input = `<input type="date" id="${id}" data-campo="${esc(campo)}" value="${esc(valor)}">`;
  } else {
    const v = ehFracao(def) ? +(valor * 100).toFixed(6) : valor;
    const passo = def.tipo === 'inteiro' ? 1 : 'any';
    const min = def.min !== undefined ? ` min="${ehFracao(def) ? def.min * 100 : def.min}"` : '';
    const max = def.max !== undefined ? ` max="${ehFracao(def) ? def.max * 100 : def.max}"` : '';
    input = `<input type="number" inputmode="decimal" id="${id}" data-campo="${esc(campo)}" value="${esc(v)}" step="${passo}"${min}${max}>`;
  }
  const nota = def.nota ? `<small class="nota">${esc(def.nota)}</small>` : '';
  return `<div class="campo${def.tipo === 'booleano' ? ' campo-check' : ''}"><label for="${id}">${esc(def.rotulo)}${unidadeTela(def) ? ` <span class="un">(${esc(unidadeTela(def))})</span>` : ''}</label>${input}${selo(def)}${nota}</div>`;
}

/**
 * Renderiza os campos agrupados. `aoMudar(campo, valor)` recebe o valor já na
 * unidade do motor (frações, números). Valores vazios/invalidos chegam como string
 * para a validação do motor rejeitar com mensagem.
 */
export function renderFormulario(el, prefixo, esquema, valores, aoMudar, { grupos = null } = {}) {
  const porGrupo = {};
  for (const [campo, def] of Object.entries(esquema)) {
    const g = def.grupo || 'Parâmetros';
    if (grupos && !grupos.includes(g)) continue;
    (porGrupo[g] ||= []).push(campoHTML(prefixo, campo, def, valores[campo]));
  }
  el.innerHTML = Object.entries(porGrupo).map(([g, campos]) =>
    `<fieldset class="grupo"><legend>${esc(g)}</legend><div class="grade-campos">${campos.join('')}</div></fieldset>`).join('');
  el.oninput = el.onchange = ev => {
    const t = ev.target;
    const campo = t.dataset?.campo;
    if (!campo || !esquema[campo]) return;
    const def = esquema[campo];
    let v;
    if (def.tipo === 'booleano') v = t.checked;
    else if (def.tipo === 'opcao' || def.tipo === 'texto') v = t.value;
    else {
      const n = t.value === '' ? NaN : Number(t.value);
      v = Number.isFinite(n) ? (ehFracao(def) ? n / 100 : n) : t.value;
    }
    if (ev.type === 'input' && (def.tipo === 'opcao' || def.tipo === 'booleano')) return;
    aoMudar(campo, v);
  };
}

export function marcarErros(el, erros) {
  el.querySelectorAll('.campo.invalido').forEach(c => c.classList.remove('invalido'));
  for (const e of erros) {
    const inp = el.querySelector(`[data-campo="${CSS.escape(e.campo)}"]`);
    if (inp) inp.closest('.campo')?.classList.add('invalido');
  }
}
