// Premissas do lote (zootecnia + finanças), com a origem de cada número.
// origem: 'informado'  = veio do dossiê/briefing do projeto
//         'pesquisado' = fonte registrada em mercado.js (ver `fonte`)
//         'estimado'   = convenção técnica ou estimativa conservadora
//         'pendente'   = sem cotação; valor provisório que DEVE ser substituído
import { valoresPadrao } from './validacao.js';

export const ESQUEMA_LOTE = {
  // --- Capital ---
  capitalInicial: { grupo: 'Capital', rotulo: 'Capital inicial', unidade: 'R$', tipo: 'numero', padrao: 250000, min: 0, max: 1e10, origem: 'informado' },
  reservaPct: { grupo: 'Capital', rotulo: 'Reserva de segurança', unidade: 'fração', tipo: 'numero', padrao: 0.15, min: 0, max: 0.9, origem: 'informado' },
  cabecasFixas: { grupo: 'Capital', rotulo: 'Tamanho do lote (0 = calcular pelo capital)', unidade: 'cab', tipo: 'inteiro', padrao: 0, min: 0, max: 100000, origem: 'estimado' },

  // --- Zootecnia ---
  pesoEntradaKg: { grupo: 'Zootecnia', rotulo: 'Peso de entrada', unidade: 'kg vivo', tipo: 'numero', padrao: 320, min: 100, max: 700, origem: 'informado' },
  gmdKg: { grupo: 'Zootecnia', rotulo: 'Ganho médio diário (GMD)', unidade: 'kg/dia', tipo: 'numero', padrao: 1.6, min: 0, max: 3, origem: 'informado' },
  diasCiclo: { grupo: 'Zootecnia', rotulo: 'Dias de terminação', unidade: 'dias', tipo: 'inteiro', padrao: 90, min: 1, max: 400, origem: 'informado' },
  rcEntrada: { grupo: 'Zootecnia', rotulo: 'Rendimento de carcaça na entrada (base de cobrança)', unidade: 'fração', tipo: 'numero', padrao: 0.50, min: 0.3, max: 0.7, origem: 'estimado', nota: 'Convenção usual de contratos por arroba produzida (50%). Confirme no contrato do boitel.' },
  rcSaida: { grupo: 'Zootecnia', rotulo: 'Rendimento de carcaça na saída', unidade: 'fração', tipo: 'numero', padrao: 0.54, min: 0.3, max: 0.7, origem: 'informado' },
  quebraPesoPct: { grupo: 'Zootecnia', rotulo: 'Quebra de peso (jejum/transporte) antes do abate', unidade: 'fração', tipo: 'numero', padrao: 0, min: 0, max: 0.2, origem: 'estimado', nota: 'Use 0 se o RC informado já é sobre o peso de fazenda.' },
  mortalidadePct: { grupo: 'Zootecnia', rotulo: 'Mortalidade / refugo', unidade: 'fração', tipo: 'numero', padrao: 0.01, min: 0, max: 1, origem: 'estimado' },
  fracaoCicloMorte: { grupo: 'Zootecnia', rotulo: 'Momento médio da morte (fração do ciclo)', unidade: 'fração', tipo: 'numero', padrao: 0.5, min: 0, max: 1, origem: 'estimado' },
  intervaloEntreLotesDias: { grupo: 'Zootecnia', rotulo: 'Intervalo entre lotes', unidade: 'dias', tipo: 'inteiro', padrao: 15, min: 0, max: 365, origem: 'estimado' },
  metaCiclosAno: { grupo: 'Zootecnia', rotulo: 'Limite de ciclos por ano', unidade: 'ciclos', tipo: 'numero', padrao: 3, min: 0.5, max: 6, origem: 'informado', nota: 'Meta do briefing: 2,5 a 3.' },

  // --- Compra ---
  precoCompraCab: { grupo: 'Compra', rotulo: 'Preço do boi magro', unidade: 'R$/cab', tipo: 'numero', padrao: 3328, min: 0, max: 50000, origem: 'informado', nota: 'Premissa do dossiê. Em 27/10/2026 a Scot cotava o garrote Nelore de 300 kg a R$ 4.428,79 (MG) e R$ 4.581,67 (SP).' },
  comissaoCompraPct: { grupo: 'Compra', rotulo: 'Comissão/corretagem na compra', unidade: 'fração', tipo: 'numero', padrao: 0.01, min: 0, max: 0.2, origem: 'pendente' },
  freteEntradaCab: { grupo: 'Compra', rotulo: 'Frete de entrada', unidade: 'R$/cab', tipo: 'numero', padrao: 205, min: 0, max: 5000, origem: 'pendente', fonte: 'simulador-frete' },
  sanidadeCab: { grupo: 'Compra', rotulo: 'Sanidade, medicamentos e manejo', unidade: 'R$/cab', tipo: 'numero', padrao: 45, min: 0, max: 5000, origem: 'pendente' },
  outrasDespesasCab: { grupo: 'Compra', rotulo: 'Outras despesas (GTA, brinco, seguro)', unidade: 'R$/cab', tipo: 'numero', padrao: 25, min: 0, max: 5000, origem: 'pendente' },

  // --- Boitel ---
  modoCobranca: { grupo: 'Boitel', rotulo: 'Forma de cobrança do boitel', tipo: 'opcao', opcoes: ['arroba_produzida', 'diaria'], padrao: 'arroba_produzida', origem: 'informado' },
  precoArrobaProduzida: { grupo: 'Boitel', rotulo: 'Preço por arroba produzida (inclui dieta)', unidade: 'R$/@', tipo: 'numero', padrao: 266.62, min: 0, max: 2000, origem: 'pendente', fonte: 'icbc-set26', nota: 'O ICBC mede o CUSTO de produção (set/2026). O preço do boitel inclui a margem dele: peça cotação.' },
  taxaEntradaBoitelCab: { grupo: 'Boitel', rotulo: 'Taxa fixa de entrada do boitel', unidade: 'R$/cab', tipo: 'numero', padrao: 0, min: 0, max: 5000, origem: 'pendente' },
  alimentacaoDia: { grupo: 'Boitel', rotulo: 'Custo nutricional (modo diária)', unidade: 'R$/cab/dia', tipo: 'numero', padrao: 12, min: 0, max: 200, origem: 'informado' },
  servicoDia: { grupo: 'Boitel', rotulo: 'Serviço/hotelaria além da dieta (modo diária)', unidade: 'R$/cab/dia', tipo: 'numero', padrao: 3.85, min: 0, max: 200, origem: 'pesquisado', fonte: 'icbc-mar26-operacional', nota: 'Custo operacional ICBC (mar/2026), sem margem do prestador.' },
  boitelPagamento: { grupo: 'Boitel', rotulo: 'Pagamento do boitel', tipo: 'opcao', opcoes: ['durante', 'final'], padrao: 'durante', origem: 'estimado', nota: '"durante" exige o capital antes da venda (conservador); "final" = acerto descontado na venda.' },

  // --- Venda ---
  precoVendaArroba: { grupo: 'Venda', rotulo: 'Preço de venda da arroba', unidade: 'R$/@', tipo: 'numero', padrao: 348, min: 0, max: 2000, origem: 'informado', nota: 'Premissa do dossiê. CEPEA SP em 28/10/2026: R$ 389,05; Scot MG Triângulo em 27/10: R$ 371,00.' },
  bonificacaoArroba: { grupo: 'Venda', rotulo: 'Bonificação (ex.: Boi China)', unidade: 'R$/@', tipo: 'numero', padrao: 0, min: -200, max: 200, origem: 'pendente' },
  funruralPct: { grupo: 'Venda', rotulo: 'Funrural sobre a receita bruta', unidade: 'fração', tipo: 'numero', padrao: 0.015, min: 0, max: 0.1, origem: 'pesquisado', fonte: 'lei-funrural' },
  comissaoVendaPct: { grupo: 'Venda', rotulo: 'Comissão de venda', unidade: 'fração', tipo: 'numero', padrao: 0, min: 0, max: 0.2, origem: 'pendente' },
  freteSaidaCab: { grupo: 'Venda', rotulo: 'Frete de saída', unidade: 'R$/cab', tipo: 'numero', padrao: 205, min: 0, max: 5000, origem: 'pendente', fonte: 'simulador-frete' },
  prazoRecebimentoDias: { grupo: 'Venda', rotulo: 'Prazo de recebimento após o abate', unidade: 'dias', tipo: 'inteiro', padrao: 0, min: 0, max: 365, origem: 'estimado' },

  // --- Financeiro e tributos ---
  cdiAnual: { grupo: 'Financeiro', rotulo: 'CDI (custo de oportunidade)', unidade: 'fração a.a.', tipo: 'numero', padrao: 0.1365, min: 0, max: 1, origem: 'pesquisado', fonte: 'bcb-cdi' },
  regimeIR: { grupo: 'Financeiro', rotulo: 'Regime de IR da atividade', tipo: 'opcao', opcoes: ['pf_resultado', 'pf_presumido', 'nenhum'], padrao: 'pf_resultado', origem: 'pendente', nota: 'Defina com o contador. pf_presumido = 20% da receita bruta como base.' },
  aliquotaIR: { grupo: 'Financeiro', rotulo: 'Alíquota de IR aplicada', unidade: 'fração', tipo: 'numero', padrao: 0.275, min: 0, max: 0.5, origem: 'estimado', nota: 'Alíquota marginal máxima da PF (conservador).' }
};

export const PREMISSAS_PADRAO = Object.freeze(valoresPadrao(ESQUEMA_LOTE));

export const ROTULO_ORIGEM = {
  informado: 'Informado (dossiê)',
  pesquisado: 'Pesquisado (com fonte)',
  estimado: 'Estimativa / convenção',
  pendente: 'Pendente de cotação'
};

export function camposPendentes(esquema = ESQUEMA_LOTE) {
  return Object.entries(esquema).filter(([, d]) => d.origem === 'pendente').map(([k, d]) => ({ campo: k, rotulo: d.rotulo }));
}
