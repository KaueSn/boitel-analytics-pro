// Exportação: planilha CSV (padrão Excel pt-BR: ";" e vírgula decimal) e relatório para PDF (impressão).
import { ESQUEMAS } from './estado.js';
import { FONTES, DATA_COLETA } from '../engine/mercado.js';
import { ROTULO_ORIGEM } from '../engine/premissas.js';
import { baixarArquivo } from './armazenamento.js';
import { esc, moeda, pct, num, data, hojeISO, valorPremissa } from './formato.js';

const celula = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 1e4) / 1e4).replace('.', ',') : '';
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const linhaCSV = arr => arr.map(celula).join(';');

export function exportarCSV(estado, res) {
  const L = [];
  L.push(linhaCSV(['Plataforma Stratum — exportação', hojeISO()]));
  L.push(linhaCSV(['Simulação', estado.nome]));
  L.push(linhaCSV(['Cenário', estado.filtros.cenario, 'Região de referência', estado.filtros.regiao]));
  L.push(linhaCSV(['Dados de mercado coletados em', DATA_COLETA]));
  L.push('');
  L.push(linhaCSV(['PREMISSAS', 'Campo', 'Valor', 'Unidade', 'Origem', 'Fonte']));
  for (const [bloco, esq] of Object.entries(ESQUEMAS)) {
    for (const [campo, def] of Object.entries(esq)) {
      L.push(linhaCSV([bloco, def.rotulo, estado[bloco][campo], def.unidade || '', ROTULO_ORIGEM[def.origem] || def.origem, def.fonte || '']));
    }
  }
  L.push('');
  L.push(linhaCSV(['DRE DO LOTE (cenário filtrado)', 'R$']));
  for (const l of res.lote.dre) L.push(linhaCSV([l.rotulo, l.valor]));
  L.push(linhaCSV(['Cabeças compradas', res.lote.cabecas]));
  L.push(linhaCSV(['Arrobas vendidas (@ de 15 kg de carcaça)', res.lote.arrobasVendidas]));
  L.push(linhaCSV(['ROI do ciclo (fração)', res.lote.roiCiclo]));
  L.push(linhaCSV(['Preço de equilíbrio (R$/@)', res.lote.precoEquilibrio]));
  L.push('');
  L.push(linhaCSV(['PROJEÇÃO ANUAL', 'Ano', 'Fase', 'Caixa', 'Estoque animais (custo)', 'Terra', 'Dívida', 'Patrimônio líquido', 'Lucro dos lotes no ano', 'Rendimento do caixa no ano']));
  for (const a of res.projecao.anos) L.push(linhaCSV(['', a.ano, a.fase, a.caixa, a.estoqueAnimais, a.terra, a.divida, a.patrimonioLiquido, a.lucroLotesAno, a.rendimentoCaixaAno]));
  L.push('');
  L.push(linhaCSV(['FONTES', 'Nome', 'Data', 'Valor', 'Unidade', 'Limitações', 'URL']));
  for (const f of FONTES) L.push(linhaCSV(['', f.nome, f.data, f.valor, f.unidade, f.limitacoes, f.url]));
  baixarArquivo(`stratum-${estado.nome.replace(/[^\w-]+/g, '_').slice(0, 40)}.csv`, '﻿' + L.join('\r\n'), 'text/csv;charset=utf-8');
}

/** Monta o relatório imprimível e abre o diálogo de impressão ("Salvar como PDF"). */
export function imprimirRelatorio(estado, res) {
  const el = document.getElementById('relatorio');
  const l = res.lote;
  const premissas = Object.entries(ESQUEMAS.lote).map(([k, d]) =>
    `<tr><td>${esc(d.rotulo)}</td><td>${valorPremissa(d, estado.lote[k])}</td><td>${esc(d.unidade || '')}</td><td>${esc(ROTULO_ORIGEM[d.origem])}</td></tr>`).join('');
  el.innerHTML = `
    <h1>${esc(estado.nome)}</h1>
    <p>Gerado em ${esc(data(hojeISO()))} · cenário <b>${esc(estado.filtros.cenario)}</b> · dados de mercado de ${esc(data(DATA_COLETA))}.
    Estudo educacional e analítico: não é recomendação de investimento nem garantia de resultado.</p>
    <h2>Resumo do lote</h2>
    <table><tr><td>Cabeças</td><td>${num(l.cabecas)}</td><td>Capital empregado</td><td>${moeda(l.capitalEmpregado)}</td></tr>
    <tr><td>Lucro líquido</td><td>${moeda(l.lucroLiquido)}</td><td>Lucro econômico (após CDI)</td><td>${moeda(l.lucroEconomico)}</td></tr>
    <tr><td>ROI do ciclo</td><td>${pct(l.roiCiclo, 2)}</td><td>CDI líquido no período</td><td>${pct(l.cdiLiquidoPeriodo, 2)}</td></tr>
    <tr><td>Preço de equilíbrio</td><td>${moeda(l.precoEquilibrio, 2)}/@</td><td>Margem de segurança</td><td>${pct(l.margemSegurancaPreco)}</td></tr></table>
    <h2>DRE</h2><table>${l.dre.map(d => `<tr><td>${esc(d.rotulo)}</td><td>${moeda(d.valor, 2)}</td></tr>`).join('')}</table>
    <h2>Projeção patrimonial</h2><table><tr><th>Ano</th><th>Fase</th><th>Caixa</th><th>Terra</th><th>Dívida</th><th>PL</th></tr>
    ${res.projecao.anos.map(a => `<tr><td>${a.ano}</td><td>${esc(a.fase)}</td><td>${moeda(a.caixa)}</td><td>${moeda(a.terra)}</td><td>${moeda(a.divida)}</td><td>${moeda(a.patrimonioLiquido)}</td></tr>`).join('')}</table>
    <h2>Alertas</h2><ul>${[...l.avisos, ...res.projecao.alertas.filter(a => a.tipo !== 'info').slice(0, 15).map(a => `${data(a.data)}: ${a.mensagem}`)].map(t => `<li>${esc(t)}</li>`).join('') || '<li>Nenhum.</li>'}</ul>
    <h2>Premissas do lote</h2><table><tr><th>Premissa</th><th>Valor</th><th>Unidade</th><th>Origem</th></tr>${premissas}</table>
    <h2>Fontes</h2><ul>${FONTES.map(f => `<li>${esc(f.nome)} — ${esc(f.data)} — ${esc(f.unidade)}. ${esc(f.limitacoes)} ${esc(f.url)}</li>`).join('')}</ul>`;
  window.print();
}
