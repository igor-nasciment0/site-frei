# Funcionalidades e Casos de Uso — Frei Online

> **Nota:** este documento cobre o **portal do candidato**. O projeto também tem uma área
> administrativa em `/admin` (login próprio, dashboard, CRUD de cursos/FAQ/edições do vestibular,
> consulta de inscrições e **importações de CSV**) que ainda não está documentada em detalhe aqui.

Portal onde candidatos (menores de idade, representados por um responsável cadastrante) fazem toda a jornada de inscrição no vestibular do Instituto Social Nossa Senhora de Fátima: criar conta, preencher ficha completa, escolher curso/horário, agendar e acompanhar a prova presencial, e ver o resultado.

## 1. Cadastro de conta (`/cadastro`)

**Ator:** candidato/responsável sem conta.

- Formulário: nome completo do candidato, CPF (mascarado), data de nascimento, e-mail, senha, confirmação de senha.
- Validações client-side: todos os campos obrigatórios; senha e confirmação precisam ser iguais (toast de erro caso contrário).
- Ao submeter: `POST /users` (cadastro) e, em sucesso, login automático (`POST /users/login`) com as mesmas credenciais — o usuário não precisa logar manualmente depois de se cadastrar.
- Sucesso: token/usuário salvos em `local-storage`, barra de progresso no topo, redirecionamento para `/` após ~1s.
- Link para quem já tem conta ir para `/login`.

## 2. Login (`/login`)

**Ator:** usuário já cadastrado.

- Formulário: e-mail, senha. Envio como `FormData` (`Email`, `Password`).
- Sucesso (`POST /users/login` retorna `token`): salva sessão, barra de progresso, redireciona para `/`.
- Erro (credenciais inválidas etc.): toast de erro (mensagem vinda da API).
- Links: "Esqueci a senha" (`/recuperar-senha`) e "Cadastre-se" (`/cadastro`).

## 3. Recuperação de senha (`/recuperar-senha` → `/trocar-senha`)

**Ator:** usuário que esqueceu a senha.

1. `/recuperar-senha`: informa e-mail → `POST /users/forgot-password`. Em sucesso, toast "Email enviado!" e navegação para `/trocar-senha`, passando o e-mail via `location.state` (não fica na URL).
2. `/trocar-senha`: exige ter chegado com `state.email` (senão redireciona para `/login`); formulário pede código de recuperação (recebido por e-mail), nova senha e confirmação.
   - Valida que nova senha e confirmação conferem.
   - `POST /users/reset-password` com `{ code, newPassword, confirmPassword, email }`.
   - Sucesso: toast e redirecionamento para `/login` após 2s. Falha: toast com mensagem de erro (da API ou fallback genérico).

## 4. Home / Início (`/`)

**Ator:** usuário autenticado.

- Saudação personalizada com o nome do usuário.
- **Aviso de agendamento pendente**: se o usuário já concluiu a inscrição (`getInscricao` retorna `firstChoice`) mas ainda não tem agendamento (`getAgendamento` retorna vazio), mostra um banner de aviso com link direto para `/acompanhamento`.
- **Anúncio do status do vestibular**, dependendo de `statusVestibular.isRegistrationOpen`:
  - Fechado: "As inscrições irão começar em {startDate}".
  - Aberto: "As inscrições estarão abertas até {endDate}".
  - O botão de ação muda conforme o usuário já esteja inscrito ou não: "Realizar inscrição" (→ `/inscricao`) ou "Acompanhar minha inscrição" (→ `/acompanhamento`).
- **Card de vídeo**: quando `statusVestibular.presentationVideoUrl` está preenchido, exibe o vídeo de
  apresentação num `iframe` 16:9 (a URL passa por `corrigeURLVideo`, que normaliza links do YouTube
  para o formato `embed`).
- **Informações gerais**: quatro atalhos que abrem uma pergunta específica do FAQ por `key` —
  Edital de Bolsa (`edital-bolsa`), Uso de Uniforme (`uso-uniforme`), Material Didático
  (`material-didatico`) e Resultado da prova (`resultado-prova`). As perguntas são cadastradas pela
  secretaria no admin; se a `key` não existir, o link apenas não abre nada.
- **Ações rápidas**: atalhos para Inscrição, Cursos e Contato (abre cliente de e-mail com `mailto:secretaria@acaonsfatima.org.br`).
- **FAQ resumido**: até 5 perguntas mais frequentes (via `AcordeaoPerguntas max={5}`), com link "Ver todas" para `/faq`.

## 5. Inscrição (`/inscricao`)

**Ator:** usuário autenticado, ainda dentro do prazo de inscrição.

Fluxo em duas grandes partes:

### 5.1 Wizard de dados pessoais (8 passos)

