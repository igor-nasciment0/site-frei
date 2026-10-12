# Arquitetura do Projeto — Frei Online

Portal de inscrição do vestibular do **Instituto Social Nossa Senhora de Fátima**. SPA em React que permite a um candidato (ou responsável) se cadastrar, preencher a ficha de inscrição, escolher curso/horário, pagar a taxa de inscrição por PIX e acompanhar o andamento do processo — convocação para a prova e divulgação do resultado. O mesmo SPA abriga o painel administrativo (`/admin`).

> Conferido contra o código em **2026-10-12**. As divergências encontradas entre specs e código,
> e como cada uma foi resolvida, estão em `nsf-app-v3/specs/divergencias.md`.

## Stack

- **Build/dev server:** Vite 7 (`@vitejs/plugin-react-swc`), porta configurada via `VITE_PORT` (env).
- **UI:** React 19 + React Router 7 (`react-router`, modo `BrowserRouter`).
- **Estilos:** Sass (`sass-embedded`), um arquivo `index.scss` por componente/página. Tailwind 4 (`@tailwindcss/vite`) está nas dependências, mas não é carregado no `vite.config.js` nem usado — toda a estilização é SCSS manual.
- **Formulários:** `react-hook-form` (`useForm`, `FormProvider`/`useFormContext`, `Controller`) + `react-imask`/`imask` para máscaras de input (telefone, CPF, CEP, valores monetários).
- **HTTP:** `axios`, encapsulado em `src/api`.
- **Estado de sessão:** `local-storage` (pacote npm, wrapper de `window.localStorage`) — chaves `token` e `user`.
- **UX utilitário:** `react-hot-toast` (toasts), `react-top-loading-bar` (barra de progresso no topo em ações assíncronas), `react-loading-skeleton` (skeletons de carregamento), `date-fns` (formatação de datas), `write-excel-file` (relatórios Excel do painel, carregado sob demanda). `react-day-picker` segue no `package.json`, sem uso desde que o agendamento saiu do fluxo.
- **Seleção:** wrapper próprio `Select`/`SelectItem`, sobre `<select>`/`<option>` nativos. `@radix-ui/react-select` continua no `package.json`, mas a implementação alternativa comentada foi removida do componente.
- **Lint:** ESLint 9 (flat config) com `eslint-plugin-react-hooks` e `eslint-plugin-react-refresh`.
- **Deploy:** Docker (`node:22.0.0-alpine` → `npm run build` → serve estático da pasta `dist` com `serve -s dist -l 3000`, porta 3000). `docker-compose.yml` sobe o serviço `nsf-vest-site` numa rede externa `vestibular-net`.

## Ponto de entrada e roteamento

`src/main.jsx` monta a árvore raiz nesta ordem de providers:

```
LoadingBarContainer (react-top-loading-bar)
  └─ ModalProvider (contexto de modal global)
       └─ BrowserRouter
            └─ StrictMode
                 └─ Routes
```

`src/init.js` é importado antes de tudo em `main.jsx` só para garantir `window.global ||= window` (polyfill exigido por alguma dependência que assume ambiente Node/`global`).

### Árvore de rotas (`src/main.jsx`)

