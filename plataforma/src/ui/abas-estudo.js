// Aba Melhor opção & região: o que fazer com o capital (boitel, arrendar, comprar ou renda fixa),
// quais regiões favorecem cada opção e o aviso sobre outras atividades do agro.
import { esc, moeda, num, pct, sinal, aviso, tabela } from './formato.js';
import { grafico, paleta } from './graficos.js';
import { compararOpcoes, varrerCapital, rankingRegioes, regiaoDaCidade, TETO_ARRENDAMENTO, UFS_ESTUDO } from '../engine/estudo.js';
import { municipio } from '../engine/logistica.js';
import { camposPendentes } from '../engine/premissas.js';

const filtroRegiao = { uf: null, raioKm: 200 }; // preferência só desta visita

function veredito(r) {
  const cap = moeda(r.capital);
  if (r.superaCdi) {
    return `Com ${cap} e os preços informados, a opção de maior resultado em 1 ano é <b>${esc(r.melhor.nome)}</b>: ${moeda(r.melhor.resultado)} (${pct(r.melhor.retornoSobreCapital)} sobre o capital), ${moeda(r.diferencaCdi)} a mais que a renda fixa.`;
  }
  const p = r.melhorPecuaria;
  return `Com ${cap} e os preços informados, <b>nenhuma opção de pecuária supera a renda fixa</b> em 1 ano (${moeda(r.melhor.resultado)}, ou ${pct(r.melhor.retornoSobreCapital)}).${p ? ` A mais próxima é <b>${esc(p.nome)}</b>: ${moeda(p.resultado)} (${pct(p.retornoSobreCapital)}), ${moeda(r.melhor.resultado - p.resultado)} a menos.` : ''} Veja nos Cenários e nos Caminhos o que precisaria mudar (preço de compra, preço de venda ou custo do boitel).`;
}

function tabelaRegioes(lista, colunas) {
  if (!lista.length) return '<p class="vazio">Nenhuma região neste filtro.</p>';
  return tabela(['#', 'Região rural', 'Estado', 'Nota', ...colunas.map(c => c[0])],
    lista.map((r, i) => [i + 1, esc(r.nome), esc(r.ufs.join(', ')), num(r.nota * 100), ...colunas.map(c => c[1](r))]));
}

