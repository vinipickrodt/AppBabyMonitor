# AppBabyMonitor — Backlog de UX

Data da análise: 13 de agosto de 2026  
Repositório analisado: `vinipickrodt/AppBabyMonitor` (`main`, commit `5a7963f`)  
Objetivo: transformar o PWA atual em um app de registro neonatal rápido, confiável e confortável de usar com uma mão, inclusive durante a madrugada.

## Resultado esperado

O produto deve permitir:

- iniciar uma mamada ou um sono em no máximo dois toques;
- registrar uma fralda básica em dois toques mais “Salvar”;
- entender imediatamente se existe uma atividade em andamento;
- recuperar contadores esquecidos sem inventar horários;
- corrigir qualquer registro sem medo de perder dados;
- consultar hoje, histórico e padrões sem misturar registros duvidosos nas médias;
- evoluir para múltiplos cuidadores sem refazer o modelo de dados.

## Princípios de UX

1. **Começar primeiro, detalhar depois.** Nenhum formulário longo antes de iniciar um contador.
2. **Salvar imediatamente.** Ao encerrar, o horário final é gravado naquele toque; notas e detalhes são editados depois.
3. **Nunca adivinhar silenciosamente.** Sugestões de correção precisam de confirmação.
4. **Uma ação primária por tela.** Controles grandes, claros e próximos da zona do polegar.
5. **Divulgação progressiva.** Campos clínicos e detalhes opcionais aparecem somente quando relevantes.
6. **Horários são a fonte da verdade.** A duração exibida é calculada a partir de `startAt` e `endAt`.
7. **Dados suspeitos não distorcem insights.** Permanecem visíveis como “Revisar”.
8. **Local-first e tolerante a interrupções.** Fechar o app, reiniciar o telefone ou ficar offline não pode perder um registro ativo.

## Diagnóstico do código atual

### O que já está bem encaminhado

- Separação simples entre UI, domínio, serviço e persistência.
- Registros ativos persistidos em `localStorage`, portanto sobrevivem a recarregamentos.
- Mamada já suporta segmentos por seio.
- PWA possui manifest, service worker e shell offline.
- A suíte atual tem 15 testes passando.

### Principais lacunas de UX encontradas

- `App.js` renderiza apenas um dashboard; não há navegação, perfil, histórico completo ou insights.
- O tempo ativo não é atualizado visualmente a cada minuto/segundo; a UI mostra principalmente o horário inicial.
- Ao tocar em **Finalizar**, abre-se um formulário e o contador só termina ao enviar esse formulário. O tempo preenchendo notas entra indevidamente na duração.
- Mamada e sono podem permanecer ativos ao mesmo tempo.
- O início da mamada exige abrir uma folha, escolher opcionalmente o seio e salvar antes de começar.
- Não existe pausa de mamada nem distinção entre tempo total da sessão e tempo efetivamente mamado.
- Não existe modalidade mamadeira/fórmula nem volume oferecido/consumido.
- A fralda abre um formulário longo, com alerta clínico antes da escolha básica; “xixi normal” vem implicitamente selecionado.
- Registro manual aceita somente uma duração que termina “agora”; não permite escolher início e fim reais.
- Apagar é imediato, sem confirmação ou desfazer; não existe edição.
- Não há recuperação de contador esquecido, estados pendentes de revisão ou exclusão de outliers das médias.
- O armazenamento não tem versão de schema/migrações explícitas.

## Milestones sugeridos

| Milestone | Objetivo | Issues |
|---|---|---|
| M1 — Registro sem atrito | Redesenhar Hoje e os três fluxos essenciais | UX-001 a UX-008 |
| M2 — Dados confiáveis | Corrigir, recuperar e proteger os registros | UX-009 a UX-013 |
| M3 — Histórico e compreensão | Transformar dados em linha do tempo e insights | UX-014 a UX-017 |
| M4 — Compartilhamento e sistema | Múltiplos cuidadores, notificações e integrações iOS | UX-018 a UX-020 |

## M1 — Registro sem atrito

### UX-001 — Criar app shell com navegação Hoje, Histórico, Insights e Perfil

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** nenhuma

