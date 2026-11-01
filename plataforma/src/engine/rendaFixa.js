// Renda fixa de referência (CDI) para comparação justa com a pecuária.
// Sempre compare LÍQUIDO com LÍQUIDO, no mesmo prazo e com o mesmo capital.
import { taxaPeriodo, DIAS_ANO } from './unidades.js';

/** Tabela regressiva do IR (Lei 11.033/2004). Verificar mudanças legais recentes. */
export function aliquotaIRRendaFixa(dias) {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
}

/**
 * Resultado de uma aplicação a uma porcentagem do CDI, resgatada após `dias`.
 * IOF regressivo (resgates < 30 dias) não é modelado.
 */
export function aplicacaoCDI({ capital, cdiAnual, dias, pctCdi = 1, isentoIR = false, custoAnual = 0 }) {
  const taxaAnual = Math.max(-0.99, cdiAnual * pctCdi - custoAnual);
  const bruto = capital * taxaPeriodo(taxaAnual, dias);
  const aliquota = isentoIR ? 0 : aliquotaIRRendaFixa(dias);
  const ir = Math.max(0, bruto) * aliquota;
  const liquido = bruto - ir;
  return {
    capital, bruto, ir, liquido, aliquota,
    montanteFinal: capital + liquido,
    retornoLiquido: capital > 0 ? liquido / capital : 0,
    retornoLiquidoAnual: capital > 0 && dias > 0 ? Math.pow(1 + liquido / capital, DIAS_ANO / dias) - 1 : 0
  };
}

/** Evolução anual do montante líquido se resgatado ao fim de cada ano (sem reaplicar o IR já pago). */
export function serieCDI({ capital, cdiAnual, anos, pctCdi = 1, isentoIR = false }) {
  const out = [];
  for (let a = 0; a <= anos; a++) {
    const r = aplicacaoCDI({ capital, cdiAnual, dias: a * DIAS_ANO, pctCdi, isentoIR });
    out.push({ ano: a, montanteBruto: capital + r.bruto, montanteLiquido: r.montanteFinal });
  }
  return out;
}

/**
 * Retorno ajustado ao risco tipo Sharpe: (média − taxa livre) / desvio-padrão.
 * Só é defensável com amostra de retornos (ex.: Monte Carlo). Retorna null se σ = 0.
 */
export function indiceSharpe(retornos, taxaLivre) {
  if (!retornos.length) return null;
  const media = retornos.reduce((s, x) => s + x, 0) / retornos.length;
  const varianca = retornos.reduce((s, x) => s + (x - media) ** 2, 0) / Math.max(1, retornos.length - 1);
  const dp = Math.sqrt(varianca);
  return dp > 0 ? (media - taxaLivre) / dp : null;
}
