# Componentes do Projeto — Frei Online

Catálogo de todos os componentes React do projeto, organizados por onde vivem: compartilhados (`src/components`), utilitários/hooks (`src/util`) e componentes locais de página (dentro de `src/pages/**/componentes|components`).

## Compartilhados — `src/components`

### `AcordeaoPerguntas` (`acordeao_perguntas/index.jsx`)
Lista de perguntas frequentes em formato acordeão (um item aberto por vez, controlado por índice `selecionada`).
- **Props:** `max` (número opcional) — limita quantas perguntas são exibidas (usado na Home com `max={5}`; na página FAQ é usado sem limite); `aberta` — qual pergunta abrir de saída; `numbered`; `onSelecionar`.
- **`aberta` aceita a `key` da pergunta** (slug estável vindo da API, ex.: `edital-bolsa`) ou, por compatibilidade com links antigos, o índice numérico. A resolução acontece num `useEffect` separado, porque só é possível casar a key depois que as perguntas chegam da API. A key é preferível: o índice muda a cada reordenação e o ObjectId difere entre ambientes.
- Busca as perguntas via `callApi(getFAQ)` em `useEffect`; filtra só as `isActive` e ordena por `order`.
- Cada pergunta renderiza `p.order`. Pergunta e `formatarComoHTML(p.answer)` (resposta pode conter HTML).
- Clique no cabeçalho da pergunta expande/recolhe (classe `selecionada`).
- Existe um arquivo irmão `perguntas.js` com um array mockado de perguntas/respostas — não é mais importado por `index.jsx` (dados reais vêm da API); parece ser resquício/mock antigo.

### `BarraLateral` (`barra_lateral/index.jsx`)
Sidebar de navegação principal do layout autenticado (`App`).
- Usa `useMediaQuery("screen and (max-width: 768px)")` para decidir entre `BarraMobile` (drawer) e `BarraPadrao` (fixa).
- **`BarraMobile`**: mantém estado `aberta`; expõe um `<button id="Button___openSideBar" style={{display:'none'}}>` que outros componentes (o `Cabecalho`) acionam via `document.getElementById(...).click()` para abrir o drawer sem precisar de estado compartilhado. Fecha automaticamente ao clicar fora (`useClickOutside`) ou ao mudar de rota (`useLocation`).
- **`BarraPadrao`**: renderiza o logo, (no mobile) botão de fechar, e a lista de links via `LinkLateral`.
- **`LinkLateral({ para, titulo, icone })`**: item de navegação com `useMatch(para)` para aplicar classe `selecionado`; ícone carregado de `/assets/images/icons/{icone}.svg`.
- Links fixos: Início (`/`), Inscrição (`/inscricao`), Acompanhamento (`/acompanhamento`), Cursos (`/cursos`), FAQ (`/faq`).
- Rodapé: horário de atendimento, link de **WhatsApp (11) 96398-6252** (`wa.me/5511963986252`) e "Sair da conta".

### `Cabecalho` (`cabecalho/index.jsx`)
Header do layout autenticado.
- Em `useEffect`, verifica `get("token")`; se ausente, `navigate("/login")` (guarda redundante além da que existe em `App`).
- Mostra nome do usuário logado (`get("user")`) e status estático "Online"; ao clicar, abre menu com opção **Sair** (`logout`: remove `token`/`user` do local-storage e navega para `/login`).
- Em telas mobile, mostra botão de menu (ícone hambúrguer) que aciona a abertura do drawer da `BarraLateral` via clique programático no botão oculto `Button___openSideBar`.
- Usa `useClickOutside` para fechar o menu do usuário ao clicar fora.

### `Carregamento` (`carregamento/index.jsx`)
Spinner de carregamento simples (`<img src="/assets/images/loading.svg">`).
- **Props:** `style` (objeto CSS opcional aplicado ao container) — usado, por exemplo, com `{ height: '100dvh' }` para tela cheia em `App` e sem `style` como carregamento inline (ex.: lista de cursos).

