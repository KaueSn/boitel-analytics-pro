# Fórmulas, convenções e validação

Todas as fórmulas ficam em `src/engine/` (sem DOM, testáveis em Node). A interface só lê os resultados.

## Convenções
- **1 arroba (@) = 15 kg de carcaça.** @ = peso vivo × rendimento de carcaça (RC) ÷ 15.
- Valores **nominais**, sem inflação. Taxas compostas em dias corridos: `(1 + taxa)^(dias/365) − 1`.
- Mortalidade como **valor esperado** (fração de cabeças). Animal morto: comprado (custo) e não vendido (sem receita). Não existe linha extra de "perda", para não contar duas vezes.
- Origem de cada premissa: *informado* (dossiê), *pesquisado* (fonte em `mercado.js`), *estimado* (convenção) e *pendente* (sem cotação).

## Zootecnia (`zootecnia.js`)
| Grandeza | Fórmula |
|---|---|
| Ganho | GMD × dias |
| Peso de saída | peso de entrada + ganho |
| Peso de abate | saída × (1 − quebra) |
| @ entrada | entrada × RC de entrada ÷ 15 (base de cobrança do contrato) |
| @ saída | abate × RC de saída ÷ 15 |
| @ produzidas | @ saída − @ entrada |
| Rendimento do ganho | (carcaça saída − carcaça entrada) ÷ ganho vivo (aviso fora de 40%–80%) |
| Giro | dias + prazo de recebimento + intervalo entre lotes |
| Ciclos/ano | mín(365 ÷ giro, limite informado) |

## Lote (`lote.js`), por cabeça comprada, com v = 1 − mortalidade
- Compra = preço × (1 + comissão de compra); frete de entrada, sanidade, outras e taxa de entrada sobre todas as cabeças.
- Boitel **por @ produzida**: v × máx(0, @ produzidas) × preço/@ (a dieta já está incluída; `alimentacaoDia` e `servicoDia` são ignorados).
- Boitel **por diária**: (v × dias + m × dias × fração do ciclo na morte) × (dieta + serviço).
- Frete de saída = v × frete.
- Receita bruta = v × @ saída × (preço + bonificação). **Deduções** (não são custo): Funrural e comissão de venda.
- Lucro operacional = receita líquida − custo operacional. IR: `pf_resultado` = máx(0, lucro) × alíquota; `pf_presumido` = 20% × receita bruta × alíquota.
- Lucro econômico = lucro líquido − capital empregado × CDI no período (o custo de oportunidade não sai do caixa).
- Cabeças = piso(capital produtivo ÷ caixa pico por cabeça). Pico = custos antes da venda; o boitel entra no pico só se for pago "durante".
- Preço de equilíbrio = custo operacional ÷ (@ vendidas × (1 − Funrural − comissão)) − bonificação.
- Compra de equilíbrio = preço atual + lucro operacional ÷ (n × (1 + comissão)).
- Retorno anual = (1 + retorno do ciclo)^(ciclos/ano) − 1. Payback = capital ÷ lucro por ciclo × giro.

### Exemplo 1 — verificado à mão (`tests/lote.test.js`)
Premissas do dossiê, lote fixo de 100 cabeças, mortalidade de 1%, boitel a R$ 266,62/@ produzida, fretes de R$ 205 + R$ 205:
- Saída 320 + 1,6 × 90 = **464 kg**; @ saída = 464 × 0,54 ÷ 15 = **16,704 @**; @ entrada = 320 × 0,50 ÷ 15 = 10,667 @; produzidas = **6,037 @**.
- Receita/cab = 0,99 × 16,704 × 348 = R$ 5.754,86; Funrural = R$ 86,32.
- Custo/cab = 3.328 + 33,28 + 205 + 45 + 25 + 0,99 × 6,037 × 266,62 (1.593,58) + 0,99 × 205 (202,95) = R$ 5.432,81.
- Lucro operacional = 100 × (5.754,86 − 86,32 − 5.432,81) ≈ **R$ 23.573**; IR de 27,5% → lucro líquido ≈ R$ 17.091.

