// Evolução física do animal no ciclo de terminação.
import { arrobasCarcaca, KG_POR_ARROBA } from './unidades.js';

/**
 * Cálculo por animal (sem mortalidade; ela é aplicada no lote).
 * Arroba produzida = @ de carcaça na saída − @ de carcaça na entrada, cada uma
 * com o seu rendimento. É a base de cobrança dos contratos "por @ produzida".
 */
export function calcularAnimal(p) {
  const ganhoKg = p.gmdKg * p.diasCiclo;
  const pesoSaidaKg = p.pesoEntradaKg + ganhoKg;
  const pesoAbateKg = pesoSaidaKg * (1 - p.quebraPesoPct);
  const carcacaEntradaKg = p.pesoEntradaKg * p.rcEntrada;
  const carcacaSaidaKg = pesoAbateKg * p.rcSaida;
  const arrobasEntrada = arrobasCarcaca(p.pesoEntradaKg, p.rcEntrada);
  const arrobasSaida = arrobasCarcaca(pesoAbateKg, p.rcSaida);
  const arrobasProduzidas = arrobasSaida - arrobasEntrada;
  const ganhoCarcacaKg = carcacaSaidaKg - carcacaEntradaKg;
  // Fração do ganho de peso vivo que virou carcaça. Valores típicos: 55%–75%.
  const rendimentoGanho = ganhoKg > 0 ? ganhoCarcacaKg / ganhoKg : 0;

  const avisos = [];
  if (ganhoKg > 0 && (rendimentoGanho > 0.8 || rendimentoGanho < 0.4)) {
    avisos.push(`Rendimento do ganho de ${(rendimentoGanho * 100).toFixed(1)}% está fora da faixa usual (40%–80%): revise RC de entrada/saída e GMD.`);
  }
  if (arrobasProduzidas <= 0) {
    avisos.push('Nenhuma arroba produzida: o ciclo não agrega carcaça com estas premissas.');
  }
  return {
    ganhoKg, pesoSaidaKg, pesoAbateKg, carcacaEntradaKg, carcacaSaidaKg,
    arrobasEntrada, arrobasSaida, arrobasProduzidas, ganhoCarcacaKg, rendimentoGanho,
    kgPorArroba: KG_POR_ARROBA, avisos
  };
}

/** Duração completa de um giro de capital: engorda + recebimento + intervalo. */
export function duracaoGiroDias(p) {
  return p.diasCiclo + p.prazoRecebimentoDias + p.intervaloEntreLotesDias;
}

/** Ciclos por ano possíveis pelo calendário, limitados pela meta operacional. */
export function ciclosPorAno(p) {
  const pelaAgenda = 365 / duracaoGiroDias(p);
  return Math.min(pelaAgenda, p.metaCiclosAno);
}
