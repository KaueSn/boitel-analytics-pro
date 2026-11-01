// Armazenamento na conta do cliente: Firestore em users/{uid}/projetos/{pid}.
// Mesma interface de armazenamentoLocal. Depende das regras propostas em
// config/firestore-projetos.rules (ids p00…p49, esquema fechado, só o dono acessa).

export const LIMITE_PROJETOS = 50;

/** Primeiro id livre entre p00 e p49, ou null se a conta já tem 50 projetos. */
export function proximoSlot(idsUsados) {
  const usados = new Set(idsUsados);
  for (let i = 0; i < LIMITE_PROJETOS; i++) {
    const id = 'p' + String(i).padStart(2, '0');
    if (!usados.has(id)) return id;
  }
  return null;
}

// Infinity/NaN viram null (o JSON faz isso), e o resultado só tem tipos aceitos pelo Firestore.
const limpo = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

/** Registro da interface → documento do Firestore (só os campos permitidos pela regra). */
export function paraDocumento(reg) {
  return {
    formato: 1,
    nome: String(reg.nome || 'Sem nome').slice(0, 120),
    estado: limpo(reg.estado),
    resumo: reg.resumo ? limpo(reg.resumo) : null,
    versoes: limpo((reg.versoes || []).slice(-10)),
    criadoEm: reg.criadoEm,
    atualizadoEm: reg.atualizadoEm
  };
}

export function deDocumento(id, d) {
  return { id, nome: d.nome, estado: d.estado, resumo: d.resumo || null, versoes: d.versoes || [], criadoEm: d.criadoEm, atualizadoEm: d.atualizadoEm };
}

/** `db` = firebase.firestore() (SDK compat). */
export function criarArmazenamentoConta(db, uid) {
  const col = () => db.collection('users').doc(uid).collection('projetos');
  return {
    tipo: 'conta',
    async listar() {
      const snap = await col().get();
      return snap.docs.map(d => deDocumento(d.id, d.data())).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    },
    async obter(id) {
      const d = await col().doc(id).get();
      return d.exists ? deDocumento(d.id, d.data()) : null;
    },
    async salvar(estado, resumo, id = null) {
      const agora = new Date().toISOString();
      const existente = id ? await this.obter(id) : null;
      let pid = existente?.id;
      if (!pid) {
        pid = proximoSlot((await col().get()).docs.map(d => d.id));
        if (!pid) throw new Error(`Limite de ${LIMITE_PROJETOS} projetos na conta. Exclua algum antes.`);
      }
      const reg = {
        id: pid,
        nome: estado.nome,
        estado: structuredClone(estado),
        resumo,
        criadoEm: existente?.criadoEm || agora,
        atualizadoEm: agora,
        versoes: existente ? [...(existente.versoes || []).slice(-9), { em: existente.atualizadoEm, resumo: existente.resumo }] : []
      };
      await col().doc(pid).set(paraDocumento(reg));
      return reg;
    },
    async duplicar(id) {
      const orig = await this.obter(id);
      if (!orig) throw new Error('Projeto não encontrado.');
      return this.salvar({ ...orig.estado, nome: orig.nome + ' (cópia)' }, orig.resumo);
    },
    async remover(id) { await col().doc(id).delete(); }
  };
}