### Modal (`modal/`)
Sistema de modal global.
- **`context.js`**: `ModalContext` (`createContext()`), sem valor padrão.
- **`ModalProvider`** (`index.jsx`): provider que deve envolver toda a aplicação (feito em `main.jsx`, fora do `BrowserRouter`).
  - Estado: `modalContent` (nó React a renderizar dentro do modal), `isOpen`, `closeCallback`.
  - Ao abrir (`openModal({ customUI, onCloseCallback })`): chama `customUI(closeModal)` — ou seja, o conteúdo do modal já recebe a função de fechamento pronta para uso — e guarda `onCloseCallback` para executar quando o modal for fechado.
  - Ao fechar (`closeModal`): adiciona a classe `Modal___Closing` no elemento `#Modal__Overlay` (dispara animação de saída via CSS), aguarda 200ms (`sleep`), só então desmonta o conteúdo e executa `closeCallback`, se houver.
  - Fecha automaticamente ao clicar fora do conteúdo (`useClickOutside` no wrapper interno).
  - Enquanto o modal está aberto, adiciona `Overflow__Hidden` no `<body>` para travar o scroll da página.
  - Expõe `{ openModal, isOpen }` via `ModalContext.Provider`.
- **`useModal()`** (`src/util/useModal.js`): hook de conveniência (`useContext(ModalContext)`), usado hoje só pelo `SeletorDeAgendamento` (fluxo de agendamento da prova).
- Único consumidor no app hoje: `Agendamento` (dentro da timeline de acompanhamento) abre o modal com `SeletorDeAgendamento`.

### `PainelInstitucional` (`painel_institucional/index.jsx`)
Painel de marca (coluna navy) compartilhado pelas telas públicas — Login, Cadastro, Recuperar/Trocar
Senha e as equivalentes do painel admin.
- **Props:** `titulo` (default `"Inscrições"`), `destaque` (default `"2026"`), `descricao`, `mostrarStats`.
- Exibe o **logo do instituto** (`/assets/images/logo.svg`) ao lado de "Ação Social / Nossa Senhora de Fátima".
  Usa `logo.svg` — a marca em traço branco, feita para fundo escuro. O `logo2.svg` é a versão completa
  em azul **com fundo branco sólido** e viraria um retângulo branco sobre o painel navy.
- *A sidebar da área autenticada (`BarraLateral`) ainda usa o monograma provisório "A".*

### `Select` / `SelectItem` (`select/index.jsx`)
Wrapper de campo de seleção usado em todos os formulários do app.
- Implementação atual: `<select>`/`<option>` nativos do HTML (props: `defaultValue`, `value`, `disabled`, `onChange(valorString)`, `children`, `className`, `placeholder` — a primeira `<option>` é sempre o placeholder, desabilitada e oculta).
- Há uma implementação alternativa **comentada** no mesmo arquivo usando `@radix-ui/react-select` (Root/Trigger/Value/Icon/Content/Viewport), incluindo suporte a `dropIcon` customizado — indica migração planejada/pausada para um select estilizado, mantendo a mesma API pública (`Select`/`SelectItem`) para não quebrar os formulários que já a consomem.
- `SelectItem({ disabled, onClick, value, children, className })` hoje só repassa para `<option>` (props `disabled`/`className` do wrapper Radix ficariam órfãs na versão nativa).

### `ToasterContainer` (`toaster_container/index.jsx`)
Wrapper de `react-hot-toast`'s `<Toaster />`, instanciado localmente em cada página que precisa de toasts (não é global em `main.jsx`).
- **Props:** `props` (objeto opcional repassado ao `Toaster`; default `position: 'bottom-center'`, `reverseOrder`, `toastOptions: { duration: 3000 }`, `containerClassName: 'cont-toaster'`).
- Em `useEffect` reagindo a `location.pathname`, chama `toast.remove()` — limpa toasts pendentes ao trocar de rota.
- Usado em: `Inscricao`, `Acompanhamento`, `Login`, `Cadastro`, `RecuperarSenha`, `TrocarSenha`.

## Hooks e utilitários (`src/util`)