```
/                      → App (layout autenticado, shell com sidebar + header)
  ""  (index)          → Inicio
  inscricao             → Inscricao
  acompanhamento         → Acompanhamento
  cursos                 → Cursos  (pública: abre sem sessão, em layout de visitante)
    :id                    → DetalhesCurso (renderizado via <Outlet> dentro de Cursos)
  faq                     → FAQ
/cadastro               → Cadastro (página standalone, sem layout App)
/login                  → Login (página standalone)
/recuperar-senha        → RecuperarSenha (página standalone)
/trocar-senha           → TrocarSenha (página standalone; exige navegação com state.email)
/trocar-senha-obrigatoria → TrocarSenhaObrigatoria (standalone; exige token — senha resetada pelo admin)

/admin                  → AdminApp (layout administrativo, sessão própria)
  ""  (index)           → AdminDashboard
  inscricoes            → AdminInscricoes
  inscricoes/:id        → AdminInscricaoDetalhes
  contas                → AdminContas  (lista de contas; dados e edições em modal)
  cursos                → AdminCursos  (novo | :id → AdminCursoForm)
  compatibilidades      → AdminCompatibilidades  (matriz 1ª × 2ª opção de curso)
  faq                   → AdminFAQs    (novo | :id → AdminFAQForm)
  vestibular            → AdminVestibular (novo | :id → AdminVestibularForm)
  cupons                → AdminCupons  (novo | :id → AdminCupomForm)  — cupons de desconto, só Admin
  importacoes           → AdminImportacoes  (upload dos CSVs + registros importados)
  relatorios/financeiro → AdminRelatorioFinanceiro   (Admin, Financeiro)
  relatorios/indicacoes → AdminRelatorioIndicacoes   (Admin, Secretaria)
  relatorios/cupons     → AdminRelatorioCupons       (Admin, Secretaria)
  administradores       → AdminUsuarios
/admin/trocar-senha     → AdminTrocarSenha (standalone; senha resetada por outro admin)
/admin/login            → AdminLogin (página standalone)
/admin/bootstrap        → AdminBootstrap (criação do primeiro admin)
```

`App` (`src/pages/app/index.jsx`) é o layout raiz de tudo que exige sessão ativa: busca `getInfoUsuario()`; se falhar, redireciona para `/login`; se o usuário veio com `mustChangePassword`, redireciona para `/trocar-senha-obrigatoria`. Ao obter o usuário, salva em `local-storage` (`user`) e busca `getStatusVestibular()` (parâmetros do processo seletivo: ano, datas de inscrição, data de divulgação de resultado, fase atual). Enquanto isso não resolve, mostra `<Carregamento />` em tela cheia. O status do vestibular é repassado às subrotas via `useOutletContext()`; a inscrição do usuário (`useMinhaInscricao`) vai por prop para `BarraLateral` e `Cabecalho`.

`AdminApp` (`src/pages/admin/index.jsx`) lê `adminToken`/`admin` do `local-storage` (sem chamada à API) e aplica, nesta ordem: sem sessão → `/admin/login`; `admin.mustChangePassword` → `/admin/trocar-senha`; perfil **Financeiro** fora de `/admin/relatorios/financeiro` e `/admin/inscricoes` → relatório financeiro; perfil **Secretaria** fora de `/admin/inscricoes`, `/admin/contas`, `/admin/relatorios/indicacoes` e `/admin/relatorios/cupons` → inscrições. É só navegação — quem protege é a API (`nsf-app-v3/specs/features-usecases.md` seção 16).

## Camada de API (`src/api`)

- **`base.js`** — factory `api()` que cria uma instância axios com `baseURL = import.meta.env.VITE_API_URL` e header `Authorization: Bearer <token>`, lendo o token salvo no `local-storage` a cada chamada (token pode ser vazio/indefinido em rotas públicas como cadastro/login).
- **`callAPI.js`** — wrapper único (`callApi(callback, toastIt = false, ...params)`) por onde **toda** chamada de API do app passa:
  - executa `callback(...params)`;
  - em sucesso, retorna a resposta (ou `{ success: true }` se o callback não retornar nada);
  - em erro, se `toastIt` for `false` ou o status for `401` (sessão expirada — tratado silenciosamente, sem toast, deixando os fluxos de redirecionamento de auth agirem), não mostra nada;
  - caso contrário, extrai a mensagem de erro de `error.response.data.Message[0]` (array, formato de validação da API) ou `error.response.data.message` (string) e mostra via `react-hot-toast`; fallback é `error.message`.