export const estudo = {
  resultados(el, ctx) {
    const { res, estado } = ctx;
    const { modeloA: pA, modeloC: pC, patrimonio: pPat } = res.val;
    const p = res.p;
    const r = compararOpcoes(p, pA, pC, pPat);
    const faixas = varrerCapital(p, pA, pC, pPat);
    const usaPendente = r.melhor.id !== 'cdi' && r.melhor.id !== 'boitel';
    const [nomeB, ufB] = String(estado.filtros.logistica?.boitel || '').split('|');
    const cidade = nomeB && ufB ? municipio(nomeB, ufB) : null;
    if (filtroRegiao.uf === null) filtroRegiao.uf = ufB || '';
    const rk = rankingRegioes({ uf: filtroRegiao.uf, raioKm: filtroRegiao.raioKm, pesoAbateKg: res.lote.animal.pesoAbateKg, lotacaoCabHa: pPat.lotacaoCabHa, areaHa: pPat.areaHa, custosAquisicaoPct: pPat.custosAquisicaoPct });
    const sua = cidade ? regiaoDaCidade(cidade[0], filtroRegiao.raioKm) : null;
    const km = v => (Number.isFinite(v) ? `~${num(v)} km` : '—');

    el.innerHTML = `
      <section class="cartao destaque"><h3>Qual é a melhor opção para o seu capital?</h3>
        <p>${veredito(r)}</p>
        ${usaPendente ? aviso('Esta opção depende de valores provisórios (instalações, mão de obra, pasto, manutenção da fazenda). Troque pelas suas cotações antes de confiar neste resultado: abas Modelos e Patrimônio.') : ''}
        <p class="nota">Conta de 1 ano com o mesmo capital para todas as opções: resultado da operação + o que ficou parado rendendo CDI líquido. Muda com o filtro de cenário do topo. É um estudo com os seus números, não recomendação de investimento.</p>
      </section>

      <section class="cartao"><h3>Comparação das opções com ${moeda(r.capital)}</h3>
        ${tabela(['Opção', 'Situação', 'Capital na operação', 'Cabeças por ciclo', 'Resultado da operação', 'Dinheiro parado (CDI)', 'Resultado no ano', 'Sobre o capital', 'Capital mínimo'],
          r.linhas.map(l => [
            `<b>${esc(l.nome)}</b>${l.id === r.melhor.id ? ' <span class="selo selo-pesquisado">maior resultado</span>' : ''}<br><small>${esc(l.oQue)}</small>`,
            l.viavel ? (l.capital < l.capitalMinimo ? '<span class="aviso">Lote abaixo de 1 carreta</span>' : 'Cabe no capital') : `<span class="neg">Não cabe</span><br><small>${esc(l.notas[0] || '')}</small>`,
            l.viavel ? moeda(l.capitalEmpregado) : '—', l.viavel && l.id !== 'cdi' ? num(l.cabecas) : '—',
            l.viavel && l.id !== 'cdi' ? `<span class="${sinal(l.lucroAnual)}">${moeda(l.lucroAnual)}</span>` : '—',
            l.viavel ? moeda(l.rendimentoParado) : '—',
            l.viavel ? `<b class="${sinal(l.resultado)}">${moeda(l.resultado)}</b>` : '—',
            l.viavel ? pct(l.retornoSobreCapital) : '—',
            Number.isFinite(l.capitalMinimo) && l.capitalMinimo > 0 ? moeda(l.capitalMinimo) : '—'
          ]))}
        <p class="nota">Capital mínimo: boitel e recria = 1 carreta cheia de animais, somada à reserva; confinamento = escala mínima informada; compra = ${num(5)} ha sem passar de 50% do capital disponível. A terra comprada continua no patrimônio e pode valorizar, o que não entra no resultado do ano: veja a aba Patrimônio para o longo prazo.</p>
        <div class="graf"><canvas id="g-opcoes"></canvas></div>
      </section>

      <section class="cartao"><h3>Como a resposta muda conforme o capital</h3>
        ${tabela(['Capital', 'Maior resultado', 'Retorno', 'Melhor opção na pecuária', 'Retorno'], faixas.map(f => [
          `${f.seu ? '<b>' : ''}${moeda(f.capital)}${f.seu ? '</b> <small>(o seu)</small>' : ''}`, esc(f.melhor.nome), pct(f.melhor.retornoSobreCapital),
          f.melhorPecuaria ? esc(f.melhorPecuaria.nome) : '—', f.melhorPecuaria ? `<span class="${sinal(f.melhorPecuaria.retornoSobreCapital)}">${pct(f.melhorPecuaria.retornoSobreCapital)}</span>` : '—'
        ]))}
        ${aviso(`Faixas altas dependem dos valores provisórios das opções com instalações e terra. Pendentes de cotação: ${camposPendentes().map(c => c.rotulo).slice(0, 5).join('; ')}… e os parâmetros dos modelos A e C.`, 'info')}
      </section>

      <section class="cartao"><h3>Qual a melhor região para cada opção?</h3>
        <div class="linha-form">
          <label for="est-uf">Estado</label><select id="est-uf"><option value="">Brasil inteiro</option>${UFS_ESTUDO.map(u => `<option value="${u}"${u === filtroRegiao.uf ? ' selected' : ''}>${u}</option>`).join('')}</select>
          <label for="est-raio">Frigoríficos em até</label><select id="est-raio">${[100, 200, 300, 500].map(k => `<option value="${k}"${k === filtroRegiao.raioKm ? ' selected' : ''}>${k} km</option>`).join('')}</select>
        </div>
        ${aviso('O ranking usa só dados oficiais e livres: frigoríficos com SIF (MAPA) e Valor da Terra Nua (INCRA). NÃO entram o preço do boi e da reposição, a oferta real de boitéis e pastos, o clima nem a qualidade da terra. Terra muito barata costuma ter motivo: visite antes de decidir.', 'info')}
        ${sua ? `<p>Sua região (${esc(cidade[1])}/${esc(cidade[4])}): <b>${esc(sua.nome)}</b> · ${num(sua.frigorificos)} frigorífico(s) em até ${filtroRegiao.raioKm} km · mais próximo ${km(sua.distanciaKm)} · VTN médio ${moeda(sua.med)}/ha. <small>Mude a cidade na aba Região & logística.</small></p>` : ''}
        <h4>Para fazer boitel</h4><p class="nota">Nota = acesso a frigoríficos: quantidade, capacidade de abate e distância. Regiões com mais compradores tendem a negociar melhor.</p>
        ${tabelaRegioes(rk.boitel, [['Frigoríficos no raio', x => num(x.frigorificos)], ['Mais próximo', x => km(x.distanciaKm)], ['Frete de saída est./cab', x => moeda(x.freteAbate, 2)]])}
        <h4>Para arrendar terra</h4><p class="nota">Nota = 50% custo da terra + 50% acesso. Teto legal do arrendamento: ${pct(TETO_ARRENDAMENTO, 0)} do valor cadastral por ano (Estatuto da Terra, art. 95, XII), aqui aproximado pelo VTN. O preço real é negociado e pode ser bem menor; a lei prevê até 30% em glebas de exploração intensiva.</p>
        ${tabelaRegioes(rk.arrendar, [['VTN médio/ha', x => moeda(x.med)], ['Teto/ha/ano', x => moeda(x.tetoArrendamentoHa)], [`Teto/cab/mês (${num(pPat.lotacaoCabHa, 1)} cab/ha)`, x => moeda(x.tetoArrendamentoCabMes, 2)], ['Frigoríficos no raio', x => num(x.frigorificos)]])}
        <h4>Para comprar terra</h4><p class="nota">Nota = 60% custo da terra + 40% acesso. O VTN é um valor fiscal, sem benfeitorias, e costuma ficar bem abaixo do preço de mercado: use só para comparar regiões entre si.</p>
        ${tabelaRegioes(rk.comprar, [['VTN mín. a máx./ha', x => `${moeda(x.min)} a ${moeda(x.max)}`], [`Piso para ${num(pPat.areaHa)} ha + custos`, x => moeda(x.custoCompraArea)], ['Frigoríficos no raio', x => num(x.frigorificos)], ['Mais próximo', x => km(x.distanciaKm)]])}
      </section>

      <section class="cartao convite-guiado"><h3>E fora da pecuária?</h3>
        <p>Este estudo compara apenas pecuária de corte e renda fixa. <b>Outras atividades do agro podem dar lucro maior</b> dependendo da região e do capital, como plantio de grãos, café, cana, hortifrúti ou integração lavoura-pecuária. Elas têm outras exigências: máquinas, janela de plantio, clima, crédito e comercialização. Não comparo essas atividades aqui porque a plataforma ainda não tem esses dados.</p>
        <p class="nota">Um estudo próprio para plantio e outras atividades pode ser feito em uma nova página de estudo aqui no site.</p>
      </section>`;

    el.querySelector('#est-uf').onchange = e => { filtroRegiao.uf = e.target.value; estudo.resultados(el, ctx); };
    el.querySelector('#est-raio').onchange = e => { filtroRegiao.raioKm = Number(e.target.value); estudo.resultados(el, ctx); };
    const c = paleta();
    const vis = r.linhas.filter(l => l.viavel);
    grafico('g-opcoes', {
      type: 'bar', moedaEixo: 'y',
      data: { labels: vis.map(l => l.nome), datasets: [{ label: 'Resultado no ano', data: vis.map(l => l.resultado), backgroundColor: vis.map(l => (l.id === 'cdi' ? c.serie[1] : l.resultado >= 0 ? c.pos : c.neg)) }] },
      options: { plugins: { legend: { display: false } } }
    });
  }
};