- **`useClickOutside(ref, callback)`** — dispara `callback` em `mousedown`/`touchstart` fora do elemento referenciado. Usado em: sidebar mobile, menu do usuário no cabeçalho, modal.
- **`useMediaQuery(query)`** — wrapper de `window.matchMedia`; retorna `null` até a primeira resolução (evita flash de layout errado no SSR/primeira renderização), depois `true`/`false` reativo.
- **`useModal()`** — ver seção Modal acima.
- **`date.js`** — funções puras de data/hora (sem componente): `gerarHorariosParaDiasDisponiveis`, `formatarAgendamentoParaISO`, `converterDataUTCParaLocalSemMudarDia`, `formatarParaInputDate` (ver detalhes em `architecture.md`).
- **`form.js`** — `generateFormData(json)`: converte um objeto plano em `FormData` (usado nos payloads de login/cadastro).
- **`general.js`** — `sleep(ms)`, `mergeObjects(target, source)` (merge profundo respeitando tipos, via lodash `cloneDeep`), `testState(current, model, optional)` (validação recursiva de preenchimento de um objeto de estado contra um "modelo" de campos obrigatórios).
- **`string.jsx`** — `formatarData(stringData)` (data curta via `toLocaleDateString`), `formatarComoHTML(texto)` (parseia string HTML com `DOMParser` e retorna `<span dangerouslySetInnerHTML>`), `corrigeURLVideo(url)` (normaliza links do YouTube — padrão `youtu.be` ou `youtube.com/watch` — para o formato `embed`, preservando `?list=`).

## Componentes locais de página

### `src/pages/app/subpages/inscricao/componentes/` (formulário de inscrição)

- **`input.jsx`** (`Input`) — célula `<td>` de tabela de formulário, componente genérico de campo:
  - **Props:** `as` (componente de input a renderizar, default `'input'`; usado com `IMaskInput` para campos mascarados), `name`, `children`, `ref`, demais props repassadas ao componente.
  - Usa `useFormContext()` para ler `errors` e exibir mensagem de erro (`encontraErro`, também exportado) acima do campo.
  - Inclui correção para o bug de autofill do navegador: escuta `onAnimationStart` de uma animação chamada `onAutoFillStart` (definida no CSS) e força `onChange` com o valor atual — necessário porque o Chrome não dispara eventos normais de input em autofill.
  - `encontraErro(errors, name)` — resolve erro de campo aninhado a partir de um `name` com notação de ponto (`"address.cep"` → `errors.address.cep`).

- **`anexoRG.jsx`** (`AnexoRG`) — campo de anexo da foto do RG, usado no passo 4 do wizard.
Campo de anexo da foto do RG, usado no passo 4 do wizard de inscrição.
- **Props:** `onMudanca(temAnexo)` — avisa o passo se já existe anexo, para liberar o "Salvar e avançar".
- O arquivo **sobe assim que é escolhido** (`POST /users/rg-document`), em requisição própria: o passo
  do wizard é enviado como JSON no `PUT /users/profile` e não comporta um arquivo.
- Valida o tamanho (4MB) no cliente antes de subir; o formato é validado pelo backend.
- Mostra prévia da imagem — do arquivo recém-escolhido ou, na primeira carga, baixando o anexo já
  enviado (`GET /users/rg-document`). PDF não gera prévia, só o rótulo "Documento anexado".
- Atualiza `user.rgInfo.hasDocument` no `local-storage` para que o passo continue liberado após um F5.
- Exibe o aviso de **"foto legível"**.


- **`formCursos.jsx`** (`FormularioCursos`) — último "passo" do fluxo de inscrição (fora do wizard de dados pessoais): seleção de 1ª e 2ª opção de curso + horário.
  - Carrega lista de cursos (`getCursos`) e, se o usuário já tiver inscrição (`getInscricao`), pré-popula os `Select`s com os cursos/horários já escolhidos e busca os horários correspondentes.
  - Regra de negócio: não permite que 1ª e 2ª opção sejam exatamente o mesmo par curso+horário — ao detectar conflito, limpa a opção conflitante e mostra erro inline (`erro`, exibido em linha própria da tabela). Há um bloco de regra comentado (exigência de 2ª opção fora de cursos "Teens") que está desativado no momento.
  - Traz um link "Conheça os cursos disponíveis" para `/cursos`, aberto em **nova aba** — navegar para fora descartaria o estado do wizard.
  - Ao confirmar (`criaInscricao`), dispara barra de progresso (`react-top-loading-bar`), toast de sucesso e navega para `/acompanhamento` após 1s.
  - Erros de negócio do backend (bloqueio por mensalidades em aberto, RG não anexado) chegam por toast via `callApi`.

