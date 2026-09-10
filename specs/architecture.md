# Arquitetura do Projeto — Frei Online

Portal de inscrição do vestibular do **Instituto Social Nossa Senhora de Fátima**. SPA em React que permite a um candidato (ou responsável) se cadastrar, preencher a ficha de inscrição, escolher curso/horário, agendar a prova presencial e acompanhar o andamento do processo até a divulgação do resultado.

## Stack

- **Build/dev server:** Vite 7 (`@vitejs/plugin-react-swc`), porta configurada via `VITE_PORT` (env).
- **UI:** React 19 + React Router 7 (`react-router`, modo `BrowserRouter`).
- **Estilos:** Sass (`sass-embedded`), um arquivo `index.scss` por componente/página; Tailwind 4 (`@tailwindcss/vite`) também está nas dependências mas o grosso da estilização observado é SCSS manual.
- **Formulários:** `react-hook-form` (`useForm`, `FormProvider`/`useFormContext`, `Controller`) + `react-imask`/`imask` para máscaras de input (telefone, CPF, CEP, valores monetários).
- **HTTP:** `axios`, encapsulado em `src/api`.
- **Estado de sessão:** `local-storage` (pacote npm, wrapper de `window.localStorage`) — chaves `token` e `user`.
- **UX utilitário:** `react-hot-toast` (toasts), `react-top-loading-bar` (barra de progresso no topo em ações assíncronas), `react-loading-skeleton` (skeletons de carregamento), `react-day-picker` + `date-fns` (calendário de agendamento).
- **Seleção:** wrapper próprio `Select`/`SelectItem` (hoje renderiza `<select>`/`<option>` nativos; há código comentado usando `@radix-ui/react-select` como implementação alternativa/futura).
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
  cursos                 → Cursos
    :id                    → DetalhesCurso (renderizado via <Outlet> dentro de Cursos)
  faq                     → FAQ
/cadastro               → Cadastro (página standalone, sem layout App)
/login                  → Login (página standalone)
/recuperar-senha        → RecuperarSenha (página standalone)
/trocar-senha           → TrocarSenha (página standalone; exige navegação com state.email)

/admin                  → AdminApp (layout administrativo, sessão própria)
  ""  (index)           → AdminDashboard
  inscricoes            → AdminInscricoes
    :id                 → AdminInscricaoDetalhes
  cursos                → AdminCursos  (novo | :id → AdminCursoForm)
  faq                   → AdminFAQs    (novo | :id → AdminFAQForm)
  vestibular            → AdminVestibular (novo | :id → AdminVestibularForm)
  importacoes           → AdminImportacoes  (upload dos CSVs)
  administradores       → AdminUsuarios
/admin/login            → AdminLogin (página standalone)
/admin/bootstrap        → AdminBootstrap (criação do primeiro admin)
```

`App` (`src/pages/app/index.jsx`) é o layout raiz de tudo que exige sessão ativa: busca `getInfoUsuario()`; se falhar, redireciona para `/login`. Ao obter o usuário, salva em `local-storage` (`user`) e busca `getStatusVestibular()` (parâmetros do processo seletivo: datas de inscrição, data de divulgação de resultado, fase atual). Enquanto isso não resolve, mostra `<Carregamento />` em tela cheia. O status do vestibular é repassado às subrotas via `useOutletContext()`.

## Camada de API (`src/api`)

- **`base.js`** — factory `api()` que cria uma instância axios com `baseURL = import.meta.env.VITE_API_URL` e header `Authorization: Bearer <token>`, lendo o token salvo no `local-storage` a cada chamada (token pode ser vazio/indefinido em rotas públicas como cadastro/login).
- **`callAPI.js`** — wrapper único (`callApi(callback, toastIt = false, ...params)`) por onde **toda** chamada de API do app passa:
  - executa `callback(...params)`;
  - em sucesso, retorna a resposta (ou `{ success: true }` se o callback não retornar nada);
  - em erro, se `toastIt` for `false` ou o status for `401` (sessão expirada — tratado silenciosamente, sem toast, deixando os fluxos de redirecionamento de auth agirem), não mostra nada;
  - caso contrário, extrai a mensagem de erro de `error.response.data.Message[0]` (array, formato de validação da API) ou `error.response.data.message` (string) e mostra via `react-hot-toast`; fallback é `error.message`.
- **`services/`** — um arquivo por domínio, todos funções `async` finas que só chamam `api()` e retornam `r.data` (padrão consistente):
  - `user.js` — `cadastro`, `login`, `atualizaUsuario` (PUT profile — usado pelo formulário de inscrição para submeter dados pessoais completos), `recuperacaoSenha`, `trocaSenha`, `getInfoUsuario`, `enviaDocumentoRG`/`getDocumentoRG` (anexo do RG, em `multipart` — não cabe no JSON do perfil).
  - `vestibular.js` — `getStatusVestibular` → `GET /parameters` (datas de abertura/fechamento de inscrição, fase atual, data/URL de resultado).
  - `cursos.js` — `getCursos`, `getCursoId`, `getCursoImagem` (blob), `getCursoHorarios` (períodos/turnos de um curso).
  - `inscricao.js` — `criaInscricao` (POST enrollment com 1ª/2ª opção de curso+horário), `getInscricao` (GET, aceita 404 como resposta válida via `validateStatus` — usado para saber se o usuário ainda não se inscreveu), `getPagamentoInscricao` (cobrança PIX da taxa).
  - `agendamento.js` — `getDatasAgendamento` (datas disponíveis para a prova), `getAgendamento` (agendamento do usuário logado), `criaAgendamento` (agenda/reagenda a prova).
  - `faq.js` — `getFAQ` (cada pergunta traz `key`, o slug estável usado nos links diretos `/faq?q=<key>`).
  - `services/admin/` — serviços da área administrativa, sobre `adminBase.js` (token em `adminToken`, separado do candidato): `auth`, `cursos`, `faq`, `inscricoes`, `vestibular` e `importacoes` (upload de CSV em `multipart`).
  - `enderecos.js` — não usa `api()`/backend próprio: chama diretamente a API pública ViaCEP (`https://viacep.com.br/ws/{cep}/json/`) para autocompletar endereço a partir do CEP.