- **`services/`** — um arquivo por domínio, todos funções `async` finas que só chamam `api()` e retornam `r.data` (padrão consistente):
  - `user.js` — `cadastro`, `login`, `atualizaUsuario` (PUT profile, parcial — usado pelo formulário de inscrição a cada passo e para marcar o vídeo institucional como assistido), `recuperacaoSenha`, `trocaSenha`, `trocaSenhaLogado` (`POST /users/change-password`, da troca obrigatória), `getInfoUsuario`, `enviaDocumentoRG`/`getDocumentoRG` (anexo do RG, em `multipart` — não cabe no JSON do perfil), `aplicaCupom` (`POST /users/coupon` — a API valida; cupom recusado volta `200` com `{ valid: false, message }`, não é erro HTTP), `getCupomAplicado` (`GET /users/coupon` — revalida o cupom gravado; o `204` "sem cupom" vira `{ valid: false, code: null }`) e `removeCupom` (`DELETE /users/coupon`).
  - `vestibular.js` — `getStatusVestibular` → `GET /parameters` (ano da edição, datas de abertura/fechamento de inscrição, fase atual, `allowRegistration`, `allowReferral`/`allowCoupon` — as flags que ligam as seções Indicação e Cupom de desconto da etapa 8 —, vídeo de apresentação, data/URL de resultado). **Exige token**: a chamada feita pela tela de Login, sem sessão, volta `401` e é engolida pelo `callApi`.
  - `cursos.js` — `getCursos` e `getCursoId` (**anônimos** desde 2026-10-12 — catálogo público), `getTotalCursos` (`GET /courses/count`, **anônimo** — usado pelo painel das telas públicas e pela Início), `getCursoImagem` (blob), `getCursoHorarios` (períodos/turnos de um curso).
  - `inscricao.js` — `criaInscricao` (POST enrollment com 1ª/2ª opção de curso+horário), `getInscricao` (GET, aceita 404 como resposta válida via `validateStatus` — usado para saber se o usuário ainda não se inscreveu), `getOpcoesPrimeiraOpcao` (`GET /enrollments/first-choice-options` — cursos e períodos que o candidato pode usar como 1ª opção), `getOpcoesSegundaOpcao` (`GET /enrollments/second-choice-options` — obrigatoriedade da 2ª opção e cursos permitidos nela para a 1ª escolhida, segundo a matriz do admin, já filtrados pela idade/escolaridade do candidato), `validaEscolhasCurso` (`POST /enrollments/validate-choices` — roda a mesma validação do backend sem persistir, usada com debounce em `FormularioCursos` pra avisar incompatibilidade de curso antes do submit), `geraCobrancaInscricao` (`POST /enrollments/my-enrollment/payment` — gera ou devolve a cobrança PIX vigente) e `getStatusPagamentoInscricao` (`GET /enrollments/my-enrollment/payment/status` — a API consulta o provedor e devolve a situação atualizada).
  - `agendamento.js` — `getDatasAgendamento`, `getAgendamento`, `criaAgendamento`. **Sem uso**: nenhuma tela importa este serviço desde que a convocação passou a ser definida pela secretaria; os endpoints continuam na API.
  - `faq.js` — `getFAQ` (cada pergunta traz `key`, o slug estável usado nos links diretos `/faq?q=<key>`).
  - `services/admin/` — serviços da área administrativa, sobre `adminBase.js` (token em `adminToken`, separado do candidato): `auth` (login, bootstrap, listar/criar administradores, resetar senha de outro admin, trocar a própria), `cursos` (CRUD + upload da capa), `compatibilidades` (matriz de compatibilidade), `faq`, `inscricoes` (dashboard, lista, relatório, detalhe, opções e troca de curso, reset de senha, verificar/resetar/inserir pagamento, reenviar e-mail de confirmação, remover inscrição, anexo do RG), `contas` (lista, detalhe, reset de senha, troca de e-mail e de CPF), `vestibular`, `cupons` (CRUD de cupons de desconto — `listarCupons`, `getCupom`, `criarCupom`, `atualizarCupom`, `desativarCupom`), `importacoes` (upload de CSV em `multipart` — matriculados, inadimplentes e ex-alunos — e status), `registrosImportados` (CRUD de matriculados, inadimplentes e ex-alunos) e `relatorios` (financeiro, indicações e cupons).
  - `enderecos.js` — não usa `api()`/backend próprio: chama diretamente a API pública ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) para autocompletar endereço a partir do CEP.

