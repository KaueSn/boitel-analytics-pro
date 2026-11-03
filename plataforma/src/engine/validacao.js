// Validação genérica de parâmetros a partir de um esquema declarativo.
// Cada campo do esquema: { padrao, tipo: 'numero'|'inteiro'|'opcao'|'booleano'|'texto',
//   min, max, opcoes, rotulo, unidade, origem, fonte, nota, grupo }

export class ErroValidacao extends Error {
  constructor(erros) {
    super('Parâmetros inválidos: ' + erros.map(e => e.mensagem).join('; '));
    this.name = 'ErroValidacao';
    this.erros = erros;
  }
}

export function valoresPadrao(esquema) {
  const out = {};
  for (const [k, def] of Object.entries(esquema)) out[k] = def.padrao;
  return out;
}

function coagir(def, bruto) {
  if (def.tipo === 'booleano') {
    if (typeof bruto === 'boolean') return bruto;
    if (bruto === 'true' || bruto === 1 || bruto === '1') return true;
    if (bruto === 'false' || bruto === 0 || bruto === '0') return false;
    return undefined;
  }
  if (def.tipo === 'opcao' || def.tipo === 'texto') {
    return typeof bruto === 'string' ? bruto : undefined;
  }
  // números: aceita string com vírgula decimal ("12,5")
  if (typeof bruto === 'string') {
    const s = bruto.trim().replace(/\s/g, '');
    if (s === '') return undefined;
    bruto = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  }
  if (typeof bruto !== 'number' || !Number.isFinite(bruto)) return undefined;
  return def.tipo === 'inteiro' ? Math.round(bruto) : bruto;
}

/**
 * Valida e normaliza `entrada` contra `esquema`. Campos ausentes recebem o padrão
 * (e geram aviso se `exigir` for true). Nunca lança: devolve a lista de erros.
 */
export function validar(esquema, entrada = {}, { exigir = false } = {}) {
  const valores = {};
  const erros = [];
  const avisos = [];
  for (const [campo, def] of Object.entries(esquema)) {
    const bruto = entrada[campo];
    const rotulo = def.rotulo || campo;
    if (bruto === '') { // campo apagado na tela: não calcular com um valor que a pessoa não vê
      erros.push({ campo, mensagem: `${rotulo}: preencha este campo.` });
      valores[campo] = def.padrao;
      continue;
    }
    if (bruto === undefined || bruto === null) {
      valores[campo] = def.padrao;
      if (exigir) avisos.push({ campo, mensagem: `${rotulo}: ausente, usado o padrão.` });
      continue;
    }
    const v = coagir(def, bruto);
    if (v === undefined) {
      erros.push({ campo, mensagem: `${rotulo}: valor inválido.` });
      valores[campo] = def.padrao;
      continue;
    }
    if (def.tipo === 'opcao' && !def.opcoes.includes(v)) {
      erros.push({ campo, mensagem: `${rotulo}: opção desconhecida "${v}".` });
      valores[campo] = def.padrao;
      continue;
    }
    if (typeof v === 'number') {
      if (def.min !== undefined && v < def.min) {
        erros.push({ campo, mensagem: `${rotulo}: mínimo ${def.min}${def.unidade ? ' ' + def.unidade : ''}.` });
      } else if (def.max !== undefined && v > def.max) {
        erros.push({ campo, mensagem: `${rotulo}: máximo ${def.max}${def.unidade ? ' ' + def.unidade : ''}.` });
      }
    }
    valores[campo] = v;
  }
  return { ok: erros.length === 0, valores, erros, avisos };
}

/** Valida e lança ErroValidacao se houver erro. Usado pelas funções do motor. */
export function exigirValido(esquema, entrada) {
  const r = validar(esquema, entrada);
  if (!r.ok) throw new ErroValidacao(r.erros);
  return r.valores;
}