1. Informações Pessoais (nome, telefone, gênero)
2. Endereço (CEP com autopreenchimento via ViaCEP, rua, bairro, cidade, estado, número, complemento opcional)
3. Informações de Nascimento (data, cidade, estado, país)
4. Documento (CPF + dados do RG: número, data de emissão, órgão emissor + **anexo obrigatório da foto do RG**)
5. Dados da mãe (responsável primário — nome, e-mail, telefone, telefone secundário; parentesco fixo "Mãe")
6. Responsável Secundário (mesmos campos, parentesco livre)
7. Escolaridade (escola atual, série atual, tipo de escola)
8. Informações Gerais (como conheceu o instituto — Amigos, Família, Cônjuge, Filho/Filha, Ex-Aluno, Redes Sociais, Internet, Outro —, renda mensal familiar, pessoas em casa, pessoas trabalhando)

Regras:
- **Anexo do RG (passo 4)**: o arquivo sobe em requisição própria (`POST /users/rg-document`) assim que
  é escolhido — não cabe no `PUT /users/profile`, que é JSON. O passo só avança com o anexo enviado.
  Limite de 4MB, formatos JPG/PNG/HEIC/PDF, com aviso de "foto legível". Um anexo já enviado é
  recarregado como prévia para o candidato conferir. O backend também exige o anexo na inscrição, de
  modo que a regra vale mesmo se a checagem do front for contornada.
- Formulário é **pré-preenchido** com os dados que o usuário já tem salvos no perfil (`getInfoUsuario`, obtido via `App` e guardado em `local-storage`), convertendo formatos onde necessário (datas para `yyyy-MM-dd`, números para string nos selects).
- Navegação "Avançar" só troca de passo se os campos daquele passo passarem na validação do `react-hook-form` (`trigger`); "Retornar" sempre disponível a partir do 2º passo.
- É possível pular diretamente para qualquer passo já visitado clicando na lista lateral de passos (desktop) ou nos indicadores numerados (mobile).
- **Cada passo é salvo ao avançar**: nos passos 1–7, "Salvar e avançar" grava só o bloco daquele
  passo com `PUT /users/profile` (o endpoint é parcial), então o candidato não perde o que já
  preencheu se sair no meio. Se a gravação falha, o passo não avança.
- No último passo, "Avançar" envia o formulário inteiro: valida preenchimento completo do objeto contra o modelo `padroes.js` (permitindo `complement` do endereço vazio), formata a renda mensal para número puro e chama `PUT /users/profile`. Em sucesso, atualiza o usuário salvo localmente e libera a aba "Escolha do Curso".
- **Se o processo já avançou de fase** (`statusVestibular.currentPhase >= 3`), todos os campos do formulário ficam desabilitados (somente leitura) — o candidato não pode mais editar dados pessoais.

### 5.2 Escolha de curso (aba "Escolha do Curso")

- Só fica acessível depois que o wizard de dados pessoais foi preenchido ao menos uma vez (checagem: `generalInfo.howDidYouKnow` não vazio).
- Traz um link "Conheça os cursos disponíveis" (abre `/cursos` em **nova aba**, para não descartar o
  estado do wizard).
- Seleciona 1ª opção de curso (obrigatória) + período/horário daquele curso (obrigatório), e opcionalmente uma 2ª opção de curso + horário.
- Se o usuário já tiver uma inscrição enviada, o formulário vem pré-preenchido com as escolhas atuais (permitindo alteração, dentro da fase permitida).
- **Regra de conflito:** 1ª e 2ª opção não podem ser o mesmo par curso+horário — ao detectar, o sistema limpa a opção conflitante e mostra mensagem de erro inline.
- Ao concluir: `POST /enrollments` com os códigos escolhidos. Sucesso → barra de progresso, toast "Sucesso!", redirecionamento para `/acompanhamento`.
- **Bloqueio por mensalidades em aberto**: candidato que já é aluno e tem 3 ou mais mensalidades em
  aberto recebe erro do backend — *"Você possui N mensalidades em aberto. Regularize os pagamentos;
  após a quitação, aguarde 2 dias para realizar a inscrição."*

## 6. Cursos (`/cursos` e `/cursos/:id`)

**Ator:** usuário autenticado (navegando livremente, mesmo sem estar no processo de inscrição).

- **Listagem** (`/cursos`): grid de cards com imagem (carregada sob demanda como blob autenticado), nome, tipo e carga horária.
  - Filtro por tipo de curso (chips clicáveis, toggle — clicar de novo no filtro ativo o remove), com um filtro adicional especial "Inglês" que busca por nome contendo "inglês" em vez de por `type`.
  - Cursos com `type === "Técnico"` exibem um selo **"Edital de Bolsas"** que abre
    `acaonsfatima.org.br/bolsa-educacional` em nova aba (com `stopPropagation`, já que o card inteiro
    é clicável).
- **Detalhes** (`/cursos/:id`, renderizado dentro do layout de `Cursos` via outlet aninhado): nome, imagem grande, descrição (HTML), tabela de informações (carga horária, faixa etária mínima/máxima, escolaridade mínima, mensalidade, períodos disponíveis ativos) e, se houver, seção "Mercado de Trabalho". Link "Voltar" para a listagem. Usa skeletons durante o carregamento (inclusive um delay artificial de 1s para suavizar a transição).

## 7. Acompanhamento (`/acompanhamento`)

**Ator:** usuário autenticado.

