// Abas de gestão: Premissas, Simulações (histórico/comparação/backup), Fontes & método.
import { esc, moeda, num, pct, data, aviso, tabela, valorPremissa } from './formato.js';
import { renderFormulario } from './formulario.js';
import { ESQUEMA_LOTE, PREMISSAS_PADRAO, camposPendentes, ROTULO_ORIGEM } from '../engine/premissas.js';
import { REGIOES, FONTES, DATA_COLETA, precoReposicaoKgInterpolado } from '../engine/mercado.js';
import { armazenamento, copiarLocalParaAtivo, exportarBackup, importarArquivo } from './armazenamento.js';
import { normalizarEstado } from './estado.js';
import { exportarCSV, imprimirRelatorio } from './exportar.js';

// ---------------- Premissas ----------------
export const premissas = {
  forms(el, ctx) {
    const reg = ctx.estado.filtros.regiao;
    el.innerHTML = `
      <div class="cartao"><h3>Ponto de partida</h3>
        <p>As premissas iniciais são as do dossiê. Use os botões para trocar pelos valores de referência pesquisados (${esc(data(DATA_COLETA))}) da região escolhida no filtro. Todos os campos continuam editáveis.</p>
        <div class="botoes">
          <button class="btn" id="btn-mercado">Aplicar referência de mercado — ${esc(REGIOES[reg].nome)}</button>
          <button class="btn sec" id="btn-dossie">Restaurar premissas do dossiê</button>
        </div>
        <p class="legenda">${Object.entries(ROTULO_ORIGEM).map(([k, v]) => `<span class="selo selo-${k}">${esc(v)}</span>`).join(' ')}</p>
        ${aviso(`Pendentes de cotação: ${camposPendentes().map(c => c.rotulo).join('; ')}.`, 'risco')}
      </div>
      <div id="f-lote"></div>`;
    renderFormulario(el.querySelector('#f-lote'), 'lt', ESQUEMA_LOTE, ctx.estado.lote, (c, v) => ctx.atualizar('lote', c, v));
    el.querySelector('#btn-mercado').onclick = () => {
      const r = REGIOES[reg];
      const peso = ctx.estado.lote.pesoEntradaKg;
      Object.assign(ctx.estado.lote, {
        precoVendaArroba: r.precoVendaArroba,
        precoCompraCab: Math.round(precoReposicaoKgInterpolado(reg, peso) * peso * 100) / 100,
        freteEntradaCab: r.freteEntradaCab, freteSaidaCab: r.freteSaidaCab
      });
      if (r.precoTerraHa) ctx.estado.patrimonio.precoHa = r.precoTerraHa;
      ctx.recarregarAba();
    };
    el.querySelector('#btn-dossie').onclick = () => {
      ctx.estado.lote = { ...PREMISSAS_PADRAO, capitalInicial: ctx.estado.lote.capitalInicial };
      ctx.recarregarAba();
    };
  },
  resultados(el, { res }) {
    const l = res.lote;
    el.innerHTML = `<div class="cartao resumo-fixo">Com estas premissas: <b>${num(l.cabecas)}</b> cabeças · capital ${moeda(l.capitalEmpregado)} · lucro líquido <b class="${l.lucroLiquido >= 0 ? 'pos' : 'neg'}">${moeda(l.lucroLiquido)}</b> por lote · equilíbrio ${moeda(l.precoEquilibrio, 2)}/@</div>`;
  }
};

// ---------------- Simulações ----------------
function resumoDe(res) {
  const l = res.lote;
  return { cabecas: l.cabecas, lucroLiquido: l.lucroLiquido, roiAnual: l.roiAnual, precoEquilibrio: l.precoEquilibrio, patrimonioFinal: res.projecao.resumo.patrimonioFinal, anoFazenda: res.projecao.resumo.anoCompraFazenda };
}

