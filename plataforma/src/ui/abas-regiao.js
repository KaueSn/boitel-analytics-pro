// Aba Região & logística: onde comprar, onde engordar e para onde vender —
// distâncias, frete estimado, frigoríficos com SIF, terra (VTN INCRA) e links de pesquisa.
import { esc, moeda, num, aviso, tabela, kpi } from './formato.js';
import { MUNICIPIOS } from '../engine/municipios.js';
import { municipio, distanciaEstimadaKm, fretePorCabeca, frigorificosProximos, CAMINHOES, FRETE_PADRAO } from '../engine/logistica.js';
import { FONTE_FRIGORIFICOS } from '../engine/frigorificos.js';
import { vtnDoMunicipio, FONTE_TERRA } from '../engine/terra.js';

export const LOGISTICA_PADRAO = { compra: 'Uberlândia|MG', boitel: 'Uberlândia|MG', nomeBoitel: '', venda: 'auto', caminhao: 'carreta', fixoViagem: FRETE_PADRAO.fixoViagem, porKm: FRETE_PADRAO.porKm };

const NOMES_CAMINHAO = { truck: 'Truck (~15 m²)', carreta: 'Carreta 1 piso (~30 m²)', romeuJulieta: 'Romeu e Julieta (~45 m²)', bitrem: 'Bitrem (~55 m²)' };
const rotuloCidade = m => `${m[1]} - ${m[4]}`;

/** Garante um objeto de logística válido (vindo de arquivo, rascunho ou conta). */
export function normalizarLogistica(b) {
  const o = { ...LOGISTICA_PADRAO };
  if (!b || typeof b !== 'object') return o;
  for (const k of ['compra', 'boitel']) if (typeof b[k] === 'string' && cidadeDe(b[k])) o[k] = b[k];
  if (typeof b.nomeBoitel === 'string') o.nomeBoitel = b.nomeBoitel.slice(0, 80);
  if (b.venda === 'auto' || Number.isInteger(b.venda)) o.venda = b.venda;
  if (CAMINHOES[b.caminhao]) o.caminhao = b.caminhao;
  if (Number.isFinite(b.fixoViagem) && b.fixoViagem >= 0 && b.fixoViagem <= 50000) o.fixoViagem = b.fixoViagem;
  if (Number.isFinite(b.porKm) && b.porKm >= 0 && b.porKm <= 200) o.porKm = b.porKm;
  return o;
}

function cidadeDe(chave) {
  const [nome, uf] = String(chave).split('|');
  return nome && uf ? municipio(nome, uf) : null;
}

function chaveDoTexto(texto) {
  const m = String(texto).match(/^(.*)\s+-\s+([A-Z]{2})$/);
  return m && municipio(m[1], m[2]) ? `${municipio(m[1], m[2])[1]}|${m[2]}` : null;
}

function linkMapa(busca) {
  return `https://www.google.com/maps/search/${encodeURIComponent(busca)}`;
}