Convenção: nenhuma tela chama `axios`/`api()` diretamente — sempre `callApi(service, toastIt, ...args)`, o que centraliza tratamento de erro/toast.

## Autenticação e sessão

- Sessão é 100% client-side: token JWT (presumido) e objeto `user` guardados em `local-storage` (chaves `"token"`, `"user"`), sem cookies/refresh token visível.
- Não há um `PrivateRoute`/guard central de rota — a proteção acontece de forma descentralizada:
  - `App` tenta `getInfoUsuario()`; se a API rejeitar (token ausente/expirado → 401), navega para `/login`.
  - `Cabecalho` também checa `get("token")` em `useEffect` e redireciona para `/login` se ausente (checagem redundante/defensiva).
  - Logout (`Cabecalho`) remove `token` e `user` do `local-storage` e navega para `/login`.
- Login (`POST /users/login`) recebe o payload como `FormData` (`generateFormData`) com campos `Email`/`Password`; retorna `{ token, user }`.
- Cadastro (`POST /users`) cria a conta e, em seguida, a própria tela de cadastro chama `login` internamente para autenticar automaticamente o usuário recém-criado.
- Fluxo de recuperação de senha é em duas telas: `/recuperar-senha` (informa e-mail, `POST /users/forgot-password`) → navega para `/trocar-senha` passando `state: { email }` via `react-router` (não usa query string) → `/trocar-senha` exige código recebido por e-mail + nova senha (`POST /users/reset-password`); se acessada sem `location.state.email`, redireciona para `/login`.

## Modelo de domínio (inferido das chamadas de API)

- **Usuário/Candidato** (`GET/PUT /users/profile`): dados pessoais (`name`, `phone`, `gender`, `cpf`), `address {cep, street, neighborhood, city, state, number, complement}`, `birthInfo {date, city, state, country}`, `rgInfo {number, issueDate, issuingAuthority}`, `primaryResponsible`/`secondaryResponsible` (`name, email, phone, phoneSecondary, relationship`), `schoolInfo {currentSchool, currentGrade, schoolType}`, `generalInfo {howDidYouKnow, income, peopleAtHome, peopleWorking}`. Estrutura completa e valores-padrão em `src/pages/app/subpages/inscricao/padroes.js`.
- **Curso** (`GET /courses`): `id`, `code`, `name`, `type`, `workload`, `minAge`/`maxAge` (strings com formato "X anos ..."), `minSchoolLevel`, `contribution`, `imageId`, `description` (HTML), `jobMarket` (HTML opcional), `availablePeriods[]` (`name`, `entryTime`, `exitTime`, `isActive`).
- **Inscrição/Enrollment** (`POST /enrollments`, `GET /enrollments/my-enrollment`): `firstChoice`/`secondChoice` (`courseCode`, `periodCode`, `courseName`, `periodName`), `status` (numérico — `2` = inscrição concluída), `testDate`, `testTime`, `testRoom`, `isInternalStudent` (bool), `resultPublicationDate` (**data do candidato**, preferir à global de `/parameters`), `roomNoticeEmailDate`, `paymentStatus` (`2` = pago) e `paymentPaidAt`. `GET` retorna 404 (tratado como sucesso via `validateStatus`) quando o usuário não tem inscrição.
- **Pagamento** (`GET /enrollments/my-enrollment/payment`): `status`, `amount`, `copyPasteCode`, `qrCodeBase64`, `expiresAt`, `paidAt`. Emitido pelo backend e reaproveitado enquanto válido.
- **Agendamento** (`POST/GET /appointments`, `GET /appointments/available-dates`): `appointmentDateTime` no POST; resposta com `appointmentDate`, `startTime`; disponibilidade vem como lista de datas (`availableDates`), e o front gera os horários fixos de 08:00–17:30 (intervalos de 30min) para cada dia disponível (`gerarHorariosParaDiasDisponiveis`, `src/util/date.js`) — os horários em si não vêm da API.
- **Parâmetros do vestibular** (`GET /parameters`): `isRegistrationOpen`, `startDate`, `endDate`, `currentPhase` (usado para travar edição do formulário de inscrição quando `currentPhase >= 3`), `resultPublicationDate`, `canShowResultUrl`, `resultUrl`.
- **FAQ** (`GET /faqs`): `key` (slug opcional para link direto), `question`, `answer` (HTML), `order`, `isActive`.