export const simulacoes = {
  forms(el, ctx) {
    el.innerHTML = `
      <div class="cartao"><h3>Simulação aberta</h3>
        <div class="linha-form"><label for="nome-sim">Nome</label><input id="nome-sim" maxlength="120" value="${esc(ctx.estado.nome)}">
        <button class="btn" id="btn-salvar">Salvar</button><button class="btn sec" id="btn-salvar-novo">Salvar como nova</button></div>
        <div class="botoes">
          <button class="btn sec" id="btn-csv">Exportar planilha (CSV)</button>
          <button class="btn sec" id="btn-pdf">Relatório em PDF (imprimir)</button>
          <button class="btn sec" id="btn-backup">Backup de todas (JSON)</button>
          <label class="btn sec" for="arq-importar">Importar JSON</label><input type="file" id="arq-importar" accept="application/json,.json" hidden>
        </div>
        ${armazenamento().tipo === 'conta'
          ? '<p class="nota">As simulações ficam salvas na sua conta (até 50) e aparecem em qualquer dispositivo. Só você tem acesso a elas.</p><button class="btn sec" id="btn-copiar-local">Copiar as simulações deste navegador para a conta</button>'
          : '<p class="nota">As simulações ficam salvas neste navegador e separadas por usuário. Para não perder dados, faça backup em JSON de tempos em tempos.</p>'}
        <div id="msg-sim" role="status" aria-live="polite"></div>
      </div>
      <div class="cartao"><h3>Histórico</h3><div id="lista-sim"></div></div>
      <div class="cartao"><h3>Comparar lado a lado</h3><p class="nota">Marque de 2 a 4 simulações no histórico.</p><div id="comparacao"></div></div>`;
    const msg = (t, tipo = 'ok') => { el.querySelector('#msg-sim').innerHTML = aviso(t, tipo); };
    el.querySelector('#nome-sim').oninput = e => { ctx.estado.nome = e.target.value.slice(0, 120) || 'Sem nome'; ctx.salvarRascunho(); };
    const salvar = async novo => {
      if (!ctx.res?.ok) return msg('Corrija os erros das premissas antes de salvar.', 'risco');
      try {
        const reg = await armazenamento().salvar(ctx.estado, resumoDe(ctx.res), novo ? null : ctx.idAberto());
        ctx.idAberto(reg.id);
        msg(`Salva em ${data(reg.atualizadoEm)}.`);
        this.listar(el, ctx);
      } catch (e) { msg(e.message, 'risco'); }
    };
    el.querySelector('#btn-salvar').onclick = () => salvar(false);
    el.querySelector('#btn-salvar-novo').onclick = () => salvar(true);
    el.querySelector('#btn-csv').onclick = () => ctx.res?.ok && exportarCSV(ctx.estado, ctx.res);
    el.querySelector('#btn-pdf').onclick = () => ctx.res?.ok && imprimirRelatorio(ctx.estado, ctx.res);
    el.querySelector('#btn-backup').onclick = () => exportarBackup();
    const btnCopiar = el.querySelector('#btn-copiar-local');
    if (btnCopiar) btnCopiar.onclick = async () => {
      btnCopiar.disabled = true;
      try {
        const n = await copiarLocalParaAtivo();
        msg(n ? `${n} simulação(ões) copiada(s) para a conta. As cópias do navegador continuam lá.` : 'Não há simulações salvas neste navegador.');
        this.listar(el, ctx);
      } catch (e) { msg('Falha ao copiar: ' + e.message, 'risco'); } finally { btnCopiar.disabled = false; }
    };
    el.querySelector('#arq-importar').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const r = await importarArquivo(f);
        msg(`${r.importadas} simulação(ões) importada(s).${r.erros.length ? ' Campos inválidos foram trocados pelo padrão: ' + r.erros.slice(0, 5).join('; ') : ''}`, r.erros.length ? 'risco' : 'ok');
        this.listar(el, ctx);
      } catch (err) { msg(err.message, 'risco'); }
      e.target.value = '';
    };
    this.listar(el, ctx);
  },
  async listar(el, ctx) {
    const lista = await armazenamento().listar();
    const box = el.querySelector('#lista-sim');
    if (!lista.length) { box.innerHTML = '<p class="vazio">Nenhuma simulação salva.</p>'; return; }
    box.innerHTML = tabela(['', 'Nome', 'Atualizada', 'Lucro/lote', 'Retorno a.a.', 'PL final', 'Versões', 'Ações'], lista.map(s => [
      `<input type="checkbox" class="cmp" value="${esc(s.id)}" aria-label="Comparar ${esc(s.nome)}">`,
      esc(s.nome), data(s.atualizadoEm),
      s.resumo ? moeda(s.resumo.lucroLiquido) : '—', s.resumo ? pct(s.resumo.roiAnual) : '—', s.resumo ? moeda(s.resumo.patrimonioFinal) : '—',
      num((s.versoes || []).length),
      `<button class="btn-mini" data-acao="abrir" data-id="${esc(s.id)}">Abrir</button> <button class="btn-mini" data-acao="dup" data-id="${esc(s.id)}">Duplicar</button> <button class="btn-mini perigo" data-acao="del" data-id="${esc(s.id)}">Excluir</button>`
    ]));
    box.onclick = async ev => {
      const b = ev.target.closest('button[data-acao]');
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.acao === 'abrir') {
        const s = await armazenamento().obter(id);
        if (s) ctx.abrirEstado(normalizarEstado(s.estado).estado, id);
      } else if (b.dataset.acao === 'dup') {
        await armazenamento().duplicar(id); this.listar(el, ctx);
      } else if (b.dataset.acao === 'del' && confirm('Excluir esta simulação? Não dá para desfazer (a menos que exista backup).')) {
        await armazenamento().remover(id); this.listar(el, ctx);
      }
    };
    box.onchange = async () => {
      const ids = [...box.querySelectorAll('.cmp:checked')].map(c => c.value).slice(0, 4);
      const comp = el.querySelector('#comparacao');
      if (ids.length < 2) { comp.innerHTML = ''; return; }
      const sims = (await Promise.all(ids.map(i => armazenamento().obter(i)))).filter(Boolean);
      const resultados = sims.map(s => ctx.calcular(normalizarEstado(s.estado).estado));
      const linha = (rot, f) => [rot, ...resultados.map(r => (r.ok ? f(r) : 'erro'))];
      const campos = ['precoCompraCab', 'precoVendaArroba', 'gmdKg', 'diasCiclo', 'precoArrobaProduzida', 'mortalidadePct', 'modoCobranca'];
      comp.innerHTML = tabela(['Indicador', ...sims.map(s => esc(s.nome))], [
        linha('Cabeças por lote', r => num(r.lote.cabecas)),
        linha('Lucro líquido por lote', r => moeda(r.lote.lucroLiquido)),
        linha('Retorno anual', r => pct(r.lote.roiAnual)),
        linha('Preço de equilíbrio', r => moeda(r.lote.precoEquilibrio, 2)),
        linha('Patrimônio final', r => moeda(r.projecao.resumo.patrimonioFinal)),
        linha('Ano da fazenda', r => r.projecao.resumo.anoCompraFazenda || '—'),
        ...campos.map(c => [esc(ESQUEMA_LOTE[c].rotulo), ...sims.map(s => valorPremissa(ESQUEMA_LOTE[c], s.estado.lote[c]))])
      ]);
    };
  }
};

