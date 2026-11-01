// Histórico de simulações. Hoje: localStorage do navegador (só neste dispositivo).
// A interface é assíncrona para permitir trocar por um adaptador Firestore
// (users/{uid}/projetos) sem mudar o resto da aplicação — ver docs/INTEGRACAO.md.
import { normalizarEstado } from './estado.js';

let CHAVE = 'stratum_plataforma_simulacoes_v1';
let CHAVE_RASCUNHO = 'stratum_plataforma_rascunho_v1';
const LIMITE = 50;

/** Separa os dados por usuário no mesmo navegador (o domínio github.io é compartilhado). */
export function definirUsuario(id) {
  const sufixo = id ? '_' + String(id).replace(/[^a-zA-Z0-9@._-]/g, '') : '';
  CHAVE = 'stratum_plataforma_simulacoes_v1' + sufixo;
  CHAVE_RASCUNHO = 'stratum_plataforma_rascunho_v1' + sufixo;
}

function ler() {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function gravar(lista) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    return true;
  } catch { return false; }
}

const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export const armazenamentoLocal = {
  tipo: 'local',
  async listar() { return ler().sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)); },
  async obter(id) { return ler().find(s => s.id === id) || null; },
  async salvar(estado, resumo, id = null) {
    const lista = ler();
    const agora = new Date().toISOString();
    const existente = id ? lista.find(s => s.id === id) : null;
    if (!existente && lista.length >= LIMITE) throw new Error(`Limite de ${LIMITE} simulações salvas. Exclua alguma antes.`);
    const reg = existente || { id: novoId(), criadoEm: agora, versoes: [] };
    if (existente) reg.versoes = [...(reg.versoes || []).slice(-9), { em: reg.atualizadoEm, resumo: reg.resumo }];
    Object.assign(reg, { nome: estado.nome, atualizadoEm: agora, estado: structuredClone(estado), resumo });
    if (!existente) lista.push(reg);
    if (!gravar(lista)) throw new Error('Não foi possível gravar no navegador (armazenamento cheio ou bloqueado).');
    return reg;
  },
  async duplicar(id) {
    const orig = await this.obter(id);
    if (!orig) throw new Error('Simulação não encontrada.');
    return this.salvar({ ...orig.estado, nome: orig.nome + ' (cópia)' }, orig.resumo);
  },
  async remover(id) { gravar(ler().filter(s => s.id !== id)); }
};

// Armazenamento em uso: começa no navegador e passa para a conta quando o Firestore aceita.
let ativo = armazenamentoLocal;
export function armazenamento() { return ativo; }
export function usarArmazenamento(a) { ativo = a; }

/** Copia as simulações do navegador para o armazenamento ativo (conta). Não apaga as locais. */
export async function copiarLocalParaAtivo() {
  if (ativo === armazenamentoLocal) return 0;
  const locais = await armazenamentoLocal.listar();
  let n = 0;
  for (const s of locais) {
    await ativo.salvar(normalizarEstado(s.estado).estado, s.resumo || null);
    n++;
  }
  return n;
}

export function salvarRascunho(estado) {
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(estado)); } catch { /* sem armazenamento: segue sem rascunho */ }
}

export function lerRascunho() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null');
    return bruto ? normalizarEstado(bruto).estado : null;
  } catch { return null; }
}

export function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Backup completo (todas as simulações do armazenamento ativo) em JSON. */
export async function exportarBackup() {
  const dados = { formato: 'stratum-plataforma', versao: 1, exportadoEm: new Date().toISOString(), simulacoes: await ativo.listar() };
  baixarArquivo(`stratum-simulacoes-${dados.exportadoEm.slice(0, 10)}.json`, JSON.stringify(dados, null, 2), 'application/json');
}

/** Importa backup ou simulação única. Cada estado é revalidado pelos esquemas. */
export async function importarArquivo(arquivo) {
  if (arquivo.size > 5 * 1024 * 1024) throw new Error('Arquivo maior que 5 MB.');
  const texto = await arquivo.text();
  let json;
  try { json = JSON.parse(texto); } catch { throw new Error('O arquivo não é um JSON válido.'); }
  const itens = Array.isArray(json?.simulacoes) ? json.simulacoes.map(s => s.estado) : [json?.estado || json];
  const erros = [];
  let n = 0;
  for (const bruto of itens.slice(0, LIMITE)) {
    const { estado, erros: e } = normalizarEstado(bruto);
    erros.push(...e);
    await ativo.salvar(estado, null);
    n++;
  }
  return { importadas: n, erros };
}