- **`formDados.jsx`** — oito componentes de formulário, um por "passo" do wizard de inscrição, todos consumindo o mesmo `useFormContext()` compartilhado (via `FormProvider` em `Inscricao`) e recebendo `{ avancar, retornar }`:
  - `FormularioDadosPessoais` — nome, telefone (máscara `+55 (00) 00000-0000`), gênero (`Select` com opções de `selects.js`).
  - `FormularioEndereco` — CEP (máscara, com `onBlur` disparando `getEnderecoCompleto` para autopreencher rua/bairro/cidade/UF via ViaCEP), rua, bairro, cidade, estado (máscara 2 letras maiúsculas), número, complemento (opcional).
  - `FormularioNascimento` — data, cidade, estado (máscara UF), país.
  - `FormularioRG` — CPF (máscara `000.000.000-00`), número do RG, data de emissão (validação `min` de `01/01/1900`), órgão emissor e o **anexo obrigatório** (`AnexoRG`). Como o anexo não é campo do `react-hook-form`, o passo mantém um estado próprio (`temAnexo`) e o botão "Salvar e avançar" checa esse estado antes de chamar `avancar([...])`.
  - `FormularioResponsavelPrimario` — dados da mãe (nome, e-mail, telefone, telefone secundário); campo `relationship` fixado/desabilitado como "Mãe" (`Select disabled`).
  - `FormularioResponsavelSecundario` — mesmos campos do responsável primário, mas `relationship` livre (lista `parentesco`).
  - `FormularioEscolar` — escola atual, série atual (`Select` com `escolaridades`), tipo de escola (`Select` com `tipoEscola`).
  - `FormularioInformacoesGerais` — como conheceu o instituto (`Select`), renda mensal familiar (campo mascarado como moeda BRL via `IMaskInput` com `mask={Number}`), pessoas em casa, pessoas trabalhando.
  - Cada formulário é uma `<table className="tabela-form">`; footer com botão "Retornar" (exceto no primeiro passo) e "Avançar", que chama `avancar([...nomes dos campos])` — o componente pai decide se valida (`methods.trigger`) e avança de passo ou submete.

- **`padroes.js`** — objeto com a "forma"/valores-padrão (todos strings vazias) de todo o formulário de inscrição; usado como base para `mergeObjects` (preenche com dados já existentes do usuário) e como "modelo" para `testState` (validação de obrigatoriedade antes do submit final).
- **`selects.js`** — arrays de opções estáticas usados pelos `Select`s do formulário: `genero`, `parentesco`, `comoConheceu` (Amigos, Família, Cônjuge, Filho/Filha, Ex-Aluno, Redes Sociais, Internet, Outro), `estadosBrasileiros` (não usado atualmente nos formulários, que preferem input mascarado de UF), `escolaridades`, `tipoEscola`.

### `src/pages/app/subpages/acompanhamento/components/`

- **`linhaTempo/linhaTempo.jsx`** (`Timeline`, exportado como default; arquivo/pasta chamados de "linhaTempo") — monta a timeline de 5 etapas do processo seletivo: **Cadastro criado → Inscrição preenchida → Pagamento → Prova presencial → Resultado e matrícula**. Recebe `dadosInscricao` por prop e `statusVestibular` via `useOutletContext()`.
  - A data de resultado vem de `dadosInscricao.resultPublicationDate` (**por candidato**), com fallback para a global de `/parameters` — quem não tem inscrição continua vendo a data geral.
  - A etapa "Prova presencial" recebe o status `dispensado` quando `isInternalStudent` é verdadeiro.
  - `TimelineItem` é o item visual de cada etapa; a classe vem do status normalizado sem acento (`status-concluido`, `status-aguardando`, `status-dispensado`).

- **`linhaTempo/dadosLinha.jsx`** — conteúdo de cada etapa (todos exportados nomeados):
  - `CadastroCriado` / `InscricaoPreenchida` — mensagens estáticas de sucesso.
  - `Pagamento({ pago })` — cobrança PIX da taxa de inscrição: imagem do QR code (quando o provedor fornece) e código copia-e-cola com botão "Copiar" (`navigator.clipboard`, com fallback por toast pedindo cópia manual em contextos sem permissão). Enquanto pendente, consulta `getPagamentoInscricao` a cada 10s para que a confirmação pelo webhook faça a etapa virar sem recarregar a página; o intervalo é limpo no unmount.
  - `ProvaPresencial({ realizado, dadosInscricao })` — ramifica por `isInternalStudent`: aluno interno vê a mensagem de nivelamento no próprio curso; externo vê endereço, data e o aviso de que horário e sala chegam por e-mail em `roomNoticeEmailDate`.
  - `ResultadoMatricula({ realizado, dataPublicacao, urlResultado, mostrarUrl })` — mostra link do resultado quando disponível, ou data prevista de divulgação (e link antecipado se `mostrarUrl` estiver habilitado pelo backend).
  - Todas usam `converterDataUTCParaLocalSemMudarDia` para exibir datas.