export const regiao = {
  forms(el, ctx) {
    const L = ctx.estado.filtros.logistica = normalizarLogistica(ctx.estado.filtros.logistica);
    const cid = k => { const m = cidadeDe(L[k]); return m ? rotuloCidade(m) : ''; };
    el.innerHTML = `
      <datalist id="lista-cidades">${MUNICIPIOS.map(m => `<option value="${esc(rotuloCidade(m))}">`).join('')}</datalist>
      <div class="cartao"><h3>Onde vai acontecer a operação?</h3>
        <p class="nota">Digite o nome da cidade e escolha na lista (todos os municípios do Brasil). As distâncias são estimadas em linha reta × ${FRETE_PADRAO.fatorRota} (fator de estrada); confirme a rota real.</p>
        <div class="grade-campos">
          <div class="campo"><label for="lg-compra">Cidade onde vai comprar os animais</label><input id="lg-compra" list="lista-cidades" value="${esc(cid('compra'))}" autocomplete="off"></div>
          <div class="campo"><label for="lg-boitel">Cidade do boitel</label><input id="lg-boitel" list="lista-cidades" value="${esc(cid('boitel'))}" autocomplete="off"></div>
          <div class="campo"><label for="lg-nome">Nome do boitel (opcional)</label><input id="lg-nome" maxlength="80" value="${esc(L.nomeBoitel)}"></div>
          <div class="campo"><label for="lg-caminhao">Tipo de caminhão</label><select id="lg-caminhao">${Object.entries(NOMES_CAMINHAO).map(([k, v]) => `<option value="${k}"${k === L.caminhao ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
          <div class="campo"><label for="lg-venda">Frigorífico de venda</label><select id="lg-venda"></select></div>
        </div>
        <details><summary>Ajustar a fórmula do frete</summary>
          <div class="grade-campos">
            <div class="campo"><label for="lg-fixo">Custo fixo por viagem <span class="un">(R$)</span></label><input id="lg-fixo" type="number" min="0" step="any" value="${L.fixoViagem}"></div>
            <div class="campo"><label for="lg-km">Custo por km rodado <span class="un">(R$/km)</span></label><input id="lg-km" type="number" min="0" step="any" value="${L.porKm}"></div>
          </div>
          <p class="nota">Padrão calibrado nas faixas publicadas por O Pecuarista (02/05/2026; fonte secundária, sem revisão técnica): ~R$ 110/cab a 100 km e ~R$ 275/cab a 450 km numa carreta de boi gordo. Troque pela cotação da transportadora.</p>
        </details>
        <div id="lg-msg" role="status" aria-live="polite"></div>
      </div>`;
    const preencherVenda = () => {
      const b = cidadeDe(L.boitel);
      const sel = el.querySelector('#lg-venda');
      const lista = b ? frigorificosProximos(b, 15) : [];
      sel.innerHTML = `<option value="auto">Mais próximo do boitel (automático)</option>` + lista.map(f => `<option value="${f.sif}"${f.sif === L.venda ? ' selected' : ''}>${esc(f.nome)} — ${esc(f.municipio)}/${f.uf} (~${num(f.distanciaKm)} km)</option>`).join('');
      if (L.venda !== 'auto' && !lista.some(f => f.sif === L.venda)) L.venda = 'auto';
    };
    preencherVenda();
    const msg = t => { el.querySelector('#lg-msg').innerHTML = t ? aviso(t, 'risco') : ''; };
    const cidadeInput = (id, campo) => {
      el.querySelector(id).onchange = e => {
        const k = chaveDoTexto(e.target.value);
        if (!k) { msg('Cidade não encontrada. Escolha uma opção da lista (ex.: "Uberaba - MG").'); return; }
        msg('');
        L[campo] = k;
        if (campo === 'boitel') preencherVenda();
        ctx.recalcular();
      };
    };
    cidadeInput('#lg-compra', 'compra');
    cidadeInput('#lg-boitel', 'boitel');
    el.querySelector('#lg-nome').oninput = e => { L.nomeBoitel = e.target.value.slice(0, 80); ctx.salvarRascunho(); };
    el.querySelector('#lg-caminhao').onchange = e => { L.caminhao = e.target.value; ctx.recalcular(); };
    el.querySelector('#lg-venda').onchange = e => { L.venda = e.target.value === 'auto' ? 'auto' : Number(e.target.value); ctx.recalcular(); };
    el.querySelector('#lg-fixo').oninput = e => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) { L.fixoViagem = v; ctx.recalcular(); } };
    el.querySelector('#lg-km').oninput = e => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) { L.porKm = v; ctx.recalcular(); } };
  },

  resultados(el, ctx) {
    const { res, estado } = ctx;
    const L = normalizarLogistica(estado.filtros.logistica);
    const compra = cidadeDe(L.compra), boitel = cidadeDe(L.boitel);
    if (!compra || !boitel) { el.innerHTML = aviso('Escolha as cidades de compra e do boitel.', 'info'); return; }
    const p = res.val.lote, area = CAMINHOES[L.caminhao];
    const opFrete = { areaM2: area, fixoViagem: L.fixoViagem, porKm: L.porKm };
    const proximos = frigorificosProximos(boitel, 10);
    const venda = L.venda === 'auto' ? proximos[0] : frigorificosProximos(boitel, 200).find(f => f.sif === L.venda) || proximos[0];
    const dEntrada = distanciaEstimadaKm(compra, boitel);
    const fEntrada = fretePorCabeca(dEntrada, p.pesoEntradaKg, opFrete);
    const fSaida = venda ? fretePorCabeca(venda.distanciaKm, res.lote.animal.pesoAbateKg, opFrete) : null;
    const vtnB = vtnDoMunicipio(boitel[0]), vtnC = vtnDoMunicipio(compra[0]);
    const fretesAplicados = Math.abs(p.freteEntradaCab - fEntrada.porCabeca) < 0.01 && (!fSaida || Math.abs(p.freteSaidaCab - fSaida.porCabeca) < 0.01);
    const terraAplicada = vtnB && res.val.patrimonio.precoHa === vtnB.med;
    const nomeB = L.nomeBoitel ? `${L.nomeBoitel} (${boitel[1]})` : boitel[1];
    el.innerHTML = `
      <div class="kpis">
        ${kpi('Compra → boitel', `~${num(dEntrada)} km`, { sub: `${esc(compra[1])} → ${esc(nomeB)}` })}
        ${kpi('Frete de entrada estimado', moeda(fEntrada.porCabeca, 2) + '/cab', { sub: `${fEntrada.cabecasPorViagem} cab/viagem de ${num(p.pesoEntradaKg)} kg · ${moeda(fEntrada.custoViagem)}/viagem` })}
        ${kpi('Boitel → frigorífico', venda ? `~${num(venda.distanciaKm)} km` : '—', { sub: venda ? `${esc(venda.nome)} (${esc(venda.municipio)}/${venda.uf})` : 'nenhum frigorífico na base' })}
        ${kpi('Frete de saída estimado', fSaida ? moeda(fSaida.porCabeca, 2) + '/cab' : '—', { sub: fSaida ? `${fSaida.cabecasPorViagem} cab/viagem de ${num(res.lote.animal.pesoAbateKg)} kg` : '' })}
        ${kpi('Fretes no lote', moeda(res.lote.cabecas * (fEntrada.porCabeca + (fSaida ? fSaida.porCabeca * (1 - p.mortalidadePct) : 0))), { sub: `${res.lote.cabecas} cabeças` })}
      </div>
      <div class="cartao"><div class="botoes"><button class="btn" id="lg-usar"${fretesAplicados ? ' disabled' : ''}>${fretesAplicados ? 'Fretes aplicados ✓' : 'Usar estes fretes nas premissas'}</button></div>
        <p class="nota">Premissas atuais: entrada ${moeda(p.freteEntradaCab, 2)}/cab, saída ${moeda(p.freteSaidaCab, 2)}/cab. Na venda ao frigorífico, o frete costuma ser pago por ele e já vem descontado no preço; nesse caso, use frete de saída 0 nas premissas.</p></div>
      <section class="cartao"><h3>Frigoríficos com SIF mais próximos do boitel</h3>
        ${tabela(['Frigorífico', 'Município', 'SIF', 'Abate (cab/h)', 'Distância est.', 'Frete est./cab'], proximos.map(f => [esc(f.nome), `${esc(f.municipio)}/${f.uf}`, String(f.sif), esc(f.capacidade), `~${num(f.distanciaKm)} km`, moeda(fretePorCabeca(f.distanciaKm, res.lote.animal.pesoAbateKg, opFrete).porCabeca, 2)]))}
        <p class="nota">Fonte: ${esc(FONTE_FRIGORIFICOS.nome)}, arquivo de ${esc(FONTE_FRIGORIFICOS.data.split('-').reverse().join('/'))}. Registro ativo não garante que a planta esteja comprando boi na sua região nem as condições de pagamento. Ligue antes e pergunte preço, prazo, bonificações e quem paga o frete.</p></section>
      <section class="cartao"><h3>Terra na região (Valor da Terra Nua — INCRA 2026)</h3>
        ${tabela(['Local', 'Região rural', 'VTN mínimo', 'VTN médio', 'VTN máximo'], [[esc(nomeB), vtnB ? esc(vtnB.nome) : 'sem dado', moeda(vtnB?.min), moeda(vtnB?.med), moeda(vtnB?.max)], [esc(compra[1]) + ' (compra)', vtnC ? esc(vtnC.nome) : 'sem dado', moeda(vtnC?.min), moeda(vtnC?.med), moeda(vtnC?.max)]].map(l => l.map((c, i) => (i >= 2 ? c + (c !== '—' ? '/ha' : '') : c))))}
        ${aviso('O VTN é a terra sem benfeitorias, usado para fins fiscais, e costuma ficar bem abaixo do preço de uma fazenda formada. Use como piso e confirme o preço de mercado com corretores, anúncios e laudo de avaliação.', 'info')}
        <div class="botoes">${vtnB ? `<button class="btn sec" id="lg-terra"${terraAplicada ? ' disabled' : ''}>${terraAplicada ? 'VTN aplicado ✓ (lembre: é um piso)' : `Usar VTN médio (${moeda(vtnB.med)}/ha) na projeção`}</button>` : ''}<a class="btn sec" href="${esc(FONTE_TERRA.url)}" target="_blank" rel="noopener noreferrer">Abrir a pauta do INCRA</a></div>
        <p class="nota">Preço da terra usado hoje na aba Patrimônio: ${moeda(res.val.patrimonio.precoHa)}/ha.</p></section>
      <section class="cartao"><h3>Pesquisar boitéis, gado e terras perto de ${esc(boitel[1])}</h3>
        <p>Não existe cadastro oficial de boitéis nem de vendedores de gado. Use as buscas abaixo (abrem o Google Maps) e confira cada contato: visite, peça referências e o contrato por escrito.</p>
        <div class="botoes">
          <a class="btn sec" target="_blank" rel="noopener noreferrer" href="${linkMapa('boitel confinamento perto de ' + boitel[1] + ' ' + boitel[4])}">Boitéis perto de ${esc(boitel[1])}</a>
          <a class="btn sec" target="_blank" rel="noopener noreferrer" href="${linkMapa('leilão de gado perto de ' + compra[1] + ' ' + compra[4])}">Leilões de gado perto de ${esc(compra[1])}</a>
          <a class="btn sec" target="_blank" rel="noopener noreferrer" href="${linkMapa('fazenda à venda perto de ' + boitel[1] + ' ' + boitel[4])}">Fazendas à venda perto de ${esc(boitel[1])}</a>
          <a class="btn sec" target="_blank" rel="noopener noreferrer" href="${linkMapa('sindicato rural ' + compra[1] + ' ' + compra[4])}">Sindicato rural de ${esc(compra[1])}</a>
        </div>
        <p class="nota">Preços de boi gordo e de reposição: veja Premissas → "Onde consultar os preços da sua região".</p></section>`;
    el.querySelector('#lg-usar').onclick = () => {
      estado.lote.freteEntradaCab = Math.round(fEntrada.porCabeca * 100) / 100;
      if (fSaida) estado.lote.freteSaidaCab = Math.round(fSaida.porCabeca * 100) / 100;
      ctx.recalcular();
    };
    const bt = el.querySelector('#lg-terra');
    if (bt) bt.onclick = () => { estado.patrimonio.precoHa = vtnB.med; ctx.recalcular(); };
  }
};
