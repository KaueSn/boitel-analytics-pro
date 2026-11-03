// Ajustes de texto e escolha de voz para a fala (sem DOM, para poder testar).

/** Deixa a resposta natural para ouvir: símbolos viram palavras e os marcadores somem. */
export function textoParaFala(texto) {
  return String(texto || '')
    .replace(/R\$\/@/g, 'reais por arroba')
    .replace(/\/@/g, ' por arroba')
    .replace(/(\d)\s?@/g, '$1 arrobas')
    .replace(/@/g, 'arroba')
    .replace(/\/ha\b/g, ' por hectare')
    .replace(/\/cab\b/g, ' por cabeça')
    .replace(/\bkg\b/g, 'quilos')
    .replace(/\bha\b/g, 'hectares')
    .replace(/\ba\.a\./g, 'ao ano')
    .replace(/[•→]/g, ', ')
    .replace(/[“”"]/g, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/([.!?:])\s*\./g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Não corta decimais nem milhares ("1,5" ou "250.000"): só separa pontuação seguida de espaço
const separar = t => t.split(/(?<=[.!?])\s+/).filter(Boolean);

/** Resposta longa cansa de ouvir: fala as primeiras frases e deixa o resto na tela. */
export function resumirParaFala(texto, limite = 420) {
  if (texto.length <= limite) return texto;
  let out = '';
  for (const f of separar(texto)) {
    if (out && out.length + f.length > limite) return out.trim() + ' O restante está na tela.';
    out += f + ' ';
  }
  return out.trim();
}

/** Parte a fala em pedaços: o Chrome interrompe frases longas sem avisar. */
export function dividirEmPartes(texto, maximo = 180) {
  const partes = [];
  for (const f of separar(texto)) {
    if (f.length <= maximo) { partes.push(f); continue; }
    let atual = '';
    for (const t of f.split(/\s+/)) {
      if (atual && atual.length + t.length + 1 > maximo) { partes.push(atual); atual = t; } else atual = atual ? atual + ' ' + t : t;
    }
    if (atual) partes.push(atual);
  }
  return partes;
}

/** Nota de qualidade da voz: vozes neurais e online soam bem mais naturais que as locais do sistema. */
export function notaVoz(v) {
  const nome = String(v?.name || '').toLowerCase();
  const lang = String(v?.lang || '').replace('_', '-').toLowerCase();
  if (!lang.startsWith('pt')) return -1;
  let n = lang === 'pt-br' ? 10 : 0;
  if (/natural|neural/.test(nome)) n += 100;
  else if (/online/.test(nome)) n += 80;
  else if (/google/.test(nome)) n += 60;
  else if (/premium|enhanced|aprimorad/.test(nome)) n += 50;
  if (/francisca|thalita/.test(nome)) n += 5;
  return n;
}

/** Vozes em português, da mais natural para a menos natural. */
export function ordenarVozes(vozes) {
  return [...(vozes || [])].filter(v => notaVoz(v) >= 0).sort((a, b) => notaVoz(b) - notaVoz(a));
}

/** A voz é a sintética básica do sistema? */
export const vozBasica = v => notaVoz(v) < 50;

/** A pessoa pediu para encerrar a conversa por voz? */
export function ehComandoParar(frase) {
  const n = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim();
  return /^(parar|pare|para|encerrar|encerra|tchau|chega|desligar|sair)( de falar| a conversa| por favor| triguinho)?$/.test(n);
}