## Convenções e padrões observados

- **Idioma:** nomes de arquivos, componentes, variáveis e rotas em **português**; chaves de payload/API em **inglês** (contrato do backend).
- **Uploads:** arquivos vão em `FormData` sem `Content-Type` definido à mão — o axios monta o header com o boundary a partir do próprio `FormData`. Os dois casos hoje são o anexo do RG (candidato) e os CSVs de importação (admin).
- **Estrutura por feature:** cada página/subpágina fica em sua própria pasta com `index.jsx` + `index.scss` colocados juntos; subcomponentes específicos de uma página moram em `componentes/` ou `components/` dentro da própria pasta da página (ex.: `inscricao/componentes`, `acompanhamento/components`), diferente de `src/components`, reservado a componentes verdadeiramente compartilhados entre páginas.
- **Formatação de datas/UTC:** o backend manda datas em UTC (`Z`); `src/util/date.js` concentra as conversões para não haver "salto de dia" por fuso horário (`converterDataUTCParaLocalSemMudarDia`, `formatarParaInputDate`, `formatarAgendamentoParaISO`).
- **HTML dinâmico:** campos de texto ricos vindos da API (descrição de curso, resposta de FAQ) são renderizados via `formatarComoHTML` (`src/util/string.jsx`), que faz parse com `DOMParser` e usa `dangerouslySetInnerHTML` — não há sanitização adicional, confia-se no conteúdo vindo do backend administrado internamente.
- **Merge/validação de formulário sem schema lib:** em vez de `yup`/`zod`, o projeto usa utilitários próprios em `src/util/general.js`: `mergeObjects` (mescla defaults com dados existentes do usuário, respeitando tipos) e `testState` (valida recursivamente se um objeto de estado preenche um "modelo", com campos opcionais informáveis).
- **Multi-step form:** `Inscricao` implementa um wizard controlado por índice (`passoAtual`) sobre um único `react-hook-form` compartilhado via `FormProvider`; cada passo é um componente de tabela (`FormularioX`) que só dispara `methods.trigger([...campos do passo])` antes de avançar. O último passo do wizard chama `atualizaUsuario` (PUT profile) e, só então, libera a aba de "Escolha do Curso" (`FormularioCursos`, que já fala com o endpoint de `enrollments`).
- **Bloqueio de edição por fase:** quando `statusVestibular.currentPhase >= 3`, o formulário de inscrição inteiro é desabilitado via manipulação direta do DOM (`Array.from(form.elements).forEach(el => el.disabled = true)`).
- **Responsividade:** hook `useMediaQuery` (`matchMedia`) usado para alternar entre versões desktop/mobile de `BarraLateral` (sidebar vira drawer) e `Cabecalho` (botão hambúrguer). O drawer mobile é aberto de forma desacoplada — `Cabecalho` dispara um clique programático em um `<button id="Button___openSideBar">` escondido dentro de `BarraLateral`, evitando estado compartilhado entre os dois componentes.
- **Modal global:** `ModalProvider`/`ModalContext`/`useModal` implementam um sistema único de modal para o app inteiro (usado hoje só pelo seletor de agendamento). `openModal({ customUI, onCloseCallback })` recebe uma função que constrói a UI já injetando o callback de fechar.
- **Variáveis de ambiente:** `VITE_PORT` (porta do dev server) e `VITE_API_URL` (base da API) via `.env` carregado por `loadEnv` no `vite.config.js`.
