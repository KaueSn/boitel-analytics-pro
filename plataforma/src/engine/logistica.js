// Distância e frete estimados entre municípios (ESTIMATIVA, não rota real).
// Distância rodoviária ≈ linha reta (haversine) × fator de rota (padrão 1,3).
// Frete por viagem = custo fixo + R$/km × distância; por cabeça = viagem ÷ cabeças por viagem.
// Calibrado nas faixas de "Quanto custa transportar boi" (O Pecuarista, 02/05/2026, fonte
// secundária sem revisão técnica): carreta de boi gordo com 22 cab → ~R$ 110/cab a 100 km,
// ~R$ 165 a 200 km, ~R$ 275 a 450 km, ~R$ 430 a 800 km. Confirme com a transportadora.
import { MUNICIPIOS } from './municipios.js';
import { FRIGORIFICOS } from './frigorificos.js';

export const FRETE_PADRAO = { fixoViagem: 1720, porKm: 9.6, fatorRota: 1.3, densidadeKgM2: 400 };
// Áreas úteis típicas (m²) — O Pecuarista, calculadora de lotação
export const CAMINHOES = { truck: 15, carreta: 30, romeuJulieta: 45, bitrem: 55 };

export const normalizarNome = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
const INDICE = new Map(MUNICIPIOS.map(m => [normalizarNome(m[1]) + '|' + m[4], m]));

export function municipio(nome, uf) {
  return INDICE.get(normalizarNome(nome) + '|' + uf) || null;
}

export function distanciaRetaKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export function distanciaEstimadaKm(a, b, fatorRota = FRETE_PADRAO.fatorRota) {
  return distanciaRetaKm(a[2], a[3], b[2], b[3]) * fatorRota;
}

/** Cabeças por viagem pela densidade recomendada (~400 kg/m²). */
export function cabecasPorViagem(pesoKg, areaM2 = CAMINHOES.carreta, densidade = FRETE_PADRAO.densidadeKgM2) {
  return Math.max(1, Math.floor(areaM2 * densidade / pesoKg));
}

export function fretePorCabeca(distKm, pesoKg, { areaM2 = CAMINHOES.carreta, fixoViagem = FRETE_PADRAO.fixoViagem, porKm = FRETE_PADRAO.porKm } = {}) {
  const cab = cabecasPorViagem(pesoKg, areaM2);
  const viagem = fixoViagem + porKm * distKm;
  return { cabecasPorViagem: cab, custoViagem: viagem, porCabeca: viagem / cab };
}

/** Frigoríficos com SIF ordenados pela distância estimada a partir de um município. */
export function frigorificosProximos(origem, limite = 10) {
  return FRIGORIFICOS.map(f => {
    const m = municipio(f[2], f[3]);
    return m ? { sif: f[0], nome: f[1], municipio: f[2], uf: f[3], capacidade: f[4], distanciaKm: distanciaEstimadaKm(origem, m) } : null;
  }).filter(Boolean).sort((a, b) => a.distanciaKm - b.distanciaKm).slice(0, limite);
}