**Mudanças**

- Criar quatro áreas persistentes: Hoje, Histórico, Insights e Perfil.
- Usar navegação inferior fixa em telas principais e ocultá-la nos fluxos focados de registro.
- Introduzir estado de rota simples, sem exigir framework.
- Preservar safe areas e posição ao voltar de uma tela de registro.

**Critérios de aceite**

- A área atual fica evidente visualmente e para leitores de tela.
- Voltar de um registro retorna ao mesmo contexto de Hoje.
- O botão Voltar do navegador não fecha o app nem perde estado inesperadamente.
- O conteúdo não fica coberto pela navegação em telas pequenas.

**Arquivos prováveis:** `src/app/App.js`, `src/styles/layout.css`, novos componentes de navegação e tela.

---

### UX-002 — Redesenhar a tela Hoje em torno da próxima ação

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** UX-001

**Mudanças**

- Personalizar o cabeçalho com nome do bebê e saudação contextual.
- Transformar **Iniciar mamada** na ação primária.
- Manter **Registrar fralda** e **Iniciar sono** como ações secundárias grandes.
- Condensar mamadas, fraldas e sono de hoje em um único card de resumo.
- Mostrar os registros mais recentes em uma linha do tempo curta com acesso a “Ver histórico”.
- Criar estado vazio que explica claramente o primeiro registro.

**Critérios de aceite**

- As três ações essenciais ficam acessíveis com uma mão sem rolagem em um iPhone comum.
- Não há três cards concorrendo visualmente com as ações.
- Se existir contador ativo, ele substitui a ação mais importante do dashboard.
- Estado vazio possui uma única recomendação clara, não texto genérico.

**Arquivos prováveis:** `Header.js`, `SummaryCards.js`, `QuickActions.js`, `EntryList.js`, CSS.

---

### UX-003 — Criar motor de sessão ativa e card persistente de contador

**Prioridade:** P0 · **Tamanho:** L · **Dependências:** UX-001

**Mudanças**

- Padronizar o registro ativo com `startAt`, `status`, `updatedAt`, `version` e detalhes do tipo.
- Calcular a duração a partir do relógio atual; nunca persistir um número de contador como fonte da verdade.
- Atualizar a duração visível enquanto a tela estiver aberta.
- Exibir faixa/card persistente em Hoje e ao navegar entre áreas.
- Ao tocar no card, abrir a tela de controles da atividade.
- Adicionar migração transparente para `activeRecords` já existentes.

**Critérios de aceite**

- Recarregar, fechar e reabrir o PWA mantém horário e duração corretos.
- Alterar de aba/tela não cria um segundo contador.
- Um registro iniciado offline continua funcional.
- A UI não depende de o JavaScript ter executado continuamente em segundo plano.

**Arquivos prováveis:** `BabyLogService.js`, `LocalStorageBabyLogRepository.js`, `App.js`, novo `ActiveSessionCard.js`.

---

### UX-004 — Redesenhar o fluxo de mamada no peito

**Prioridade:** P0 · **Tamanho:** L · **Dependências:** UX-003

**Fluxo alvo:** Hoje → Iniciar mamada → Esquerdo/Direito → contador.

**Mudanças**

- Substituir o formulário inicial por escolha focada de seio ou modalidade.
- Exibir lado atual, tempo no lado, total efetivamente mamado e tempo total da sessão.
- Adicionar **Trocar lado**, **Pausar/Continuar** e **Finalizar**.
- Modelar pausas fechando o segmento ativo e retomando com novo segmento.
- Ao finalizar, salvar naquele toque e abrir resumo editável opcional.
- No resumo, mostrar sequência: esquerdo → pausa → direito.

**Critérios de aceite**

- A mamada inicia em dois toques a partir de Hoje.
- Trocar o lado exige um toque e nunca perde segmentos anteriores.
- Pausas não entram no “tempo mamando”, mas aparecem no tempo total da sessão.
- O toque em Finalizar define imediatamente `endAt`; preencher notas não altera a duração.
- Fechar o resumo não desfaz a mamada já salva.

**Arquivos prováveis:** `QuickActions.js`, `RecordSheet.js` (dividir), `BabyLogService.js`, `babyEvents.js`.

