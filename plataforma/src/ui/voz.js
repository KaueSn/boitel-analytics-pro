// Ajustes de texto para a voz (sem DOM, para poder testar).

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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** A pessoa pediu para encerrar a conversa por voz? */
export function ehComandoParar(frase) {
  const n = String(frase || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim();
  return /^(parar|pare|para|encerrar|encerra|tchau|chega|desligar|sair)( de falar| a conversa| por favor| triguinho)?$/.test(n);
}
