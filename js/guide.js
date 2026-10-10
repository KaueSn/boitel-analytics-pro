// ============================================
// AVATAR GUIA — TUTORIAL PASSO A PASSO
// ============================================
const TUTORIAL_KEY = 'boitel_tutorial_v1';
let guideStepIndex = 0;
let guideAtivo = false;

const PASSOS_TUTORIAL = [
  { alvo: 'header', tab: null, titulo: 'Olá! Eu sou o Triguinho da Stratum Agro 🌾', texto: 'Vou te mostrar em poucos passos como usar o simulador. É rapidinho — no fim você já vai saber projetar o lucro do confinamento em boitel.' },
  { alvo: '#blocoCapital', tab: null, titulo: 'Capital e lote', texto: 'Comece informando o capital disponível e o tamanho do lote (número de cabeças). São os dois primeiros números que definem a simulação.' },
  { alvo: '#blocoBoitel', tab: null, titulo: 'Condições do Boitel', texto: 'Escolha a modalidade de pagamento (acerto no gancho ou à vista) e os dias de confinamento (cocho). Cada alteração recalcula tudo na hora.' },
  { alvo: '#blocoDiaria', tab: null, titulo: 'Diária de hotelaria (média por região)', texto: 'Informe o valor da diária por cabeça/dia — ou use a média de referência: escolha o estado no seletor e clique em "Usar média". Os valores vêm de índices do setor (ICBC, 2025) e você pode ajustá-los.' },
  { alvo: '#blocoPremio', tab: null, titulo: 'Bonificação adicional', texto: 'Bonificação é um valor EXTRA por arroba pago acima da cotação base — como o prêmio Boi China (animal com menos de 30 meses e requisitos sanitários), qualidade de carcaça ou origem rastreada. Aumenta a receita sem mexer nos custos. Clique no "?" para ver o detalhe.' },
  { alvo: '#blocoRiscos', tab: null, titulo: 'Riscos e oportunidade', texto: 'Ajuste a mortalidade/refugo, o CDI (custo de oportunidade) e o imposto sobre o lucro. É aqui que a análise fica realista.' },
  { alvo: '#blocoObjetivo', tab: null, titulo: 'Conte seu objetivo ao Triguinho', texto: 'Descreva o que você quer (lucro, segurança, prazo, região, quanto pode investir) e clique em "Analisar meu objetivo". Eu monto um plano com os melhores cenários na aba Estratégia.' },
  { alvo: '.results-hero', tab: null, titulo: 'Indicadores-chave', texto: 'Conforme você preenche, estes cartões mostram o melhor estado, o lucro líquido projetado, o ROIC e o caixa livre em D0.' },
  { alvo: '.tabs', tab: 'rankingTab', titulo: 'Ranking dos estados', texto: 'Comparamos SP, MG, GO, MS e MT: preço da arroba, custo do animal, frete, lucro por cabeça e ROIC — ordenado do melhor para o pior.' },
  { alvo: '#fluxoTab', tab: 'fluxoTab', titulo: 'DRE & fluxo de caixa', texto: 'Aqui você vê o resultado linha a linha, o desembolso no D0/D+106 e a comparação com a renda fixa (spread vs CDI).' },
  { alvo: '#graficosTab', tab: 'graficosTab', titulo: 'Análise gráfica', texto: 'Os gráficos mostram o lucro por estado, a composição dos custos e o ROIC comparativo — tudo se atualiza enquanto você digita.' },
  { alvo: '#contratosTab', tab: 'contratosTab', titulo: 'Contratos & alertas', texto: 'Checklist com boas práticas: plataformas digitais, GTA digital, peso de balança e jejum, hedge na B3 e trava de preço.' },
  { alvo: '.btn-export', tab: null, titulo: 'Pronto! 🎉', texto: 'Ao terminar, use "Exportar Resumo" para gerar o PDF do relatório. Se quiser rever o tutorial, clique no Boi-Guia a qualquer momento. Bom trabalho!' }
];

