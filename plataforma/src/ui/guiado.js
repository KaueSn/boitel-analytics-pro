// Preenchimento guiado: 6 perguntas simples, uma por vez, com explicação.
// No fim grava as premissas, calcula os fretes pela região e abre o Painel.
import { esc, moeda } from './formato.js';
import { MUNICIPIOS } from '../engine/municipios.js';
import { municipio, distanciaEstimadaKm, fretePorCabeca, frigorificosProximos, CAMINHOES } from '../engine/logistica.js';
import { precoReposicaoKgInterpolado, REGIOES, fonte } from '../engine/mercado.js';
import { normalizarLogistica } from './abas-regiao.js';

const rotulo = m => `${m[1]} - ${m[4]}`;
const cidadeDoTexto = t => { const m = String(t).match(/^(.*)\s+-\s+([A-Z]{2})$/); return m ? municipio(m[1], m[2]) : null; };
const num = v => { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

export function abrirGuiado(ctx) {
  const L = normalizarLogistica(ctx.estado.filtros.logistica);
  const lote = ctx.estado.lote;
  const r = { // respostas, começando pelos valores atuais
    capital: lote.capitalInicial, reservaPct: Math.round(lote.reservaPct * 100),
    compra: rotulo(municipio(...L.compra.split('|'))), boitel: rotulo(municipio(...L.boitel.split('|'))),
    peso: lote.pesoEntradaKg, precoModo: 'mercado', precoCompra: lote.precoCompraCab,
    dias: lote.diasCiclo, gmd: lote.gmdKg,
    cobranca: lote.modoCobranca, precoArroba: lote.precoArrobaProduzida, diaria: lote.alimentacaoDia + lote.servicoDia,
    vendaModo: 'mercado', precoVenda: lote.precoVendaArroba, frigorificoPagaFrete: true
  };
  const ufDe = t => cidadeDoTexto(t)?.[4];
  const regiaoRef = () => (ufDe(r.boitel) === 'SP' ? 'SP' : 'MG');
  const precoMercadoCompra = () => { const kg = precoReposicaoKgInterpolado(regiaoRef(), r.peso); return kg ? kg * r.peso : null; };

  const PASSOS = [
    {
      titulo: 'Quanto você tem para investir?',
      explica: 'É o dinheiro total disponível. Uma parte fica guardada como reserva para imprevistos (doença, atraso no pagamento, queda de preço) e não entra na compra dos animais.',
      html: () => `<label for="g-capital">Capital total (R$)</label><input id="g-capital" inputmode="decimal" value="${r.capital}">
        <label for="g-reserva">Reserva de segurança (%)</label><input id="g-reserva" type="number" min="0" max="90" value="${r.reservaPct}">
        <p class="nota">Com estes valores, ${moeda(r.capital * (1 - r.reservaPct / 100))} vão para a operação e ${moeda(r.capital * r.reservaPct / 100)} ficam de reserva.</p>`,
      ler: el => {
        r.capital = num(el.querySelector('#g-capital').value); r.reservaPct = num(el.querySelector('#g-reserva').value);
        if (!(r.capital > 0)) return 'Informe um capital maior que zero (ex.: 250000).';
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
      html: () => {
        const pm = precoMercadoCompra();
        return `<label for="g-peso">Peso de entrada (kg vivo)</label>
        <select id="g-peso">${[240, 270, 300, 320, 345, 375, 400].map(p => `<option value="${p}"${p === r.peso ? ' selected' : ''}>${p} kg${p <= 270 ? ' (bezerro/garrote leve)' : p >= 375 ? ' (boi magro)' : ''}</option>`).join('')}</select>
        <fieldset class="g-opcoes"><legend>Preço por cabeça</legend>
          <label><input type="radio" name="g-pm" value="mercado"${r.precoModo === 'mercado' ? ' checked' : ''}> Usar referência de mercado de ${regiaoRef()}${pm ? `: <b>${moeda(pm)}</b>` : ''}</label>
          <label><input type="radio" name="g-pm" value="meu"${r.precoModo === 'meu' ? ' checked' : ''}> Já tenho uma cotação: R$ <input id="g-preco" inputmode="decimal" value="${Math.round(r.precoCompra)}" aria-label="Preço por cabeça em reais"></label>
        </fieldset>
        <p class="nota">Referência: Scot Consultoria, macho Nelore, 27/10/2026, preço por kg interpolado pelo peso.</p>`;
      },
      vivo: el => { el.querySelector('#g-peso').onchange = e => { r.peso = Number(e.target.value); passo(atual); }; },
      ler: el => {
        r.peso = Number(el.querySelector('#g-peso').value);
        r.precoModo = el.querySelector('input[name="g-pm"]:checked').value;
        r.precoCompra = r.precoModo === 'mercado' ? precoMercadoCompra() : num(el.querySelector('#g-preco').value);
        if (!(r.precoCompra > 0)) return 'Informe o preço por cabeça.';
      }
    },
    {
      titulo: 'Quanto tempo no boitel e quanto o animal engorda?',
      explica: 'GMD é o ganho médio diário de peso, em kg por dia. Peça ao boitel o GMD que ele costuma entregar para o tipo de animal que você vai mandar. A premissa do seu dossiê é 1,6 kg/dia.',
      html: () => `<label for="g-dias">Dias no boitel</label><select id="g-dias">${[90, 100, 105, 120, 150].map(d => `<option value="${d}"${d === r.dias ? ' selected' : ''}>${d} dias</option>`).join('')}</select>
        <label for="g-gmd">GMD (kg por dia)</label><input id="g-gmd" inputmode="decimal" value="${String(r.gmd).replace('.', ',')}">
        <p class="nota">Com ${r.peso} kg de entrada, ${r.dias} dias e ${String(r.gmd).replace('.', ',')} kg/dia, o animal sai com cerca de ${Math.round(r.peso + r.dias * r.gmd)} kg.</p>`,
      ler: el => {
        r.dias = Number(el.querySelector('#g-dias').value); r.gmd = num(el.querySelector('#g-gmd').value);
        if (!(r.gmd >= 0 && r.gmd <= 3)) return 'O GMD deve ficar entre 0 e 3 kg/dia.';
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
        r.precoArroba = num(el.querySelector('#g-parroba').value); r.diaria = num(el.querySelector('#g-diaria').value);
        if (v === 'arroba_produzida' && !(r.precoArroba > 0)) return 'Informe o preço por arroba produzida.';
        if (v === 'diaria' && !(r.diaria > 0)) return 'Informe o valor da diária.';
      }
    },
    {
      titulo: 'Por quanto você espera vender a arroba?',
      explica: 'É o preço da arroba do boi gordo na venda ao frigorífico. Use a referência da região ou o valor que o frigorífico ofereceu.',
      html: () => {
        const reg = REGIOES[regiaoRef()];
        return `<fieldset class="g-opcoes"><legend>Preço de venda</legend>
          <label><input type="radio" name="g-pv" value="mercado"${r.vendaModo === 'mercado' ? ' checked' : ''}> Referência de ${regiaoRef()}: <b>${moeda(reg.precoVendaArroba, 2)}/@</b> (Scot, 27/10/2026)</label>
          <label><input type="radio" name="g-pv" value="cepea"${r.vendaModo === 'cepea' ? ' checked' : ''}> Indicador CEPEA (SP): <b>${moeda(fonte('cepea-boi').valor, 2)}/@</b> (28/10/2026)</label>
          <label><input type="radio" name="g-pv" value="meu"${r.vendaModo === 'meu' ? ' checked' : ''}> Outro valor: R$ <input id="g-pvenda" inputmode="decimal" value="${String(r.precoVenda).replace('.', ',')}" aria-label="Preço de venda por arroba"> por @</label>
        </fieldset>
        <label class="g-check"><input type="checkbox" id="g-fpaga"${r.frigorificoPagaFrete ? ' checked' : ''}> O frigorífico paga o frete do boitel até o abate (o mais comum)</label>`;
      },
      ler: el => {
        r.vendaModo = el.querySelector('input[name="g-pv"]:checked').value;
        r.precoVenda = r.vendaModo === 'mercado' ? REGIOES[regiaoRef()].precoVendaArroba : r.vendaModo === 'cepea' ? fonte('cepea-boi').valor : num(el.querySelector('#g-pvenda').value);
        r.frigorificoPagaFrete = el.querySelector('#g-fpaga').checked;
        if (!(r.precoVenda > 0)) return 'Informe o preço de venda.';
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
    ctx.estado.filtros.regiao = regiaoRef();
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