---

### UX-005 — Adicionar mamadeira com volume oferecido e consumido

**Prioridade:** P1 · **Tamanho:** M · **Dependências:** UX-004, UX-017

**Mudanças**

- Adicionar modalidades leite materno na mamadeira e fórmula.
- Iniciar sem exigir volume.
- Ao finalizar, solicitar opcionalmente volume oferecido e volume consumido.
- Permitir completar ou corrigir volumes depois.
- Ocultar a modalidade quando desativada no Perfil.

**Critérios de aceite**

- O usuário pode salvar sem saber o volume exato.
- `consumido` não pode exceder `oferecido` sem confirmação explícita.
- Histórico diferencia peito, leite materno em mamadeira e fórmula.
- Insights somam somente volumes informados e deixam a cobertura dos dados clara.

**Arquivos prováveis:** `babyEvents.js`, fluxo de mamada, histórico, stats.

---

### UX-006 — Criar fluxo mínimo de sono

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** UX-003

**Mudanças**

- Manter início em um toque a partir de Hoje.
- Tela ativa com “Antônio está dormindo”, início, duração e botão grande **Acordou**.
- Ação secundária **Corrigir início**.
- Não oferecer pausa; se acordou, o sono terminou.
- Ao tocar em **Acordou**, salvar imediatamente e mostrar confirmação com Desfazer.

**Critérios de aceite**

- Iniciar e terminar um sono exige um toque em cada ponta.
- Não existe controle de pausa.
- Corrigir início recalcula a duração sem duplicar o registro.
- Um novo sono após acordar cria outro registro.

**Arquivos prováveis:** `QuickActions.js`, novo `SleepSessionView.js`, service/domain.

---

### UX-007 — Redesenhar o registro de fralda com divulgação progressiva

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** UX-002

**Fluxo alvo:** Hoje → Registrar fralda → Xixi/Cocô/Ambos → Salvar.

**Mudanças**

- Tornar Xixi, Cocô e Xixi + cocô as três escolhas dominantes.
- Não presumir xixi por padrão.
- Usar horário “agora”, editável.
- Manter quantidade, peso, cor, consistência, assadura, vazamento e notas como opcionais.
- Mostrar cor e consistência apenas se houver cocô.
- Recolher sinais clínicos e referências em uma seção “Mais detalhes / pontos de atenção”.
- Fixar **Salvar fralda** na zona inferior do polegar.

**Critérios de aceite**

- Salvar fica habilitado somente após escolher o conteúdo.
- Registro básico não exige abrir nenhuma seção opcional.
- Selecionar apenas Xixi oculta todos os campos de fezes.
- Ao voltar para editar, todos os valores aparecem corretamente.
- Alertas médicos não competem visualmente com a tarefa principal.

**Arquivos prováveis:** dividir `RecordSheet.js` em `DiaperRecordSheet.js`; ajustar `babyEvents.js` e CSS.

---

### UX-008 — Padronizar feedback, Desfazer e tratamento de erros

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** UX-002

**Mudanças**

- Snackbar após salvar, encerrar, editar ou apagar.
- Ação **Desfazer** para criação e exclusão recentes.
- Estados de ação em andamento para evitar duplo toque.
- Erros em linguagem humana, próximos à ação, preservando os campos preenchidos.
- Feedback tátil quando disponível e respeitando preferências do sistema.

**Critérios de aceite**

- Duplo toque não cria dois registros.
- Um erro de armazenamento não fecha a folha nem apaga os dados digitados.
- Exclusão pode ser recuperada imediatamente.
- Feedback não depende apenas de cor.

**Arquivos prováveis:** `App.js`, `BabyLogService.js`, repositório, novo `Snackbar.js`.

## M2 — Dados confiáveis

### UX-009 — Impedir atividades incompatíveis e criar transições em um toque

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** UX-003, UX-004, UX-006

**Mudanças**

- Não permitir mamada e sono ativos simultaneamente.
- Se iniciar sono durante mamada: oferecer **Encerrar mamada e iniciar sono**.
- Se iniciar mamada durante sono: oferecer **Encerrar sono e iniciar mamada**.
- Fralda pode ser registrada durante qualquer atividade.
- Preservar alternativas Continuar e Corrigir horário.

