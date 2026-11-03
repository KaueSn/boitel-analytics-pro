// Preenchimento guiado: 6 perguntas simples, uma por vez, com explicação.
// No fim grava as premissas, calcula os fretes pela região e abre o Painel.
import { esc, moeda, numeroBR as num } from './formato.js';
import { ESQUEMA_LOTE } from '../engine/premissas.js';
import { MUNICIPIOS } from '../engine/municipios.js';
import { municipio, distanciaEstimadaKm, fretePorCabeca, frigorificosProximos, CAMINHOES } from '../engine/logistica.js';
import { fonte, CONSULTA_PRECOS } from '../engine/mercado.js';
import { normalizarLogistica } from './abas-regiao.js';

const rotulo = m => `${m[1]} - ${m[4]}`;
const cidadeDoTexto = t => { const m = String(t).match(/^(.*)\s+-\s+([A-Z]{2})$/); return m ? municipio(m[1], m[2]) : null; };
const CHAVE_VISTO = 'stratum_plataforma_guiado_visto_v1';

/** Se a pessoa já usou ou dispensou o guiado (para não repetir o convite no Painel). */
export function guiadoJaVisto() {
  try { return localStorage.getItem(CHAVE_VISTO) === '1'; } catch { return false; }
}
export function marcarGuiadoVisto() {
  try { localStorage.setItem(CHAVE_VISTO, '1'); } catch { /* opcional */ }
}

/** Confere o valor contra a faixa do motor; devolve a mensagem de erro ou nada. */
function foraDaFaixa(campo, v, nome) {
  const d = ESQUEMA_LOTE[campo];
  if (!Number.isFinite(v)) return `${nome}: digite um número.`;
  if (v < d.min || v > d.max) return `${nome}: use um valor entre ${d.min.toLocaleString('pt-BR')} e ${d.max.toLocaleString('pt-BR')}.`;
}
const opcoesCom = (lista, atual) => [...new Set([...lista, atual])].sort((a, b) => a - b);

