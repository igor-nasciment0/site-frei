# Funcionalidades e Casos de Uso — Frei Online

> Conferido contra o código em **2026-10-12**. Cobre o **portal do candidato** (seções 1–9) e, em
> resumo, a **área administrativa** (seção 10). As regras de negócio do backend estão em
> `nsf-app-v3/specs/` (`features-usecases.md` e `rules/inscricao.md`); as divergências encontradas
> nesta revisão, em `nsf-app-v3/specs/divergencias.md`.

Portal onde candidatos (menores de idade, representados por um responsável cadastrante) fazem toda a jornada de inscrição no vestibular do Instituto Social Nossa Senhora de Fátima: criar conta, preencher ficha completa, escolher curso/horário, pagar a taxa de inscrição por PIX, acompanhar a convocação para a prova presencial e ver o resultado.

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
- **Inscrições desligadas** (`allowRegistration = false` na edição ativa): a API recusa o login de
  quem não é e-mail de teste, com *"As inscrições ainda não começaram. Volte no dia {data}."*. A
  tela também tenta mostrar esse aviso antes do envio, lendo `GET /parameters` — mas o endpoint
  exige token, então **o aviso só aparece para quem ainda tem uma sessão antiga salva**; o visitante
  comum só vê a mensagem depois de tentar entrar (pendência em `nsf-app-v3/specs/divergencias.md`).
- Usuário com `mustChangePassword` (senha resetada pela secretaria) vai para
  `/trocar-senha-obrigatoria` em vez da Início (seção 3.1).
- Links: "Esqueci a senha" (`/recuperar-senha`) e "Cadastre-se" (`/cadastro`).

## 3. Recuperação de senha (`/recuperar-senha` → `/trocar-senha`)

**Ator:** usuário que esqueceu a senha.

1. `/recuperar-senha`: informa e-mail → `POST /users/forgot-password`. Em sucesso, toast "Email enviado!" e navegação para `/trocar-senha`, passando o e-mail via `location.state` (não fica na URL).
2. `/trocar-senha`: exige ter chegado com `state.email` (senão redireciona para `/login`); formulário pede código de recuperação (recebido por e-mail), nova senha e confirmação.
   - Valida que nova senha e confirmação conferem.
   - `POST /users/reset-password` com `{ code, newPassword, confirmPassword, email }`.
   - Sucesso: toast e redirecionamento para `/login` após 2s. Falha: toast com mensagem de erro (da API ou fallback genérico).

### 3.1 Troca de senha obrigatória (`/trocar-senha-obrigatoria`)

**Ator:** candidato cuja senha foi resetada pelo painel admin.

- Aberta automaticamente no login e a cada carregamento do `App` enquanto `user.mustChangePassword`
  for verdadeiro — nada do portal abre antes.
- Pede a senha atual (a que a secretaria repassou), a nova e a confirmação;
  `POST /users/change-password`. Em sucesso, limpa a flag no `user` local e vai para `/`.
- Tem "Sair da conta" para quem não tem a senha em mãos.

## 4. Home / Início (`/`)

**Ator:** usuário autenticado.

- Saudação personalizada com o nome do usuário.
- **Alerta "Falta escolher seu curso"**: enquanto não há inscrição com curso escolhido (nunca se
  inscreveu, ou teve as opções canceladas por alterar nascimento/escolaridade).
- **Card "Vestibular {ano}"** (ano vindo de `statusVestibular.year`), com barra de progresso de 9
  etapas e um botão que muda conforme a situação:
  - sem curso escolhido → "Sua inscrição está em andamento" · **Continuar inscrição** (→ `/inscricao`);
  - curso escolhido, taxa não paga → "Faça o pagamento para concluir a inscrição" · **Fazer
    pagamento** (→ `/acompanhamento`);
  - taxa paga (`paymentStatus === 2`) → "Sua inscrição está concluída" · **Ver acompanhamento**.