- Se o usuário **não tem inscrição** (`getInscricao` → 404): mostra mensagem "Você ainda não possui inscrição." com botão para ir para `/inscricao`.
- Se tem inscrição: mostra resumo (1ª opção e, se houver, 2ª opção de curso/horário) e a **linha do tempo** do processo seletivo com 5 etapas.

### 7.1 Linha do tempo

1. **Cadastro criado** — sempre concluída.
2. **Inscrição preenchida** — sempre concluída (é pré-requisito para chegar aqui).
3. **Pagamento** — cobrança PIX da taxa de inscrição, gerada ao abrir a tela
   (`POST /enrollments/my-enrollment/payment`): QR code + código copia-e-cola com botão "Copiar".
   Enquanto pendente, consulta `GET /enrollments/my-enrollment/payment/status` ao abrir e a cada 10s (e na hora,
   pelo botão "Já paguei — verificar pagamento"); a API consulta o provedor, que não tem webhook. A
   etapa vira sem recarregar a página. Cobrança vencida ou cancelada é reemitida automaticamente.
   Concluída quando `paymentStatus === 2`. **As etapas 4 e 5 ficam bloqueadas até o pagamento ser
   confirmado.**
4. **Prova presencial** — ramifica por `isInternalStudent`:
   - **aluno interno**: *"a prova será o nivelamento do próprio curso, portanto não é necessário
     realizar a prova no dia do vestibular"*, sem endereço nem data.
   - **externo**: endereço do instituto, data da prova e o aviso de que **horário e sala são enviados
     por e-mail** em `roomNoticeEmailDate`.
5. **Resultado e matrícula** — usa `dadosInscricao.resultPublicationDate` (data **do candidato**), com
   fallback para a data global de `GET /parameters`. Mostra o link quando já divulgado, ou a data
   prevista; pode antecipar o link se o backend sinalizar `canShowResultUrl`.

### 7.2 Coluna lateral

Só aparece para candidato **externo** e **depois do pagamento confirmado** — para o aluno interno não
há prova a informar, e antes do pagamento a prova ainda não é a etapa atual.

- **"Informações sobre a prova"** (card azul): Data, Horário, Local e Sala. Horário e sala não são
  definidos por aqui — enquanto a secretaria não os preenche, exibem *"Por e-mail em {data}"*.
- **"Documentos obrigatórios"**: RG ou Documento Oficial com Foto · Lápis, Borracha, 2 Canetas ·
  Água · Chegar 30min com antecedência.

> **Nota:** o agendamento de horário pelo candidato (`POST /appointments`, modal de calendário) não faz
> mais parte deste fluxo — a convocação é definida pela secretaria. Os endpoints de agendamento
> continuam existindo na API.

## 8. FAQ (`/faq`)

**Ator:** usuário autenticado (também acessível resumidamente na Home).

- Lista completa de perguntas frequentes cadastradas (`GET /faqs`), ativas, ordenadas, em acordeão — mesma implementação usada na Home, sem limite de itens.

## 9. Sessão e navegação global

- **Header** (todas as páginas do layout `App`): nome do usuário, indicador "Online", menu com opção de logout. Em mobile, botão de menu abre a sidebar como drawer.
- **Sidebar**: navegação entre Início, Inscrição, Acompanhamento, Cursos, FAQ — visível em toda a área autenticada, colapsa para drawer em telas ≤768px. O rodapé traz o horário de atendimento e o **WhatsApp (11) 96398-6252** (`wa.me/5511963986252`).

> **Telefones em uso hoje:** WhatsApp **(11) 96398-6252** no rodapé da sidebar; **(11) 3798-5037** no
> card "Falar com a secretaria" da Início. A faixa de contato do FAQ ("Não encontrou sua dúvida?")
> usa o WhatsApp **(11) 96398-6252**, no texto e no botão "Falar no WhatsApp". O rodapé da tela de
> login ainda exibe **(11) 4362-1000**.
- **Logout**: disponível no menu do usuário no cabeçalho; limpa sessão local e redireciona para `/login`.
- **Guarda de sessão**: qualquer acesso às rotas dentro do layout `App` sem sessão válida (token ausente/expirado) redireciona para `/login`.
- **Bloqueio por fase do processo**: o formulário de inscrição fica travado (somente leitura) quando a fase atual do vestibular avança além da fase de preenchimento de dados (`currentPhase >= 3`), impedindo edição de dados após a fase ter avançado — mas a leitura/acompanhamento continua disponível normalmente.

## Casos de uso ainda não implementados / pontos em aberto observados no código

- Recuperação de senha depende inteiramente do backend enviar e o usuário digitar corretamente um "código" — não há reenvio de código nem contagem regressiva na tela `/trocar-senha`.
- A regra "2ª opção obrigatória, exceto para cursos Teens" existe comentada em `formCursos.jsx`, sugerindo que foi desativada intencionalmente (2ª opção é sempre opcional atualmente).
- O componente `Select` tem uma implementação alternativa mais rica (Radix UI) comentada, indicando um redesign visual de select pendente.
- `perguntas.js` (mock de FAQ) está presente mas não é mais usado — a fonte de verdade é a API.