- **`selecionaDatas/index.jsx`** (`SeletorDeAgendamento`) — modal de agendamento da prova. **Não é mais usado pela timeline** (a convocação passou a ser definida pela secretaria), mas segue no repositório junto do serviço `agendamento.js` e dos endpoints correspondentes da API.
  - **Props:** `datasDisponiveis` (array de datas ISO vindas da API), `confirmar(dataISO)` (callback).
  - Usa `react-day-picker` (`DayPicker`, locale `ptBR`) para seleção de dia, restringindo dias selecionáveis aos presentes em `datasDisponiveis` (via `disabled`) e destacando-os visualmente (`modifiers`/`modifiersStyles`).
  - Ao selecionar um dia, gera a lista de horários fixos daquele dia (`gerarHorariosParaDiasDisponiveis`) e exibe um `Select` de horários.

### `src/pages/admin/`

Área administrativa, com sessão própria (`adminToken`/`admin` no `local-storage`) e layout `AdminApp` + `AdminSidebar`. Páginas: `login`, `bootstrap`, `dashboard`, `inscricoes` (+ `detalhes`), `cursos` (+ `form`), `faq` (+ `form`), `vestibular` (+ `form`), `importacoes` e `administradores`.

- **`importacoes/index.jsx`** (`AdminImportacoes`) — envio dos dois CSVs. Cada bloco (`CartaoImportacao`) mostra as colunas esperadas, o efeito da importação, o total de registros na base e a data do último lote, e exibe o resultado com as linhas recusadas e o motivo (limitado a 20 na tela). O cartão de pagamentos é marcado como **destrutivo** e pede confirmação antes de enviar, porque substitui a base inteira.
- **`inscricoes/detalhes/index.jsx`** — inclui `AnexoRGCandidato`, que baixa o anexo do RG como blob (o endpoint exige o Bearer de admin, então um `<a href>` direto não funcionaria) e o abre em nova aba, revogando a URL de objeto depois.
- **`faq/form/index.jsx`** — além de pergunta/resposta/ordem, edita a **`key`** (slug validado por `^[a-z0-9-]*$`) usada nos links diretos e no quadro "Informações gerais" da Início.
- **`vestibular/form/index.jsx`** — edita as datas da edição, incluindo as duas novas: **resultado do candidato externo** em curso de continuidade e **data do e-mail com horário e sala**.

## Componentes de página (top-level, um por rota)

Não são "componentes reutilizáveis" no sentido estrito, mas compõem a UI de cada tela — documentados com mais detalhe de fluxo/regra de negócio em `features-usecases.md`:

- `App` (`pages/app`) — shell autenticado (sidebar + header + outlet), guarda de sessão, carrega status do vestibular.
- `Inicio` (`pages/app/subpages/inicio`) — dashboard/boas-vindas, aviso de agendamento pendente, anúncio de status das inscrições (`Anuncio`/`BotaoAnuncio`, internos ao arquivo), atalhos e FAQ resumido.
- `Cursos` (`pages/app/subpages/cursos`) — grade de cursos com filtro por tipo (+ filtro especial "Inglês" baseado no nome), `CardCurso` (interno) carrega a imagem do curso sob demanda como blob.
- `DetalhesCurso` (`pages/app/subpages/cursos/detalhes`) — ficha completa de um curso (descrição, tabela de informações, mercado de trabalho opcional), com skeletons de carregamento.
- `FAQ` (`pages/app/subpages/faq`) — página dedicada, reaproveita `AcordeaoPerguntas` sem limite.
- `Inscricao` (`pages/app/subpages/inscricao`) — orquestra o wizard de formulário de dados pessoais + seleção de curso.
- `Acompanhamento` (`pages/app/subpages/acompanhamento`) — resumo da inscrição (1ª/2ª opção) + `Timeline`.
- `Login`, `Cadastro`, `RecuperarSenha`, `TrocarSenha` (`pages/login`, `pages/cadastro`, `pages/recuperar-senha`, `pages/trocar-senha`) — telas públicas, todas com o mesmo layout visual de dois painéis (formulário à esquerda, logo/branding à direita).