- **Card "Datas"**: abertura (`startDate`) e fim das inscrições (`endDate`).
- **Vídeo de apresentação**: quando `statusVestibular.presentationVideoUrl` está preenchido, o
  vídeo aparece num `iframe` (URL normalizada por `corrigeURLVideo`) e é **pré-requisito da
  inscrição**: o botão "Continuar inscrição" e o link "Minha inscrição" da sidebar ficam
  bloqueados até o vídeo ser assistido **até o fim**. Ao terminar, o front grava
  `watchInstitutionVideo: true` no perfil (vale em qualquer aparelho) e troca o vídeo, naquela
  visita, por um convite "Conheça nossos cursos". Sem vídeo cadastrado, nada é bloqueado. O
  bloqueio é só de front — a API não o exige.
- **Informações gerais**: quatro atalhos que abrem uma pergunta específica do FAQ por `key` —
  Edital de Bolsa (`edital-bolsa`), Uso de Uniforme (`uso-uniforme`), Material Didático
  (`material-didatico`) e Resultado da prova (`resultado-prova`). As perguntas são cadastradas pela
  secretaria no admin; se a `key` não existir, o link apenas não abre nada.
- **Ações rápidas**: Ver convocação da prova (→ `/acompanhamento`), Conhecer os cursos (com a
  contagem de `GET /courses/count`) e Falar com a secretaria (abre `mailto:secretaria@acaonsfatima.org.br`;
  a legenda mostra o WhatsApp).
- **Dúvidas frequentes**: as 3 primeiras perguntas (`AcordeaoPerguntas max={3}`), como atalhos —
  clicar leva a `/faq?q=<key>` com a pergunta aberta; link "Ver todas".

> O antigo aviso de "agendamento pendente" e o anúncio de inscrições abertas/fechadas não existem
> mais nesta tela.

## 5. Inscrição (`/inscricao`)

**Ator:** usuário autenticado, ainda dentro do prazo de inscrição e — se houver vídeo de apresentação cadastrado — que já o assistiu até o fim (acesso direto pela URL sem ter assistido volta para a Início com um aviso).

Fluxo em duas grandes partes:

### 5.1 Wizard de dados pessoais (8 passos)

1. Informações Pessoais (nome, telefone, gênero)
2. Endereço (CEP com autopreenchimento via ViaCEP, rua, bairro, cidade, estado, número, complemento opcional)
3. Informações de Nascimento (data, cidade, estado, país)
4. Documento (CPF + dados do RG: número, data de emissão, órgão emissor + **anexo obrigatório da foto do RG**)
5. Dados da mãe (responsável primário — nome, e-mail, telefone, telefone secundário; parentesco fixo "Mãe")
6. Responsável Secundário (mesmos campos, parentesco livre)
7. Escolaridade (escola atual, série atual, tipo de escola)
8. Informações Gerais (como conheceu o instituto — Amigos, Família, Cônjuge, Filho/Filha, Ex-Aluno, Redes Sociais, Internet, Outro —, renda mensal familiar, pessoas em casa, pessoas trabalhando) e, quando a edição permite, as seções opcionais **Indicação** e **Cupom de desconto** (5.1.1)

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
- **Alterar nascimento (passo 3) ou escolaridade (passo 7) cancela as opções de curso** já
  escolhidas, porque idade e escolaridade mínima dependem delas. Com inscrição aberta e não paga,
  o front pede confirmação antes de salvar e avisa que será preciso escolher os cursos de novo;
  com inscrição validada ou paga, a alteração é recusada (pelo front e pela API) — *"Procure a
  secretaria"*.
- **Se o período de inscrição terminou** (`statusVestibular.currentPhase >= 3`, fase `Finished` —
  hoje depois de `extensionDate ?? endDate`), todos os campos do wizard ficam desabilitados
  (somente leitura). `currentPhase` é numérico: `0` não iniciado, `1` aberto, `3` encerrado. Uma
  `extensionDate` no passado é a causa clássica de "o formulário não avança" em produção.