Convenção: nenhuma tela chama `axios`/`api()` diretamente — sempre `callApi(service, toastIt, ...args)`, o que centraliza tratamento de erro/toast.

## Autenticação e sessão

- Sessão é 100% client-side: token JWT e objeto `user` guardados em `local-storage` (chaves `"token"`, `"user"`), sem cookies nem refresh. O painel admin usa chaves próprias (`"adminToken"`, `"admin"`), então as duas sessões convivem no mesmo navegador. O token do candidato vale 4 meses; o do painel, 8 horas.
- Não há um `PrivateRoute`/guard central de rota — a proteção acontece de forma descentralizada:
  - `App` tenta `getInfoUsuario()`; se a API rejeitar (token ausente/expirado → 401), navega para `/login` — **exceto nas rotas públicas** (`ehRotaPublica`: `/cursos` e `/cursos/:id`), em que entra no modo visitante: renderiza o outlet com `CabecalhoPublico`, sem sidebar, sem `Cabecalho` e sem `statusVestibular` (o contexto do outlet vai nulo). Se o visitante sair das rotas públicas dentro do SPA, é mandado ao login.
  - `Cabecalho` também checa `get("token")` em `useEffect` e redireciona para `/login` se ausente (checagem redundante/defensiva).
  - Logout (`Cabecalho`) remove `token` e `user` do `local-storage` e navega para `/login`.
- Login (`POST /users/login`) recebe o payload como `FormData` (`generateFormData`) com campos `Email`/`Password`; retorna `{ token, user }`. Com as inscrições desligadas na edição ativa, a API só deixa entrar e-mail de teste — os demais veem o erro por toast. `user.mustChangePassword` leva direto para `/trocar-senha-obrigatoria`.
- **Senha resetada pelo admin**: `/trocar-senha-obrigatoria` pede a senha atual (a que o admin repassou) e a nova, chama `POST /users/change-password` e limpa a flag no `user` local. Enquanto a flag existir, `App` não abre nenhuma subrota. O painel tem o equivalente em `/admin/trocar-senha` (`POST /admin/auth/change-password`).
- Cadastro (`POST /users`) cria a conta e, em seguida, a própria tela de cadastro chama `login` internamente para autenticar automaticamente o usuário recém-criado.
- Fluxo de recuperação de senha é em duas telas: `/recuperar-senha` (informa e-mail, `POST /users/forgot-password`) → navega para `/trocar-senha` passando `state: { email }` via `react-router` (não usa query string) → `/trocar-senha` exige código recebido por e-mail + nova senha (`POST /users/reset-password`); se acessada sem `location.state.email`, redireciona para `/login`.

## Modelo de domínio (inferido das chamadas de API)