export function abrirGuiado(ctx) {
  const L = normalizarLogistica(ctx.estado.filtros.logistica);
  const lote = ctx.estado.lote;
  const r = { // respostas, começando pelos valores atuais
    capital: lote.capitalInicial, reservaPct: +(lote.reservaPct * 100).toFixed(2),
    compra: rotulo(municipio(...L.compra.split('|'))), boitel: rotulo(municipio(...L.boitel.split('|'))),
    peso: lote.pesoEntradaKg, precoCompra: lote.precoCompraCab,
    dias: lote.diasCiclo, gmd: lote.gmdKg,
    cobranca: lote.modoCobranca, precoArroba: lote.precoArrobaProduzida, diaria: lote.alimentacaoDia + lote.servicoDia,
    precoVenda: lote.precoVendaArroba, frigorificoPagaFrete: true
  };
  const links = ids => '<p class="nota">Onde consultar: ' + CONSULTA_PRECOS.filter(c => ids.some(i => c.nome.includes(i))).map(c => `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.nome)}</a>`).join(' · ') + '. Prefira o preço da sua praça e anote a data.</p>';

  const PASSOS = [
    {
      titulo: 'Quanto você tem para investir?',
      explica: 'É o dinheiro total disponível. Uma parte fica guardada como reserva para imprevistos (doença, atraso no pagamento, queda de preço) e não entra na compra dos animais.',
      html: () => `<label for="g-capital">Capital total (R$)</label><input id="g-capital" inputmode="decimal" value="${r.capital}">
        <label for="g-reserva">Reserva de segurança (%)</label><input id="g-reserva" type="number" min="0" max="90" value="${r.reservaPct}">
        <p class="nota" id="g-nota1"></p>`,
      vivo: el => {
        const nota = () => {
          const c = num(el.querySelector('#g-capital').value), p = num(el.querySelector('#g-reserva').value);
          el.querySelector('#g-nota1').textContent = c > 0 && p >= 0 && p <= 90 ? `Com estes valores, ${moeda(c * (1 - p / 100))} vão para a operação e ${moeda(c * p / 100)} ficam de reserva.` : '';
        };
        el.oninput = nota;
        nota();
      },
      ler: el => {
        r.capital = num(el.querySelector('#g-capital').value); r.reservaPct = num(el.querySelector('#g-reserva').value);
        if (!(r.capital > 0)) return 'Informe um capital maior que zero (ex.: 250000).';
        if (r.capital > ESQUEMA_LOTE.capitalInicial.max) return 'Capital acima do limite aceito.';
        if (!(r.reservaPct >= 0 && r.reservaPct <= 90)) return 'A reserva deve ficar entre 0% e 90%.';
      }
    },
    {
      titulo: 'Onde vai comprar os animais e onde fica o boitel?',
      explica: 'Com as cidades, a plataforma estima a distância, o frete e qual frigorífico com SIF fica mais perto para vender. Comece a digitar e escolha na lista.',
      html: () => `<label for="g-compra">Cidade onde vai comprar os animais</label><input id="g-compra" list="g-cidades" value="${esc(r.compra)}" autocomplete="off">
        <label for="g-boitel">Cidade do boitel</label><input id="g-boitel" list="g-cidades" value="${esc(r.boitel)}" autocomplete="off">
        <datalist id="g-cidades">${MUNICIPIOS.map(m => `<option value="${esc(rotulo(m))}">`).join('')}</datalist>
        <p class="nota">Ainda não escolheu o boitel? Use a cidade mais provável; dá para mudar depois na aba Região & logística.</p>`,
      ler: el => {
        r.compra = el.querySelector('#g-compra').value; r.boitel = el.querySelector('#g-boitel').value;
        if (!cidadeDoTexto(r.compra) || !cidadeDoTexto(r.boitel)) return 'Escolha as duas cidades na lista (ex.: "Uberaba - MG").';
      }
    },
    {
      titulo: 'Que animal você vai comprar?',
      explica: 'O peso de entrada define quantas arrobas o animal já tem e quanto ele custa. Animais mais pesados custam mais por cabeça, mas menos por quilo.',
      html: () => `<label for="g-peso">Peso de entrada (kg vivo)</label>
        <select id="g-peso">${opcoesCom([240, 270, 300, 320, 345, 375, 400], r.peso).map(p => `<option value="${p}"${p === r.peso ? ' selected' : ''}>${p} kg${p <= 270 ? ' (bezerro/garrote leve)' : p >= 375 ? ' (boi magro)' : ''}</option>`).join('')}</select>
        <label for="g-preco">Preço por cabeça (R$)</label><input id="g-preco" inputmode="decimal" value="${Math.round(r.precoCompra)}">
        <p class="nota" id="g-nota3"></p>
        ${links(['Reposição', 'bezerro', 'CONAB'])}`,
      vivo: el => {
        const nota = () => {
          const p = num(el.querySelector('#g-preco').value), k = Number(el.querySelector('#g-peso').value);
          el.querySelector('#g-nota3').textContent = p > 0 ? `Equivale a ${moeda(p / k, 2)} por kg vivo.` : '';
        };
        el.oninput = el.onchange = nota;
        nota();
      },
      ler: el => {
        r.peso = Number(el.querySelector('#g-peso').value);
        r.precoCompra = num(el.querySelector('#g-preco').value);
        if (!(r.precoCompra > 0)) return 'Informe o preço por cabeça (consulte os links abaixo do campo).';
        return foraDaFaixa('precoCompraCab', r.precoCompra, 'Preço por cabeça');
      }
    },
    {
      titulo: 'Quanto tempo no boitel e quanto o animal engorda?',
      explica: 'GMD é o ganho médio diário de peso, em kg por dia. Peça ao boitel o GMD que ele costuma entregar para o tipo de animal que você vai mandar. A premissa do seu dossiê é 1,6 kg/dia.',
      html: () => `<label for="g-dias">Dias no boitel</label><select id="g-dias">${opcoesCom([90, 100, 105, 120, 150], r.dias).map(d => `<option value="${d}"${d === r.dias ? ' selected' : ''}>${d} dias</option>`).join('')}</select>
        <label for="g-gmd">GMD (kg por dia)</label><input id="g-gmd" inputmode="decimal" value="${String(r.gmd).replace('.', ',')}">
        <p class="nota" id="g-nota4"></p>`,
      vivo: el => {
        const nota = () => {
          const d = Number(el.querySelector('#g-dias').value), g = num(el.querySelector('#g-gmd').value);
          el.querySelector('#g-nota4').textContent = g >= 0 && g <= 3 ? `Com ${r.peso} kg de entrada, ${d} dias e ${String(g).replace('.', ',')} kg/dia, o animal sai com cerca de ${Math.round(r.peso + d * g)} kg.` : '';
        };
        el.oninput = el.onchange = nota;
        nota();
      },
      ler: el => {
        r.dias = Number(el.querySelector('#g-dias').value); r.gmd = num(el.querySelector('#g-gmd').value);
        if (!(r.gmd >= 0 && r.gmd <= 3)) return 'O GMD deve ficar entre 0 e 3 kg/dia (ex.: 1,6).';
      }
    },
    {
      titulo: 'Como o boitel vai cobrar?',
      explica: 'Por arroba produzida: você paga por arroba que o animal ganhou, e a dieta já está incluída. Por diária: você paga um valor por cabeça por dia. Se ainda não tem cotação, escolha "Ainda não sei" e a plataforma usa uma referência de custo (marcada como pendente).',
      html: () => `<fieldset class="g-opcoes"><legend>Forma de cobrança</legend>
          <label><input type="radio" name="g-cob" value="arroba_produzida"${r.cobranca === 'arroba_produzida' ? ' checked' : ''}> Por arroba produzida: R$ <input id="g-parroba" inputmode="decimal" value="${String(r.precoArroba).replace('.', ',')}" aria-label="Preço por arroba produzida"> por @</label>
          <label><input type="radio" name="g-cob" value="diaria"${r.cobranca === 'diaria' ? ' checked' : ''}> Por diária: R$ <input id="g-diaria" inputmode="decimal" value="${String(r.diaria).replace('.', ',')}" aria-label="Diária total por cabeça"> por cabeça/dia (com a dieta)</label>
          <label><input type="radio" name="g-cob" value="naosei"> Ainda não sei (usar referência ICBC/USP de R$ ${String(fonte('icbc-set26').valor).replace('.', ',')}/@, que é um piso)</label>
        </fieldset>`,
      ler: el => {
        const v = el.querySelector('input[name="g-cob"]:checked').value;
        if (v === 'naosei') { r.cobranca = 'arroba_produzida'; r.precoArroba = fonte('icbc-set26').valor; return; }
        r.cobranca = v;
        if (v === 'arroba_produzida') {
          r.precoArroba = num(el.querySelector('#g-parroba').value);
          if (!(r.precoArroba > 0)) return 'Informe o preço por arroba produzida.';
          return foraDaFaixa('precoArrobaProduzida', r.precoArroba, 'Preço por arroba produzida');
        }
        r.diaria = num(el.querySelector('#g-diaria').value);
        if (!(r.diaria > 0)) return 'Informe o valor da diária.';
        return foraDaFaixa('alimentacaoDia', r.diaria, 'Diária');
      }
    },
    {
      titulo: 'Por quanto você espera vender a arroba?',
      explica: 'É o preço da arroba do boi gordo na venda ao frigorífico. Use o valor que o frigorífico da sua região ofereceu ou a cotação da sua praça.',
      html: () => `<label for="g-pvenda">Preço da arroba do boi gordo (R$/@)</label><input id="g-pvenda" inputmode="decimal" value="${String(r.precoVenda).replace('.', ',')}">
        ${links(['Indicador do boi gordo', 'Boi gordo por praça', 'CONAB'])}
        <label class="g-check"><input type="checkbox" id="g-fpaga"${r.frigorificoPagaFrete ? ' checked' : ''}> O frigorífico paga o frete do boitel até o abate (o mais comum)</label>`,
      ler: el => {
        r.precoVenda = num(el.querySelector('#g-pvenda').value);
        r.frigorificoPagaFrete = el.querySelector('#g-fpaga').checked;
        if (!(r.precoVenda > 0)) return 'Informe o preço de venda.';
        return foraDaFaixa('precoVendaArroba', r.precoVenda, 'Preço da arroba');
      }
    }
  ];

  const fundo = document.createElement('div');
  fundo.className = 'g-fundo';
  fundo.innerHTML = `<div class="g-janela" role="dialog" aria-modal="true" aria-labelledby="g-titulo">
    <div class="g-topo"><span class="g-passo"></span><button type="button" class="tri-fechar" aria-label="Fechar">×</button></div>
    <div class="barra" aria-hidden="true"><span class="g-prog"></span></div>
    <h2 id="g-titulo"></h2><p class="g-explica"></p><div class="g-corpo"></div><div class="g-erro" role="alert"></div>
    <div class="botoes g-nav"><button type="button" class="btn sec g-voltar">Voltar</button><button type="button" class="btn g-seguir">Próximo</button></div>
  </div>`;
  document.body.appendChild(fundo);
  const voltaFoco = document.activeElement;
  const $ = s => fundo.querySelector(s);
  let atual = 0;

  function passo(i) {
    atual = i;
    const p = PASSOS[i];
    $('.g-passo').textContent = `Pergunta ${i + 1} de ${PASSOS.length}`;
    $('.g-prog').style.width = ((i + 1) / PASSOS.length * 100) + '%';
    $('#g-titulo').textContent = p.titulo;
    $('.g-explica').textContent = p.explica;
    $('.g-corpo').innerHTML = p.html();
    $('.g-erro').textContent = '';
    $('.g-voltar').hidden = i === 0;
    $('.g-seguir').textContent = i === PASSOS.length - 1 ? 'Ver meu resultado' : 'Próximo';
    p.vivo?.($('.g-corpo'));
    ($('.g-corpo').querySelector('input, select') || $('.g-seguir')).focus();
  }

  function aplicar() {
    const compra = cidadeDoTexto(r.compra), boitel = cidadeDoTexto(r.boitel);
    const Lnovo = normalizarLogistica({ ...L, compra: `${compra[1]}|${compra[4]}`, boitel: `${boitel[1]}|${boitel[4]}`, venda: 'auto' });
    const area = CAMINHOES[Lnovo.caminhao], op = { areaM2: area, fixoViagem: Lnovo.fixoViagem, porKm: Lnovo.porKm };
    const pesoSaida = r.peso + r.dias * r.gmd;
    const fEntrada = fretePorCabeca(distanciaEstimadaKm(compra, boitel), r.peso, op).porCabeca;
    const frig = frigorificosProximos(boitel, 1)[0];
    const fSaida = r.frigorificoPagaFrete || !frig ? 0 : fretePorCabeca(frig.distanciaKm, pesoSaida, op).porCabeca;
    Object.assign(ctx.estado.lote, {
      capitalInicial: r.capital, reservaPct: r.reservaPct / 100, cabecasFixas: 0,
      pesoEntradaKg: r.peso, precoCompraCab: Math.round(r.precoCompra * 100) / 100,
      diasCiclo: r.dias, gmdKg: r.gmd, modoCobranca: r.cobranca,
      precoVendaArroba: r.precoVenda,
      freteEntradaCab: Math.round(fEntrada * 100) / 100, freteSaidaCab: Math.round(fSaida * 100) / 100
    });
    if (r.cobranca === 'arroba_produzida') ctx.estado.lote.precoArrobaProduzida = r.precoArroba;
    else { ctx.estado.lote.alimentacaoDia = r.diaria; ctx.estado.lote.servicoDia = 0; }
    ctx.estado.filtros.logistica = Lnovo;
    marcarGuiadoVisto();
    fechar();
    ctx.recarregarAba();
    ctx.irParaAba('painel');
  }

  function fechar() {
    fundo.remove();
    document.removeEventListener('keydown', teclas);
    voltaFoco?.focus?.();
  }

  function teclas(e) {
    if (e.key === 'Escape') fechar();
    if (e.key === 'Tab') { // mantém o foco dentro da janela
      const f = [...fundo.querySelectorAll('button, input, select, a[href]')].filter(x => !x.hidden && !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }

  $('.tri-fechar').onclick = fechar;
  $('.g-voltar').onclick = () => passo(Math.max(0, atual - 1));
  $('.g-seguir').onclick = () => {
    const erro = PASSOS[atual].ler($('.g-corpo'));
    if (erro) { $('.g-erro').textContent = erro; return; }
    if (atual < PASSOS.length - 1) passo(atual + 1); else aplicar();
  };
  fundo.addEventListener('click', e => { if (e.target === fundo) fechar(); });
  document.addEventListener('keydown', teclas);
  passo(0);
}
