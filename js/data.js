// ============================================
// DATABASE DE ESTADOS - Cotações e Custos
// ============================================
const estadosDB = [
  { nome: "São Paulo (SP)", sigla: "SP", arrobaVenda: 372.20, boiMagro: 5145.00, freteCab: 260.00, regiao: "Noroeste / Barretos" },
  { nome: "Minas Gerais (MG)", sigla: "MG", arrobaVenda: 358.00, boiMagro: 4990.00, freteCab: 410.00, regiao: "Triângulo Mineiro" },
  { nome: "Goiás (GO)", sigla: "GO", arrobaVenda: 349.80, boiMagro: 4966.00, freteCab: 580.00, regiao: "Sul Goiano" },
  { nome: "Mato Grosso do Sul (MS)", sigla: "MS", arrobaVenda: 361.80, boiMagro: 5389.00, freteCab: 490.00, regiao: "Leste / Três Lagoas" },
  { nome: "Mato Grosso (MT)", sigla: "MT", arrobaVenda: 344.00, boiMagro: 5188.00, freteCab: 850.00, regiao: "Rondonópolis" }
];

// ============================================
// REFERÊNCIA DE DIÁRIA DE HOTELARIA POR REGIÃO
// Fontes: ICBC / Scot Consultoria (ago/2025) e média nacional 2025.
// São valores de REFERÊNCIA — confirme sempre com o boitel parceiro.
// ============================================
const DIARIA_REFERENCIA = {
  SP:       { valor: 19.80, fonte: 'ICBC São Paulo, ago/2025' },
  MG:       { valor: 18.50, fonte: 'estimativa Sudeste' },
  GO:       { valor: 15.97, fonte: 'ICBC Goiás, ago/2025' },
  MS:       { valor: 16.20, fonte: 'estimativa Centro-Oeste' },
  MT:       { valor: 16.00, fonte: 'estimativa Centro-Oeste' },
  NACIONAL: { valor: 14.78, fonte: 'média nacional 2025' }
};

// ============================================
// VARIÁVEIS GLOBAIS PARA GRÁFICOS
// ============================================
let lucroChart = null;
let custosChart = null;
let roicChart = null;