- **Usuário/Candidato** (`GET/PUT /users/profile`): flags `mustChangePassword` e `watchInstitutionVideo`; dados pessoais (`name`, `phone`, `gender`, `cpf`), `address {cep, street, neighborhood, city, state, number, complement}`, `birthInfo {date, city, state, country}`, `rgInfo {number, issueDate, issuingAuthority, hasDocument, documentUploadedAt}`, `primaryResponsible`/`secondaryResponsible` (`name, email, phone, phoneSecondary, relationship`), `schoolInfo {currentSchool, currentGrade, schoolType}`, `generalInfo {howDidYouKnow, income, peopleAtHome, peopleWorking}`, `referral {name, cpf}` (indicação, opcional — nulo quando não informada; a API devolve o CPF só com dígitos) e `coupon {code, appliedAt}` (cupom aplicado; só leitura no perfil — muda pelos endpoints `/users/coupon`). Estrutura completa e valores-padrão em `src/pages/app/subpages/inscricao/padroes.js` — **sem `referral`**, de propósito: o modelo é usado pelo `testState` do envio final, que exige tudo que está nele; os valores iniciais da indicação ficam em `padroesIndicacao`, em `inscricao/index.jsx`.
- **Curso** (`GET /courses`, e `GET /courses/count` → `{ total }` para a contagem pública): `id`, `code`, `name`, `type`, `workload`, `ordenacao` (a API já devolve a lista nessa ordem), `minAge`/`maxAge` (strings com formato "X anos ..."), `minSchoolLevel`, `contribution`, `imageId`, `description` (HTML), `jobMarket` (HTML opcional), `availablePeriods[]` (`name`, `entryTime`, `exitTime`, `isActive`).
- **Inscrição/Enrollment** (`POST /enrollments`, `GET /enrollments/my-enrollment`): `firstChoice`/`secondChoice` (`courseCode`, `periodCode`, `courseName`, `periodName`), `protocol`, `status` (numérico — `1` aberta, `2` validada, `3` cancelada), `testDate`, `testTime`, `testRoom`, `isInternalStudent` (bool), `resultPublicationDate` (**data do candidato**, preferir à global de `/parameters`), `roomNoticeEmailDate`, `paymentStatus` (`2` = pago) e `paymentPaidAt`. `GET` retorna 404 (tratado como sucesso via `validateStatus`) quando o usuário não tem inscrição. `firstChoice.courseCode = 0` significa **opções de curso canceladas** (o candidato alterou nascimento ou escolaridade) — `temOpcoesDeCurso()` em `util/useMinhaInscricao.js` é o teste usado em toda a UI.
- **Pagamento** (`POST /enrollments/my-enrollment/payment` e `GET …/payment/status`): `correlationId`, `status` (`1` pendente, `2` pago, `3` vencido, `4` recusado, `5` cancelado), `amount`, `copyPasteCode`, `qrCodeImageUrl` (URL da imagem, servida pelo provedor), `expiresAt`, `paidAt` e, com cupom, `couponCode`, `originalAmount`, `discountAmount` (e `couponNotice`, quando o cupom do candidato deixou de valer na emissão). Cupom que zera a taxa devolve a inscrição **já paga, sem `correlationId`** (`status = 2`, `amount = 0`). Emitido pelo backend e reaproveitado enquanto válido; o provedor não tem webhook, então a confirmação vem da consulta de status.
- **Agendamento** (fora do fluxo atual — `POST/GET /appointments`, `GET /appointments/available-dates`): `appointmentDateTime` no POST; resposta com `appointmentDate`, `startTime`; disponibilidade vem como lista de datas (`availableDates`), e o front gera os horários fixos de 08:00–17:30 (intervalos de 30min) para cada dia disponível (`gerarHorariosParaDiasDisponiveis`, `src/util/date.js`) — os horários em si não vêm da API.
- **Parâmetros do vestibular** (`GET /parameters`): `year`, `isRegistrationOpen`, `allowRegistration`, `allowReferral`, `allowCoupon`, `startDate`, `endDate`, `extensionDate`, `presentationVideoUrl`, `resultPublicationDate`, `canShowResultUrl`, `resultUrl` e `currentPhase` — **número**: `0` não iniciado, `1` inscrições abertas, `3` encerrado (o `2` existe no enum da API, mas nunca é devolvido). O formulário de dados pessoais é travado com `currentPhase >= 3`, isto é, depois de `extensionDate ?? endDate`.
- **FAQ** (`GET /faqs`): `key` (slug opcional para link direto), `question`, `answer` (HTML), `order`, `isActive`.

## Convenções e padrões observados

