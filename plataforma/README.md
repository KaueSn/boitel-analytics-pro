# Plataforma Patrimonial — Stratum Agro (Pro)

Estudo de viabilidade e expansão patrimonial na pecuária de corte, de R$ 250 mil até a fazenda própria: zootecnia, lote em boitel, comparação dos modelos A/B/C, projeção de 10+ anos, cenários, Monte Carlo, hedge educacional na B3, comparação com o CDI e caminhos alternativos.

## Rodar
```bash
node plataforma/scripts/servidor.mjs 5180
```
Abra `http://127.0.0.1:5180/plataforma/`. Em `localhost` a página abre em **modo local** (sem login). Publicada, exige login no simulador e plano Pro.

## Testar
```bash
cd plataforma && npm test
```
Usa o executor nativo do Node (≥ 20), sem dependências.

## Estrutura
- `src/engine/`: motor de cálculo puro (unidades, premissas, validação, zootecnia, lote, modelos, patrimônio, hedge, cenários, renda fixa, estratégias, dados de mercado com fonte e data).
- `src/ui/`: interface (vanilla JS em módulos + Chart.js 4.4.0, a mesma versão do simulador).
- `tests/`: testes automáticos do motor, do assistente e de regressões (`npm test`).
- `docs/FORMULAS.md`: fórmulas, exemplo manual e lista de testes. `docs/INTEGRACAO.md`: integração com o site, limitações e análise do objetivo.

## Uso
0. **Jeito fácil**: clique em **Preenchimento guiado** (topo da página) e responda 6 perguntas. Dúvidas: clique no **Triguinho** (canto da tela), o assistente que responde sobre o uso da plataforma com os números da sua simulação. Cada aba tem um quadro "Como usar esta aba".
1. **Melhor opção & região**: compara boitel, arrendar, comprar e renda fixa com o seu capital e lista as regiões que favorecem cada opção.
1. **Região & logística**: cidade de compra e do boitel → distância e frete estimados, frigoríficos com SIF mais próximos (MAPA), VTN da terra (INCRA) e buscas de boitéis, leilões e fazendas.
2. **Premissas**: comece pelo dossiê ou pelo preenchimento guiado e digite os preços da sua região (links em "Onde consultar os preços"). Selos mostram a origem de cada número; os "pendentes" precisam de cotação.
2. **Painel** e **Lote**: resultado por animal, por arroba e por lote; DRE; equilíbrio.
3. **Modelos**, **Cenários**, **Hedge**, **CDI**: comparações nas mesmas condições.
4. **Patrimônio** e **Caminhos**: projeção com fases, alertas de liquidez, área viável, aporte necessário e caminhos alternativos.
5. **Simulações**: salve, duplique, compare até 4 lado a lado, exporte CSV, gere PDF (imprimir) e faça backup em JSON.

## Página do Triguinho
`triguinho.html`: conversa por texto e voz, com a Web Speech API do navegador (reconhecimento no Chrome e no Edge). Simula pedidos em frases ("simule com 500 mil e arroba a 320", "e se a arroba cair 10%?"), com "desfazer", e abre as páginas da plataforma num mini navegador ao lado da conversa (`src/ui/triguinho-comandos.js`). Sem IA: responde por regras e pela base em `src/ui/assistente-base.js` e `assistente-conhecimento.js`. A voz depende do navegador. Não aceita arquivo de áudio gravado.

## Página de plantio
`plantio.html`: estudo de grãos, café, cana, hortifrúti e integração lavoura-pecuária com os números do usuário. Calcula o resultado por hectare e compara com a pecuária (`compararOpcoes`) e o CDI, no mesmo capital e prazo. Cálculo em `src/engine/lavoura.js`; fórmulas em `docs/FORMULAS.md`.

## Atualizar dados de mercado
Edite `src/engine/mercado.js` (valor, data, unidade, limitações). Preços de boi gordo e de reposição não são embutidos (ver `docs/INTEGRACAO.md`).
