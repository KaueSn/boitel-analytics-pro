// Distância, frete e frigoríficos próximos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { municipio, distanciaRetaKm, distanciaEstimadaKm, cabecasPorViagem, fretePorCabeca, frigorificosProximos, CAMINHOES, FRETE_PADRAO } from '../src/engine/logistica.js';
import { MUNICIPIOS } from '../src/engine/municipios.js';
import { FRIGORIFICOS } from '../src/engine/frigorificos.js';

const perto = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test('base de municípios: contagens oficiais de MG e SP', () => {
  assert.equal(MUNICIPIOS.filter(m => m[4] === 'MG').length, 853);
  assert.equal(MUNICIPIOS.filter(m => m[4] === 'SP').length, 645);
});

test('busca de município ignora acento e caixa', () => {
  assert.equal(municipio('uberlandia', 'MG')[0], 3170206);
  assert.equal(municipio('ARAÇATUBA', 'SP')[0], 3502804);
  assert.equal(municipio('Uberlândia', 'SP'), null);
});

test('haversine: 1 grau de latitude ≈ 111,2 km; Uberlândia–Uberaba ≈ 99 km em linha reta', () => {
  perto(distanciaRetaKm(0, 0, 1, 0), 111.19, 0.1);
  const u = municipio('Uberlândia', 'MG'), b = municipio('Uberaba', 'MG');
  perto(distanciaRetaKm(u[2], u[3], b[2], b[3]), 99, 2);
  perto(distanciaEstimadaKm(u, b), 99 * FRETE_PADRAO.fatorRota, 3);
});

test('lotação pela densidade de 400 kg/m²', () => {
  assert.equal(cabecasPorViagem(500, CAMINHOES.carreta), 24); // 30 × 400 / 500
  assert.equal(cabecasPorViagem(300, CAMINHOES.truck), 20);   // 15 × 400 / 300
  assert.equal(cabecasPorViagem(5000, CAMINHOES.truck), 1);   // nunca zero
});

test('frete = (fixo + R$/km × km) ÷ cabeças', () => {
  const f = fretePorCabeca(200, 500);
  perto(f.custoViagem, 1720 + 9.6 * 200, 1e-9);
  perto(f.porCabeca, (1720 + 1920) / 24, 1e-9);
  // cresce com a distância e cai com caminhão maior
  assert.ok(fretePorCabeca(400, 500).porCabeca > f.porCabeca);
  assert.ok(fretePorCabeca(200, 500, { areaM2: CAMINHOES.bitrem }).porCabeca < f.porCabeca);
});

test('frigoríficos: todos com coordenada e ordenados por distância', () => {
  const u = municipio('Uberlândia', 'MG');
  const p = frigorificosProximos(u, FRIGORIFICOS.length);
  assert.equal(p.length, FRIGORIFICOS.length);
  for (let i = 1; i < p.length; i++) assert.ok(p[i].distanciaKm >= p[i - 1].distanciaKm);
  assert.equal(p[0].municipio, 'ARAGUARI');
});