- **Idioma:** nomes de arquivos, componentes, variáveis e rotas em **português**; chaves de payload/API em **inglês** (contrato do backend).
- **Uploads:** arquivos vão em `FormData` sem `Content-Type` definido à mão — o axios monta o header com o boundary a partir do próprio `FormData`. Os casos hoje são o anexo do RG (candidato), a capa do curso e os CSVs de importação (admin). Anexo do RG e capa são limitados a **4MB no front**; a API aceita até 15MB.
- **Estrutura por feature:** cada página/subpágina fica em sua própria pasta com `index.jsx` + `index.scss` colocados juntos; subcomponentes específicos de uma página moram em `componentes/` ou `components/` dentro da própria pasta da página (ex.: `inscricao/componentes`, `acompanhamento/components`), diferente de `src/components`, reservado a componentes verdadeiramente compartilhados entre páginas.
- **Formatação de datas/UTC:** o backend manda datas em UTC (`Z`); `src/util/date.js` concentra as conversões para não haver "salto de dia" por fuso horário (`converterDataUTCParaLocalSemMudarDia`, `formatarParaInputDate`, `formatarAgendamentoParaISO`).
- **HTML dinâmico:** campos de texto ricos vindos da API (descrição de curso, resposta de FAQ) são renderizados via `formatarComoHTML` (`src/util/string.jsx`), que faz parse com `DOMParser` e usa `dangerouslySetInnerHTML` — não há sanitização adicional, confia-se no conteúdo vindo do backend administrado internamente.
- **Merge/validação de formulário sem schema lib:** em vez de `yup`/`zod`, o projeto usa utilitários próprios em `src/util/general.js`: `mergeObjects` (mescla defaults com dados existentes do usuário, respeitando tipos) e `testState` (valida recursivamente se um objeto de estado preenche um "modelo", com campos opcionais informáveis).
- **Multi-step form:** `Inscricao` implementa um wizard controlado por índice (`passoAtual`) sobre um único `react-hook-form` compartilhado via `FormProvider`; cada passo é um componente de tabela (`FormularioX`) que dispara `methods.trigger([...campos do passo])` antes de avançar. Os passos 1–7 gravam só o próprio bloco (`atualizaUsuario` parcial, mapa `secoesPorPasso`); o último envia o perfil inteiro e, só então, libera a aba de "Escolha do Curso" (`FormularioCursos`, que já fala com o endpoint de `enrollments`).
- **Bloqueio de edição por fase:** quando `statusVestibular.currentPhase >= 3` (fase `Finished`), os campos de `<form id='form-inscricao'>` são desabilitados via manipulação direta do DOM (`Array.from(form.elements).forEach(el => el.disabled = true)`). Vale só para o wizard de dados pessoais — `FormularioCursos` é outro `<form>` e não é afetado.
- **Vídeo institucional como pré-requisito** (`src/util/institutionVideo.js`, `youtubeApi.js`): com `presentationVideoUrl` cadastrado, "Minha inscrição" fica bloqueada até o candidato assistir o vídeo da Início até o fim (evento `ENDED` da IFrame API do YouTube). O fato é persistido em `User.watchInstitutionVideo` (`PUT /users/profile`) e espelhado no `user` do `local-storage`; o bloqueio em si (link da sidebar, botão da Início e redirecionamento em `Inscricao`) é **só de front**.
- **Seções opcionais por flag da edição:** `statusVestibular.allowReferral` e `allowCoupon` (via `useOutletContext()`) decidem se a etapa 8 mostra "Indicação" e "Cupom de desconto". Com a flag desligada o front não renderiza a seção nem envia o dado (`referral` é removido do payload); a API confere a mesma flag.
- **Perfis do painel** (`src/util/permissoesAdmin.js`): espelho dos `[Authorize(Roles)]` da API, usado para esconder ações que dariam `403`.
- **Progresso da inscrição** (`src/util/progresso.js`): 9 etapas (8 passos + escolha do curso); fora do wizard só existem 0/9, 8/9 e 9/9, derivados de `generalInfo.howDidYouKnow` e de haver curso escolhido.
- **Responsividade:** por CSS. `BarraLateral` e `AdminSidebar` têm o próprio botão hambúrguer e um estado `aberta` refletido em `data-open`; em telas estreitas a barra vira faixa superior que expande. O hook `useMediaQuery` e o botão oculto `Button___openSideBar` do layout antigo não são mais usados (o hook segue em `src/util`, sem importadores).
- **Modal global:** `ModalProvider`/`ModalContext`/`useModal` implementam um sistema único de modal para o app inteiro (usado hoje pelo painel admin: modal da conta e formulário de registro importado). `openModal({ customUI, onCloseCallback })` recebe uma função que constrói a UI já injetando o callback de fechar.
- **Variáveis de ambiente:** `VITE_PORT` (porta do dev server) e `VITE_API_URL` (base da API) via `.env` carregado por `loadEnv` no `vite.config.js`.