**Critérios de aceite**

- A opção principal executa as duas ações atomicamente e com um toque.
- Se a segunda ação falhar, a UI explica o estado real sem duplicar registros.
- Nunca há dois eventos de duração ativos após uma transição concluída.

**Arquivos prováveis:** `BabyLogService.js`, componentes de ação e confirmação.

---

### UX-010 — Recuperar contadores esquecidos

**Prioridade:** P0 · **Tamanho:** L · **Dependências:** UX-003, UX-013

**Mudanças**

- Detectar durações improváveis por tipo usando limites configuráveis.
- Ao retornar, mostrar: Terminou agora, Escolher horário, Usar duração habitual, Continuar ou Descartar.
- Nunca aplicar a duração habitual automaticamente.
- Oferecer atalhos “há 10 min” e “há 30 min”.
- Usar eventos posteriores incompatíveis como contexto: “provavelmente terminou antes do sono das 13:45”.

**Critérios de aceite**

- O app nunca encerra silenciosamente um contador.
- Escolher um horário anterior valida que `endAt >= startAt`.
- A sugestão habitual fica claramente identificada como estimativa.
- O usuário pode adiar a decisão e continuar usando partes compatíveis do app.

**Arquivos prováveis:** novo `ActiveRecordRecovery.js`, service, settings e domínio.

---

### UX-011 — Criar registro manual completo e correção de horários

**Prioridade:** P1 · **Tamanho:** M · **Dependências:** UX-004, UX-006, UX-007

**Mudanças**

- Fluxo unificado: tipo → data/horário → duração ou início/fim → detalhes.
- Não presumir obrigatoriamente que o evento terminou agora.
- Permitir inserir mamada por lados/segmentos, mamadeira, sono e fralda.
- Reaproveitar o fluxo para resolver contador esquecido.
- Validar datas futuras e sobreposições, permitindo confirmar exceções legítimas.

**Critérios de aceite**

- É possível registrar algo ocorrido ontem.
- Início/fim e duração permanecem sincronizados.
- Alterar o tipo não mantém campos incompatíveis escondidos.
- Cancelar não salva parcialmente.

**Arquivos prováveis:** substituir o modo `duration` de `RecordSheet.js`; service/domain.

---

### UX-012 — Versionar o schema local e preservar dados existentes

**Prioridade:** P0 · **Tamanho:** M · **Dependências:** deve acompanhar UX-003

**Mudanças**

- Criar `schemaVersion` e migrações incrementais.
- Introduzir desde já `babyId`, `createdBy`, `updatedAt` e `version`, mesmo em modo local.
- Manter leitura dos formatos legados (`activeSleep`, `diaperTypes`, registros atuais).
- Fazer backup local antes de migrações destrutivas e oferecer exportação.

**Critérios de aceite**

- Dados produzidos pela versão atual continuam visíveis após atualização.
- Migração é idempotente.
- Falha de migração não sobrescreve o conjunto original.
- Testes cobrem pelo menos um fixture por versão legada.

**Arquivos prováveis:** `LocalStorageBabyLogRepository.js`, `babyEvents.js`, testes.

---

### UX-013 — Marcar registros suspeitos como “Revisar”

**Prioridade:** P1 · **Tamanho:** M · **Dependências:** UX-010, UX-012

**Mudanças**

- Adicionar status `needs_review` além de `completed`.
- Marcar durações improváveis ou registros recuperados sem confirmação.
- Exibir chip “Duração pendente de confirmação” no histórico.
- Excluir pendentes de médias e tendências, mas mantê-los na contagem de itens a revisar.

**Critérios de aceite**

- Um sono ou mamada abandonado não distorce médias.
- Confirmar ou editar muda o status para concluído.
- Insights informam quantos registros ficaram fora do cálculo.

**Arquivos prováveis:** `babyEvents.js`, `stats.js`, histórico, recovery.

## M3 — Histórico e compreensão

### UX-014 — Criar Histórico como linha do tempo por dia

