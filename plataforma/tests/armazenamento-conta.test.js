// Adaptador da conta (Firestore) com um banco falso em memória.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximoSlot, paraDocumento, criarArmazenamentoConta, LIMITE_PROJETOS } from '../src/ui/armazenamento-conta.js';

function bancoFalso() {
  const docs = new Map();
  const colecao = {
    async get() { return { docs: [...docs].map(([id, d]) => ({ id, data: () => structuredClone(d) })) }; },
    doc(id) {
      return {
        async get() { return { id, exists: docs.has(id), data: () => structuredClone(docs.get(id)) }; },
        async set(d) { docs.set(id, structuredClone(d)); },
        async delete() { docs.delete(id); }
      };
    }
  };
  return { docs, db: { collection: () => ({ doc: () => ({ collection: () => colecao }) }) } };
}

const estado = (nome = 'Plano') => ({ versao: 1, nome, filtros: { regiao: 'MG' }, lote: { gmdKg: 1.6 } });
const CAMPOS_REGRA = ['formato', 'nome', 'estado', 'resumo', 'versoes', 'criadoEm', 'atualizadoEm'];

test('ids p00…p49: primeiro livre e null quando cheio', () => {
  assert.equal(proximoSlot([]), 'p00');
  assert.equal(proximoSlot(['p00', 'p01', 'p03']), 'p02');
  assert.equal(proximoSlot(Array.from({ length: LIMITE_PROJETOS }, (_, i) => 'p' + String(i).padStart(2, '0'))), null);
});

test('documento só tem os campos aceitos pela regra e sem Infinity', () => {
  const d = paraDocumento({ nome: 'x'.repeat(200), estado: estado(), resumo: { precoEquilibrio: Infinity }, versoes: Array(15).fill({}), criadoEm: 'a', atualizadoEm: 'b' });
  assert.deepEqual(Object.keys(d).sort(), [...CAMPOS_REGRA].sort());
  assert.equal(d.formato, 1);
  assert.equal(d.nome.length, 120);
  assert.equal(d.resumo.precoEquilibrio, null);
  assert.equal(d.versoes.length, 10);
});

test('salvar, atualizar (mantém criadoEm e guarda versão), duplicar e remover', async () => {
  const { db, docs } = bancoFalso();
  const a = criarArmazenamentoConta(db, 'u1');
  const r1 = await a.salvar(estado('A'), { lucro: 1 });
  assert.equal(r1.id, 'p00');
  const r2 = await a.salvar(estado('A2'), { lucro: 2 }, r1.id);
  assert.equal(r2.id, 'p00');
  assert.equal(r2.criadoEm, r1.criadoEm);
  assert.equal(r2.versoes.length, 1);
  const dup = await a.duplicar('p00');
  assert.equal(dup.id, 'p01');
  assert.match(dup.nome, /cópia/);
  assert.equal((await a.listar()).length, 2);
  await a.remover('p00');
  assert.equal(docs.size, 1);
  assert.equal(await a.obter('p00'), null);
});

test('recusa o 51º projeto', async () => {
  const { db } = bancoFalso();
  const a = criarArmazenamentoConta(db, 'u1');
  for (let i = 0; i < LIMITE_PROJETOS; i++) await a.salvar(estado('P' + i), null);
  await assert.rejects(() => a.salvar(estado('extra'), null), /Limite de 50/);
});