### 5.1.1 Indicação e cupom de desconto (etapa 8) — desde 2026-10-12

As duas seções ficam no fim da etapa 8 e **só aparecem se a edição ativa permitir**
(`statusVestibular.allowReferral` e `allowCoupon`, os checkboxes "Permite indicação" e "Permite
cupom" do cadastro da edição). Com a flag desligada a seção não é exibida e o dado não é enviado;
a API confere a mesma flag. As duas são **opcionais** e não cancelam as opções de curso.

**Indicação** — quem indicou o candidato para o Frei.
- Campos: nome completo e CPF (máscara `000.000.000-00`) da pessoa que indicou.
- Preencheu um, precisa preencher o outro; o CPF precisa estar completo (11 dígitos). A API
  repete a validação.
- Vai junto com o envio final do perfil (`PUT /users/profile`, campo `referral`). Para **apagar**
  uma indicação já salva, basta limpar os dois campos e salvar — o front envia os dois vazios.
- O modelo `padroes.js` não inclui a indicação, então ela nunca trava o "Preencha todos os campos
  obrigatórios" do envio final.

**Cupom de desconto** — desconto na taxa de inscrição.
- A seção traz escrito: **o cupom vale apenas para quem nunca foi aluno do Instituto**.
- Campo de código + botão **Aplicar**. A validação é feita na hora, **no backend**
  (`POST /users/coupon`), e o resultado aparece na tela:
  - aceito → "Cupom X aplicado", o desconto e a taxa (valor original riscado + valor final);
  - recusado → o motivo, em linha: cupom não encontrado, inativo, fora da validade, limite de usos
    atingido, candidato sem CPF, *"Este cupom é válido apenas para quem nunca foi aluno do
    Instituto."* ou *"Cupons de desconto não estão disponíveis nesta edição."*
- Fica gravado na conta assim que é aplicado (independente de "Salvar e avançar") e é recarregado
  ao voltar à etapa. **Remover cupom** desfaz.
- O desconto vira valor na etapa de Pagamento do Acompanhamento (7.1). Se o candidato já tinha uma
  cobrança pendente, aplicar, trocar ou remover o cupom a cancela e a próxima sai com o valor novo.
- Depois do pagamento confirmado, o cupom não pode mais ser aplicado nem removido (erro da API,
  por toast).

### 5.2 Escolha de curso (aba "Escolha do Curso")

- Só fica acessível depois que o wizard de dados pessoais foi preenchido ao menos uma vez (checagem: `generalInfo.howDidYouKnow` não vazio).
- Traz um link "Conheça os cursos disponíveis" (abre `/cursos` em **nova aba**, para não descartar o
  estado do wizard).
- Seleciona 1ª opção de curso (obrigatória) + período/horário daquele curso (obrigatório), e a 2ª opção de curso + horário.
- **A lista da 1ª opção já vem filtrada** (`GET /enrollments/first-choice-options`): só cursos e períodos que o candidato consegue usar, pelos mesmos critérios da validação. Lista vazia mostra *"Nenhum curso está disponível para o seu perfil…"*.
- **Aviso antecipado**: a cada mudança, com debounce, o front chama `POST /enrollments/validate-choices` e mostra na página o motivo de recusa (incompatibilidade, RG não anexado, mensalidades em aberto, idade…), desabilitando "Concluir Inscrição" enquanto durar.
- **A 2ª opção depende da 1ª**, pela matriz de compatibilidade configurada no painel admin (menu Compatibilidades): a lista só traz os cursos liberados para aquela 1ª opção — já descontadas as condições de idade/escolaridade que o candidato não atende —, e a 2ª pode ser obrigatória, opcional ou não permitida. O mesmo curso em outro período aparece como "(outro período)" quando liberado.
- Se o usuário já tiver uma inscrição enviada, o formulário vem pré-preenchido com as escolhas atuais (permitindo alteração, dentro da fase permitida).
- **Regra de conflito:** 1ª e 2ª opção não podem ser o mesmo par curso+horário — ao detectar, o sistema limpa a opção conflitante e mostra mensagem de erro inline.
- Ao concluir: `POST /enrollments` com os códigos escolhidos. Sucesso → barra de progresso, toast "Sucesso!", redirecionamento para `/acompanhamento`.
- **Bloqueio por mensalidades em aberto**: candidato que já é aluno e tem **2 ou mais** mensalidades
  pendentes no ano de referência (ano da edição menos 1) recebe erro do backend — *"Você possui N
  mensalidades em aberto referentes a {ano}. Regularize os pagamentos para realizar a inscrição."*
- **Depois do pagamento confirmado o candidato não troca mais de curso** (erro da API ao concluir);
  a secretaria pode trocar pelo painel.

## 6. Cursos (`/cursos` e `/cursos/:id`)

**Ator:** qualquer pessoa — **página pública desde 2026-10-12**, não exige login.

- **Sem sessão** (visitante, ou token vencido): a lista e os detalhes abrem sem a sidebar e sem o
  cabeçalho do candidato; no topo fica só a marca do Instituto com os atalhos **Entrar** e **Criar
  cadastro**. Qualquer outra rota do portal continua levando ao login.
- **Com sessão**: tudo como antes, dentro do layout do portal.
- O botão **"Inscrever-se neste curso"** (detalhes) leva a `/inscricao` para quem está logado e a
  `/login` para quem não está; depois de entrar, o candidato segue o fluxo normal a partir da Início.
- A tela de Login ganhou o link "Conheça nossos cursos".

- **Listagem** (`/cursos`) — redesenhada em 2026-10-12, com as mesmas informações:
  - **Faixa de abertura** azul-tinta: "Turmas 2027", título "Nossos cursos", uma linha de
    orientação e o total de cursos disponíveis em destaque.
  - **Filtro por área** em chips, cada um com a **quantidade de cursos**; os tipos vêm dos próprios
    cursos, mais o filtro especial "Inglês" (pelo nome do curso — e os cursos de inglês ficam fora
    dos filtros de tipo). Se já existir um tipo de curso chamado "Inglês", o chip aparece uma vez
    só e reúne os dois critérios. Chip que ficaria vazio não aparece; clicar no chip ativo volta para
    "Todos". Ao lado, o total do resultado ("4 cursos em Técnico").
  - **Cards**, na ordem definida pela secretaria (`ordenacao`): foto em 16:10 com o **tipo** em
    etiqueta sobre a imagem, nome, **carga horária** e "Detalhes". O card inteiro é clicável e
    navegável por teclado (Tab + Enter). No hover: sobe 4px, a foto aproxima, um filete areia
    corre no topo e a seta avança. Os cards entram em sequência; `prefers-reduced-motion` desliga
    os movimentos.
  - As fotos são `<img loading="lazy">` apontando direto para `GET /courses/{id}/image`
    (anônimo): os cards aparecem assim que a lista chega e cada foto surge quando carrega — antes a
    página esperava todas as imagens. Sem foto (ou com erro), fica o padrão listrado.
  - Cursos com `type === "Técnico"` exibem o selo **"Edital de Bolsas"**, que abre
    `acaonsfatima.org.br/bolsa-educacional` em nova aba (sem acionar o clique do card).
  - Filtro sem resultado mostra um estado vazio com "Ver todos os cursos".
- **Detalhes** (`/cursos/:id`, renderizado dentro do layout de `Cursos` via outlet aninhado) —
  redesenhada em 2026-10-12, com as mesmas informações:
  - **Capa**: a foto do curso com degradê azul-tinta e, por cima, o tipo e o nome do curso (sem
    foto, bloco azul-tinta). Link "← Todos os cursos" acima.
  - **Faixa de dados-chave** logo abaixo da capa, em quatro colunas: carga horária, idade,
    escolaridade mínima e mensalidade. A **idade** vem em duas linhas — **De** (idade mínima) e
    **Até** (idade máxima) —, cada uma com o complemento do cadastro em letra menor.
  - **Visão geral** e, se houver, **Mercado de trabalho** em bloco destacado. Os dois textos
    exibem a formatação feita no painel: **negrito**, itálico, sublinhado, listas e links.
  - **Cartão de inscrição** (azul-tinta, acompanha a rolagem no desktop): os **períodos ativos**,
    um por linha, com o horário, e o botão **"Inscrever-se neste curso"**.
  - **No celular**, uma barra fixa no rodapé mantém o nome do curso, a mensalidade e o botão
    "Inscrever-se" sempre visíveis.
  - Skeletons durante o carregamento; o atraso artificial de 1s que existia foi removido. Curso
    inexistente mostra "Curso não encontrado" com link para a lista.

## 7. Acompanhamento (`/acompanhamento`)

**Ator:** usuário autenticado.

- Se o usuário **não tem inscrição** (`getInscricao` → 404): mostra mensagem "Você ainda não possui inscrição." com botão para ir para `/inscricao`.
- Se tem inscrição **com as opções de curso canceladas** (alterou nascimento ou escolaridade): mostra "Escolha seus cursos novamente." com botão para `/inscricao`.
- Se tem inscrição: mostra o protocolo, o resumo (1ª opção e, se houver, 2ª opção de curso/horário, com link "Ver o curso") e a **linha do tempo** do processo seletivo com 5 etapas. Enquanto a taxa não está paga, um aviso pulsante pede o pagamento.

### 7.1 Linha do tempo

1. **Cadastro criado** — sempre concluída.
2. **Inscrição preenchida** — sempre concluída (é pré-requisito para chegar aqui).
3. **Pagamento** — cobrança PIX da taxa de inscrição, gerada ao abrir a tela
   (`POST /enrollments/my-enrollment/payment`): QR code + código copia-e-cola com botão "Copiar".
   Enquanto pendente, consulta `GET /enrollments/my-enrollment/payment/status` ao abrir e a cada 5s (e na hora,
   pelo botão "Já paguei — verificar pagamento"); a API consulta o provedor, que não tem webhook. A
   etapa vira sem recarregar a página. Cobrança vencida ou cancelada é reemitida automaticamente.
   **Com cupom de desconto** (5.1.1) a cobrança já sai com o valor reduzido e a tela mostra
   "Cupom X aplicado: ~~valor original~~ valor com desconto"; se o cupom deixou de valer na
   emissão, a cobrança sai pelo valor cheio com um aviso do motivo. **Cupom que zera a taxa**
   (100% ou valor fixo ≥ taxa): não há QR code — a etapa é concluída na hora ("Taxa de inscrição
   quitada pelo cupom X — não é preciso pagar") e o e-mail de confirmação é enviado.
   Concluída quando `paymentStatus === 2`. **As etapas 4 e 5 ficam bloqueadas até o pagamento ser
   confirmado.**
4. **Prova presencial** — ramifica por `isInternalStudent` (aluno da casa na continuidade do
   próprio curso de inglês **e** sem 2ª opção fora do inglês — com um técnico como 2ª opção ele
   faz a prova normalmente):
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

- **Header**: breadcrumb "Portal do candidato / {página}", nome do usuário e, se houver, o protocolo da inscrição; avatar com as iniciais.
- **Sidebar**: navegação entre Início, Minha inscrição (com selo de progresso `n/9`; bloqueada enquanto o vídeo de apresentação não foi assistido), Acompanhamento, Cursos e Dúvidas frequentes — visível em toda a área autenticada; em telas estreitas vira faixa superior com botão hambúrguer. O rodapé traz o horário de atendimento e o **WhatsApp (11) 96398-6252** (`wa.me/5511963986252`).

> **Contato em uso hoje:** WhatsApp **(11) 96398-6252** em todos os pontos — rodapé da sidebar,
> card "Falar com a secretaria" da Início, faixa "Não encontrou sua dúvida?" do FAQ e rodapé da
> tela de login. Os números antigos (11) 3798-5037 e (11) 4362-1000 não aparecem mais no código
> (o segundo só no protótipo de design em `specs/prototypes/`).
- **Logout**: disponível no menu do usuário no cabeçalho; limpa sessão local e redireciona para `/login`.
- **Guarda de sessão**: qualquer acesso às rotas dentro do layout `App` sem sessão válida (token ausente/expirado) redireciona para `/login`.
- **Bloqueio por fase do processo**: o formulário de dados pessoais fica travado (somente leitura) quando o período de inscrição termina (`currentPhase >= 3`) — a leitura/acompanhamento continua disponível normalmente.

## 10. Área administrativa (`/admin`)

Sessão própria (`adminToken`/`admin`), login por usuário e senha, token de 8 horas. Três perfis —
detalhes de cada regra em `nsf-app-v3/specs/features-usecases.md` (seções 13 a 19):

| Perfil | Menu | O que faz |
|---|---|---|
| **Admin** | tudo | tudo |
| **Secretaria** | Inscrições, Contas, Relatórios › Indicações e Cupons | tudo de Inscrições e Contas, exceto trocar curso e inserir pagamento manual; consulta e exporta os dois relatórios |
| **Financeiro** | Inscrições, Relatórios › Financeiro | consulta inscrições, insere pagamento manual, gera o relatório financeiro |

| Tela | Função |
|---|---|
| **Painel** (`/admin`) | Totais da edição ativa: inscritos, pagos, por status, por dia e por curso/período (com alternância Todos/Pagos). |
| **Inscrições** | Lista paginada com busca (protocolo, nome, CPF, e-mail) e filtro de status, incluindo "Pendente pagamento". Por linha: situação do pagamento, "Verificar pagamento" e prévia do anexo do RG. "Gerar Relatório" exporta o resultado filtrado para Excel, com telefones. |
| **Detalhe da inscrição** | Dados da inscrição e do candidato (inclusive **indicação** e **cupom aplicado**, visíveis mesmo com as flags da edição desligadas); bloco Pagamento com **cupom, taxa original e desconto** quando houver; editar opções de curso (só Admin — funciona mesmo com inscrição paga); pagamento: remover cobrança, registrar pagamento manual (forma, valor, data), reenviar e-mail de confirmação; resetar senha do candidato; remover a inscrição (irreversível). |
| **Contas** | Lista de contas (inscritas ou não). O modal mostra os dados cadastrais (com indicação e cupom), as inscrições e os históricos, e permite trocar e-mail, trocar CPF (sem validação de formato) e resetar a senha. |
| **Cursos** | Descrição, mercado de trabalho e "reunião de pais e início das aulas" são editados num **editor de texto formatado** (sem HTML à mão); "período de matrícula" continua texto simples, porque entra no meio de uma frase do e-mail. CRUD com períodos, disciplinas, faixa de nascimento (obrigatória), ordem de exibição, textos do e-mail de confirmação (matrícula, início das aulas, parcelas) e upload da capa. |
| **Compatibilidades** | Matriz 1ª × 2ª opção: obrigatoriedade da 2ª opção por linha, células por perfil (interno/externo) e condições por período. |
| **Dúvidas frequentes** | CRUD de perguntas, com `key` para link direto. A resposta é escrita no **editor de texto formatado**. |
| **Vestibular** | Edições: ano, taxa, datas (inscrição, prorrogação, prova, resultado, resultado do externo, e-mail de sala), vídeo, interruptor "Permitir novas inscrições", **"Permite indicação"** e **"Permite cupom"** (ligam as seções da etapa 8; desligados por padrão) e **e-mails de teste**; ativar edição. |
| **Cupons** (`/admin/cupons`) | CRUD de cupons de desconto da taxa de inscrição: código (único, gravado em maiúsculas), descrição, tipo (percentual ou valor fixo), valor, validade inicial/final e limite de usos opcionais, ativo, contador de usos. "Desativar" é soft-delete. Só Admin. |
| **Importações** | Upload dos CSVs de **alunos matriculados** e **alunos inadimplentes** (substituem só os anos do arquivo) e de **ex-alunos** (com `id_curso` e `nr_ano` do curso cursado; um registro por CPF — CPF repetido no arquivo vale a última linha; atualiza/insere pelo CPF, não remove ninguém) e, abaixo, os registros importados em três abas — Matrículas, Inadimplentes e Ex-Alunos (nome completo, CPF, e-mail, responsável, endereço, bairro; busca por nome e CPF) — com criação, edição e remoção. |
| **Relatórios › Financeiro** | Inscrições pagas da edição ativa por período de pagamento, com filtro por nome e exportação para Excel. Traz a coluna **Cupom** (código e desconto); inscrição quitada por cupom de 100% aparece com valor R$ 0,00 e tipo "Cupom". |
| **Relatórios › Indicações** (Admin e Secretaria) | Uma linha por candidato que informou quem o indicou. Tabela em dois grupos — **Indicado** e **Quem indicou** —, cada um com nome e CPF, nº de inscrição (link para o detalhe), datas de inscrição e de pagamento e situação (status da inscrição + pagamento). Quem indicou é localizado pelo CPF informado: se não tem conta aparece "Sem cadastro no portal"; se tem conta mas não se inscreveu, "Sem inscrição"; se o nome no cadastro difere do digitado, os dois são mostrados. Resumo no topo (indicações, indicados pagos, pessoas que indicaram, quantas delas inscritas), busca por nome/CPF/inscrição de qualquer um dos dois e exportação para Excel. |
| **Relatórios › Cupons** (Admin e Secretaria) | Inscrições da edição ativa que usaram cupom: nº de inscrição, candidato, cupom, **valor cheio**, desconto, valor com desconto, **valor pago** e forma, datas de inscrição e de pagamento e situação. Resumo no topo (inscrições com cupom, pagas, valor cheio das pagas, desconto concedido, total pago), filtros por nome/CPF/inscrição e por código do cupom, exportação para Excel. Só entra a inscrição cujo desconto já foi para uma cobrança ou pagamento. |
| **Administradores** | Lista, criação com perfil e reset de senha de administradores. |

Quem tem a senha resetada (candidato ou admin) é obrigado a trocá-la no próximo acesso.

## Pontos em aberto observados no código

- **Aviso de inscrições fechadas no Login não aparece para o visitante**: `GET /parameters` exige
  token (seção 2).
- **"Vestibular 2027" fixo** no cabeçalho de `/inscricao` (`inscricao/index.jsx`) — a Início já usa
  `statusVestibular.year`.
- O link "FAQ" do rodapé do Login aponta para `/faq`, rota autenticada — sem sessão, volta para o Login.
- Recuperação de senha depende de o usuário digitar o código recebido por e-mail — não há reenvio
  de código nem contagem regressiva na tela `/trocar-senha`.
- ~~A regra "2ª opção obrigatória, exceto para cursos Teens" comentada em `formCursos.jsx`~~ — a
  obrigatoriedade passou para a matriz de compatibilidade do admin (2026-09-26).
- Código sem uso que continua no repositório: `api/services/agendamento.js`,
  `util/useMediaQuery.js`, `components/acordeao_perguntas/perguntas.js` (mock de FAQ) e as
  dependências `react-day-picker`, `@radix-ui/react-select` e Tailwind.
- O comentário de `util/progresso.js` ainda diz que os 8 passos são enviados de uma vez só; desde
  o salvamento passo a passo isso não é mais verdade (o cálculo, baseado em `howDidYouKnow`,
  continua valendo porque esse campo só é gravado no último passo).