function guideAbrirTab(tabId) {
  const btn = document.querySelector('.tab-btn[onclick*="' + tabId + '"]');
  if (tabId && btn) switchTab(tabId, btn);
}

function guidePosicionar(alvoSel) {
  const guide = document.getElementById('guideAvatar');
  const largura = guide.offsetWidth || 300;
  const margem = 16;
  const alvo = alvoSel ? document.querySelector(alvoSel) : null;
  if (!alvo) {
    guide.style.left = (window.innerWidth - largura - margem) + 'px';
    return;
  }
  const r = alvo.getBoundingClientRect();
  let left = r.left + (r.width / 2) - (largura / 2);
  left = Math.max(margem, Math.min(left, window.innerWidth - largura - margem));
  guide.style.left = left + 'px';
}

function guideDestacar(alvoSel) {
  document.querySelectorAll('.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
  const alvo = alvoSel ? document.querySelector(alvoSel) : null;
  if (!alvo) { guidePosicionar(null); return; }
  alvo.classList.add('guide-highlight');
  alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function guideRenderStep() {
  const p = PASSOS_TUTORIAL[guideStepIndex];
  document.getElementById('guideTitle').textContent = p.titulo;
  document.getElementById('guideText').textContent = p.texto;
  document.getElementById('guideStep').textContent = (guideStepIndex + 1) + '/' + PASSOS_TUTORIAL.length;
  document.getElementById('guidePrev').style.visibility = guideStepIndex === 0 ? 'hidden' : 'visible';
  document.getElementById('guideNext').textContent =
    guideStepIndex === PASSOS_TUTORIAL.length - 1 ? 'Concluir' : 'Próximo';
  document.getElementById('guideProgressBar').style.width =
    Math.round(guideStepIndex / (PASSOS_TUTORIAL.length - 1) * 100) + '%';

  if (p.tab) guideAbrirTab(p.tab);
  setTimeout(() => {
    guideDestacar(p.alvo);
    guidePosicionar(p.alvo);
  }, p.tab ? 200 : 40);
}

function guideNext() {
  if (guideStepIndex >= PASSOS_TUTORIAL.length - 1) { guideConcluir(); return; }
  guideStepIndex++;
  guideRenderStep();
}

function guidePrev() {
  if (guideStepIndex === 0) return;
  guideStepIndex--;
  guideRenderStep();
}

function guideSkip() { guideConcluir(); }

function guideBubbleToggle() { startTutorial(); }

// Inicia o tutorial (usado pelo botão do personagem e pelo botão de ajuda)
function startTutorial() {
  guideAtivo = true;
  guideStepIndex = 0;
  const guide = document.getElementById('guideAvatar');
  guide.classList.remove('hidden');
  guide.classList.remove('minimized');
  guideRenderStep();
}

function guideConcluir() {
  guideAtivo = false;
  document.querySelectorAll('.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch (e) {}
  guideAbrirTab('rankingTab');
  guideMinimizar();
  showToast('Tutorial concluído! Bons negócios 🐂');
}

// Deixa apenas o personagem visível (canto inferior direito), sem o balão
function guideMinimizar() {
  const guide = document.getElementById('guideAvatar');
  if (!guide) return;
  guide.classList.remove('hidden');
  guide.classList.add('minimized');
  requestAnimationFrame(() => {
    const largura = guide.offsetWidth || 84;
    guide.style.left = (window.innerWidth - largura - 20) + 'px';
  });
}

// Chamado ao entrar no app: inicia na 1ª vez ou mantém minimizado
function maybeStartTutorial() {
  let visto = false;
  try { visto = localStorage.getItem(TUTORIAL_KEY) === '1'; } catch (e) {}
  if (visto) {
    guideMinimizar();
  } else {
    setTimeout(startTutorial, 700);
  }
}

window.addEventListener('resize', () => {
  const guide = document.getElementById('guideAvatar');
  if (!guide || guide.classList.contains('hidden')) return;
  if (guideAtivo) guidePosicionar(PASSOS_TUTORIAL[guideStepIndex].alvo);
  else guideMinimizar();
});