**Prioridade:** P1 · **Tamanho:** M · **Dependências:** UX-001, UX-013

**Mudanças**

- Agrupar registros por Hoje, Ontem e data.
- Ordenar por horário real e mostrar início/fim quando relevante.
- Filtros: Todos, Mamadas, Fraldas, Sono e Revisar.
- Carregar progressivamente períodos antigos.
- Tocar em um item abre detalhes; excluir deixa de ser a ação visual principal.

**Critérios de aceite**

- Um registro é localizável por data e tipo sem percorrer uma lista única de 20 itens.
- Filtro e posição são preservados ao voltar dos detalhes.
- Estados vazio e sem resultados de filtro são diferentes.

**Arquivos prováveis:** substituir/expandir `EntryList.js`, novas views e funções de agrupamento.

---

### UX-015 — Criar detalhes, edição e exclusão segura de registro

**Prioridade:** P1 · **Tamanho:** L · **Dependências:** UX-011, UX-014, UX-008

**Mudanças**

- Tela de detalhes com todos os horários, segmentos, volumes, fralda e notas.
- Editar tipo, horário, duração e detalhes com validações.
- Excluir com confirmação contextual e snackbar Desfazer.
- Registrar `updatedAt`; preparar autoria da alteração para cuidadores futuros.

**Critérios de aceite**

- Toda informação capturada pode ser corrigida.
- Editar um segmento recalcula totais por lado e total efetivo.
- Excluir nunca acontece com um único toque acidental no ícone da timeline.
- Voltar sem salvar mantém o registro original.

**Arquivos prováveis:** service/repository com `updateEntry`, novas telas de detalhe/edição.

---

### UX-016 — Criar Insights úteis e honestos

**Prioridade:** P2 · **Tamanho:** L · **Dependências:** UX-005, UX-013, UX-014

**Mudanças**

- Períodos Hoje, 7 dias e 30 dias.
- Mamadas: quantidade, duração efetiva, intervalos e divisão por lado/modalidade.
- Mamadeiras: volume consumido e cobertura dos registros com volume.
- Fraldas: xixi, cocô e ambos por dia.
- Sono: total, quantidade de períodos, média e maior período.
- Evidenciar dados ausentes e itens excluídos por revisão.

**Critérios de aceite**

- Nenhum gráfico é exibido quando um número e uma frase comunicam melhor.
- Médias não incluem `needs_review`.
- Usuário entende período, unidade e quantidade de dados de cada insight.
- Insights não fazem diagnóstico ou recomendação médica automática.

**Arquivos prováveis:** `stats.js`, nova view Insights e testes.

---

### UX-017 — Criar onboarding, Perfil do bebê e preferências

**Prioridade:** P1 · **Tamanho:** L · **Dependências:** UX-001, UX-012

**Mudanças**

- Onboarding curto: nome, data de nascimento e modalidades de alimentação usadas.
- Perfil: editar bebê, visibilidade de modalidades, lembretes e limiares de contador.
- Notificações configuráveis, nunca obrigatórias.
- Exportar/backup dos dados em formato legível.
- Preparar seção Cuidadores sem expor controles ainda indisponíveis.

**Critérios de aceite**

- Usuário consegue começar com o mínimo e completar preferências depois.
- Desativar mamadeira remove essa opção dos fluxos sem apagar registros antigos.
- Recusar notificações não prejudica o registro manual.
- Exportação informa claramente intervalo e conteúdo.

**Arquivos prováveis:** novas views, settings repository, header/dashboard.

## M4 — Compartilhamento e sistema

### UX-018 — Preparar e implementar múltiplos cuidadores

**Prioridade:** P2 · **Tamanho:** XL · **Dependências:** UX-012, UX-015, UX-017

**Mudanças**

- Separar conceito de bebê, cuidador e dispositivo.
- Sincronizar contador e histórico entre aparelhos.
- Exibir “Mamada iniciada por Carol às 13:02”.
- Permitir que outro cuidador finalize ou corrija.
- Prevenir duplicatas e resolver conflitos offline com versão e histórico de autoria.

**Critérios de aceite**