// ---------------- Fontes & método ----------------
export const fontes = {
  resultados(el) {
    el.innerHTML = `
      <section class="cartao"><h3>Fontes de dados (coletadas em ${esc(data(DATA_COLETA))})</h3>
      ${tabela(['Fonte', 'Data', 'Valor', 'Unidade', 'Limitações'], FONTES.map(f => [f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.nome)}</a>` : esc(f.nome), data(f.data), esc(f.valor), esc(f.unidade), esc(f.limitacoes)]))}
      <p class="nota">A plataforma não busca cotações sozinha. Para atualizar, edite as premissas e registre a nova data. Scot Consultoria: uso apenas como referência pessoal (a reprodução depende de autorização). CEPEA: licença CC BY-NC 4.0.</p></section>
      <section class="cartao"><h3>Convenções e fórmulas principais</h3><ul class="lista">
        <li>1 arroba (@) = 15 kg de carcaça. @ = peso vivo × rendimento de carcaça ÷ 15.</li>
        <li>Peso de saída = peso de entrada + GMD × dias; peso de abate = saída × (1 − quebra).</li>
        <li>@ produzidas = @ saída (RC saída) − @ entrada (RC de entrada do contrato).</li>
        <li>Receita bruta = cabeças vivas × @ por animal × (preço + bonificação). Receita líquida = bruta − Funrural − comissão de venda.</li>
        <li>Custo operacional = compra + comissão + fretes + sanidade + outras + boitel (por @ produzida OU diária). Sem linha extra de mortalidade.</li>
        <li>Lucro líquido = receita líquida − custo operacional − IR. Lucro econômico = lucro líquido − capital × [(1+CDI)^(dias/365) − 1].</li>
        <li>Preço de equilíbrio = custo operacional ÷ (@ vendidas × (1 − Funrural − comissão)) − bonificação.</li>
        <li>Retorno anualizado = (1 + retorno do ciclo)^(ciclos por ano) − 1, com ciclos/ano = mín(365 ÷ giro, limite).</li>
        <li>CDI líquido = capital × [(1+CDI)^(dias/365) − 1] × (1 − alíquota regressiva).</li>
        <li>Hedge: contratos = @ × cobertura ÷ 330; put = máx(K − F, 0) − prêmio − custos; futuro vendido = F₀ − F − custos; físico = F + base.</li>
        <li>Projeção: passo diário, caixa parado rende % do CDI líquido de IR, lote só começa com caixa acima da reserva e dos compromissos de 12 meses da fazenda.</li>
      </ul><p>Documentação completa: <code>plataforma/docs/FORMULAS.md</code>.</p></section>
      <section class="cartao"><h3>Limitações da modelagem</h3><ul class="lista">
        <li>Valores esperados (média): mortalidade fracionária, sem variabilidade individual de peso. Use Monte Carlo para dispersão.</li>
        <li>Estoque de animais avaliado ao custo, sem marcação a mercado.</li>
        <li>IR da atividade descontado por lote; na prática a apuração da PF é anual (livro-caixa ou 20% presumido).</li>
        <li>Valores nominais, sem inflação; tendências de preço são hipóteses do usuário.</li>
        <li>Um lote por vez na projeção (sem lotes escalonados) e recria sem sobreposição de ciclos.</li>
        <li>Preço do boitel por @ produzida usa o custo ICBC como piso até haver cotação; o preço real tende a ser maior.</li>
        <li>Modelo A e C usam valores provisórios (dossiê com valores do Modelo A não foi localizado).</li>
        <li>Monte Carlo usa distribuições escolhidas, não estimadas de série histórica.</li>
      </ul></section>`;
  }
};