## Modelos (`modelos.js`)
- **A**: capacidade = piso((capital produtivo − equipamentos − licenciamento) ÷ (instalações/cab + giro/cab)); exige escala mínima. Anual = ciclos × lote (dieta própria) − custos fixos − depreciação. Fluxo de caixa = lucro + depreciação.
- **B**: lote × ciclos/ano.
- **C**: recria com GMD ponderado pela fração de seca; terminação sem nova compra; giro = recria + terminação + prazo + intervalo.

## Projeção (`patrimonio.js`)
Passo diário. Caixa parado rende CDI × % × (1 − IR). Cada lote começa com o caixa menos a reserva e menos 12 meses de compromissos da fazenda. A fazenda só é comprada se o caixa cobrir o desembolso, a reserva, o giro mínimo (fração do último lote) e 12 meses de custos e parcelas. Price ou SAC mensais. PL = caixa + animais (ao custo) + terra − dívida.

## Hedge (`hedge.js`)
Contratos = @ × cobertura ÷ 330 (arredondamento escolhido). Put = 330n × máx(K − F, 0) − 330n × prêmio − custos. Futuro vendido = 330n × (F₀ − F) − custos. Físico = (F + base) × @. Black-76 só como prêmio teórico educacional.

## Renda fixa (`rendaFixa.js`)
IR regressivo (22,5 / 20 / 17,5 / 15%), alíquota pelo prazo total. Comparação sempre líquido × líquido, mesmo capital e prazo.

## Melhor opção por capital (`estudo.js`)
Mesmo capital e mesmo prazo (1 ano) para todas as opções: resultado = resultado líquido da operação + (capital − capital na operação) × CDI líquido de 1 ano (IR de 17,5%).
- **Boitel**: modelo B. **Arrendar pasto**: modelo C. **Arrendar área**: modelo A (com escala mínima). **Renda fixa**: todo o capital no CDI líquido.
- **Comprar terra**: área = mín(área desejada, 50% do capital disponível ÷ (preço/ha × (1 + custos de aquisição))); exige pelo menos 5 ha. O resto do capital roda o modelo C, com pasto próprio até a lotação da área. Custos anuais = manutenção/ha × área + ITR × valor da terra + mão de obra × 12. Valorização da terra não entra no resultado do ano.

## Melhor região (`estudo.js`)
Por região rural do INCRA, a partir do centro geográfico dos seus municípios: frigoríficos com SIF no raio (linha reta × 1,3) e capacidade somada por classe (até 20 = 20; 20 a 40 = 30; 40 a 80 = 60; mais de 80 = 80 cab/h).
- Acesso = 0,5 × √(capacidade ÷ maior capacidade) + 0,5 × (1 − distância do mais próximo ÷ raio). Custo = 1 − posição do VTN médio em escala logarítmica.
- Nota: boitel = acesso; arrendar = 50% custo + 50% acesso; comprar = 60% custo + 40% acesso.
- Teto do arrendamento = 15% × VTN por ano (Estatuto da Terra, art. 95, XII; o VTN aproxima o valor cadastral).
- Limites: não considera preço do boi e da reposição, oferta de boitéis e pastos, clima nem qualidade da terra.

## Testes executados
`npm test` (em `plataforma/`): 138 testes, todos aprovados em 03/11/2026. Cobrem conversões, exemplo manual, fechamento da DRE (sem dupla contagem), modos de cobrança, dimensionamento e reserva, equilíbrio (fórmula fechada × bisseção), prejuízo, mortalidade de 100%, capital zero, atraso de recebimento, validação de entradas, IR, CDI, hedge (piso calculado à mão), Black-76 (paridade), cenários, tornado, Monte Carlo reprodutível, modelos A/B/C, conservação e reconciliação do patrimônio, compra forçada com alerta, caminhos e interpolação de preços.
