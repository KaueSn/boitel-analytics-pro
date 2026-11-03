# Integração com a Stratum Agro e análise do objetivo

## Onde a plataforma fica e por quê
- **Página Pro do simulador**: `boitel-analytics-pro/plataforma/` → `https://kauesn.github.io/boitel-analytics-pro/plataforma/` depois do push.
- Mesma origem do simulador, então aproveita o **mesmo login do Firebase** (sem novo cadastro) e a mesma regra de acesso do Pro (`plan === 'pro'` com assinatura ativa, ou admin). Sem login, a página manda para o simulador; sem Pro, para `stratum-agro.vercel.app/#planos`.
- O simulador ganhou a aba-link **Plataforma Patrimonial PRO** (em `index.html`).
- **Site Stratum Agro**: botão "Plataforma Patrimonial PRO →" ao lado de "Abrir o Simulador" na área logada (`stratum-agro/index.html`, `#btnPlataforma`, junto de `#btnSim`). Liberado com a mesma regra de acesso Pro.

## Limites honestos do bloqueio
- O bloqueio Pro é **de interface**: o motor roda no navegador, e quem souber o endereço dos arquivos `.js` consegue executá-lo. Para proteção real seria preciso servir o cálculo por uma API autenticada (ex.: função da Vercel que valida o token do Firebase), o que tem custo de manutenção e de infraestrutura.
- As simulações ficam no `localStorage`, **por usuário e por navegador**. Elas não aparecem em outro computador.

## Projetos na conta do cliente (preparado, NÃO publicado)
Caminho: `users/{uid}/projetos/{pid}`.

**Regras propostas**: `plataforma/config/firestore-projetos.rules` (bloco a inserir em `match /users/{uid}`, logo depois do `allow delete` do perfil).
- Só o dono lê, cria, altera e exclui. **Admin não lê** (dado financeiro privado; LGPD). Para consultoria, o cliente exporta o JSON e envia.
- Criar e alterar exigem plano Pro ativo (`plan == 'pro'`, `status == 'active'`, `subscription != 'expired'`) ou admin. Ler e excluir, não: quem sai do Pro continua com acesso aos próprios dados.
- Até 50 projetos por conta: o id precisa ser `p00`…`p49` (a regra impõe; o Firestore não conta documentos).
- Esquema fechado (7 campos, `formato == 1`), nome ≤ 120 caracteres, até 10 versões, blocos do estado como mapas com tamanho limitado, `criadoEm` imutável.
- Limitação: a regra não confere a data `subscriptionEnd` (é texto). A assinatura vencida só é barrada quando o campo `subscription` vira `expired`.

**Testes**: `stratum-agro/tests/firestore-rules/projetos.test.js`. Ele junta em memória o `firestore.rules` atual com o bloco, sem alterar o arquivo. Em 29/10/2026: 6/6 aprovados, e as regras atuais (`rules.test.js`) seguiram com 39/39. Para rodar:
`cd stratum-agro/tests/firestore-rules && npx firebase emulators:exec --only firestore --project demo-stratum "node --test projetos.test.js"`
Se o CLI do Firebase travar ao iniciar (aconteceu nesta máquina: até `firebase --version` levava mais de 40 s), suba o emulador direto pelo Java e rode os testes:
`java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar --host 127.0.0.1 --port 8085 --project_id demo-stratum` e, em outro terminal, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node --test projetos.test.js`.

**Adaptador**: `src/ui/armazenamento-conta.js` (mesma interface do local; testes em `tests/armazenamento-conta.test.js`). Com plano Pro, a página tenta ler a conta: se as regras ainda não foram publicadas (permissão negada), continua salvando no navegador sem erro. Na aba Simulações aparece "Copiar as simulações deste navegador para a conta", que não apaga as cópias locais.

**Situação em 01/11/2026**: regras **publicadas** no Console (projeto `boitel-analytics`), conferidas por hash com o arquivo testado (45/45 no emulador). Commit `b74cb32` em `stratum-agro`. A plataforma está no ar desde o commit `c5dd229` do simulador: com plano Pro, as simulações passam a ser salvas na conta.

## O que os números dizem sobre o objetivo
- **Com as premissas do dossiê** (boi magro a R$ 3.328, arroba a R$ 348): 39 cabeças por lote, lucro líquido de R$ 6,7 mil por ciclo, 9,7% a.a. contra 10,5% do CDI líquido em prazo curto. É praticamente empate com a renda fixa, com muito mais risco.
- **O ponto mais sensível é o ágio da reposição**: quanto a arroba do animal magro custa acima da arroba do boi gordo. A aba Caminhos calcula esse ágio com os preços que o usuário informa e mostra onde a conta fecha (peso × dias de cocho). Confira com os preços atuais da sua região: as premissas do dossiê podem estar desatualizadas.
- **Fazenda**: o preço da terra muda muito por região. A aba Região & logística traz o VTN do INCRA (piso fiscal) e a aba Caminhos calcula a área viável por ano e o aporte mensal necessário.

## Preços de boi gordo e de reposição
A plataforma não embute essas cotações: CEPEA (CC BY-NC) e CONAB autorizam só uso sem fins lucrativos e a Scot proíbe a reprodução sem autorização, e a plataforma é paga. O usuário consulta pelos links e digita nas premissas. Para embutir preços por região seria preciso autorização por escrito ou licença de dados.

## Caminhos e alternativas para avaliar (em ordem de impacto)
1. **Conseguir cotação real do boitel** (preço por @ produzida e RC de entrada). Hoje o modelo usa o custo ICBC como piso, e o preço real tende a ser maior.
2. **Comprar melhor**: preço por kg menor, compra na safra ou em outra região, frete negociado. Cada R$ 100/cab a menos melhora o lote em R$ 100 × número de cabeças (mais a comissão).
3. **Vender melhor**: bonificação Boi China, venda a termo ou futuro quando o BGI estiver acima do físico regional, put para garantir um piso.
4. **Animais mais pesados e ciclos mais longos**: a conta melhora, mas só se o boitel confirmar GMD e preço nesses prazos.
5. **Parceria em vez de compra**: arrendar pasto e fazer parceria pecuária preserva liquidez. Comprar terra pode esperar até o patrimônio sustentar terra mais giro.
6. **Manter o capital em renda fixa** (reserva em título isento, se a regra vigente permitir) até o spread voltar. Esperar também é uma decisão válida.
7. **Aporte mensal**: a aba Caminhos calcula quanto seria preciso para comprar uma área definida até o ano escolhido.

Nada disso é recomendação de investimento. Confirme contratos, tributação (contador) e crédito rural (banco/MAPA) antes de decidir.