- Dois aparelhos mostram a mesma atividade ativa após sincronização.
- Ações concorrentes não criam dois eventos finais.
- Alterações informam autor e horário.
- O app continua utilizável offline e explica pendências de sincronização.

**Observação:** tratar como épico; quebrar em autenticação/convite, backend, sync, conflitos e UI.

---

### UX-019 — Implementar lembretes e experiência de notificação no PWA

**Prioridade:** P2 · **Tamanho:** L · **Dependências:** UX-010, UX-017 e backend de push

**Mudanças**

- Pedir permissão apenas após ação explícita e depois de explicar o benefício.
- Notificar contador prolongado com ações claras: continuar ou revisar.
- Abrir diretamente a tela correta ao tocar na notificação.
- Respeitar preferência, horário silencioso e suporte do dispositivo.
- Mostrar instrução de instalação na tela inicial somente quando relevante.

**Critérios de aceite**

- Sem permissão, toda recuperação continua disponível ao reabrir o app.
- Notificações não são repetitivas nem encerram contadores.
- Tocar na notificação abre o registro exato.
- Preferências podem ser alteradas ou revogadas.

**Limite técnico:** Web Push funciona em web apps instalados na tela inicial do iOS, mas não equivale a uma Live Activity na Dynamic Island.

---

### UX-020 — Avaliar app nativo/wrapper para Live Activities e Dynamic Island

**Prioridade:** P3 · **Tamanho:** L/XL · **Dependências:** produto validar demanda real

**Mudanças**

- Fazer spike comparando PWA puro, wrapper e app iOS nativo.
- Para Dynamic Island/tela bloqueada em tempo real, projetar extensão ActivityKit.
- Definir ponte segura entre a sessão do app e a Live Activity.
- Tratar encerramento/correção feito pelo sistema sem divergir do registro principal.

**Critérios de aceite do spike**

- Documento decide abordagem, custo, manutenção e limitações.
- Protótipo prova iniciar, atualizar e finalizar uma atividade sem duplicar registros.
- A decisão não bloqueia a evolução do PWA.

## Trabalho transversal obrigatório

Aplicar em todas as issues, não criar como “polimento final”:

- alvos de toque de pelo menos 44–48 px;
- contraste adequado, foco visível e navegação por teclado;
- labels e anúncios de leitor de tela para estado do contador;
- respeito a `prefers-reduced-motion`;
- safe areas, teclado virtual e telas de 320 px;
- estados vazio, carregando, offline, erro e atualização disponível;
- testes unitários do domínio e testes de fluxo para os caminhos essenciais;
- strings em português com acentuação correta;
- nenhuma recomendação médica automática baseada nos registros.

## Ordem recomendada de implementação

1. UX-001, UX-012 e a base de UX-003.
2. UX-002 e UX-008.
3. UX-004, UX-006 e UX-007.
4. UX-009, UX-010 e UX-013.
5. UX-011, UX-014 e UX-015.
6. UX-005, UX-016 e UX-017.
7. UX-018 a UX-020 após validar uso recorrente do MVP.

## Primeiro corte entregável

O primeiro release redesenhado pode incluir UX-001, UX-002, UX-003, UX-004, UX-006, UX-007, UX-008, UX-009 e a migração UX-012, deixando mamadeira para o corte seguinte. Esse conjunto já entrega grande ganho:

- Hoje redesenhado;
- contador visível e persistente;
- mamada com lado, troca, pausa e finalização instantânea;
- sono em um toque;
- fralda rápida;
- transição segura entre sono e mamada;
- feedback com Desfazer;
- dados atuais migrados sem perda.

Deixar Histórico completo, Insights e múltiplos cuidadores para releases seguintes reduz risco sem comprometer a arquitetura.

## Labels sugeridas no GitHub

- `area:ux`
- `area:domain`
- `area:pwa`
- `area:data`
- `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- `size:s`, `size:m`, `size:l`, `size:xl`
- `type:feature`, `type:spike`, `type:epic`

## Referências técnicas para a decisão iOS

- Apple ActivityKit: https://developer.apple.com/documentation/activitykit
- Apple Live Activities: https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
- WebKit Web Push para web apps instalados no iOS/iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
