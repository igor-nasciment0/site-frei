# Componentes do Projeto — Frei Online

Catálogo de todos os componentes React do projeto, organizados por onde vivem: compartilhados (`src/components`), utilitários/hooks (`src/util`) e componentes locais de página (dentro de `src/pages/**/componentes|components`).

> Conferido contra o código em **2026-10-12** (divergências resolvidas nesta revisão:
> `nsf-app-v3/specs/divergencias.md`).

## Compartilhados — `src/components`

### `AcordeaoPerguntas` (`acordeao_perguntas/index.jsx`)
Lista de perguntas frequentes em formato acordeão (um item aberto por vez, controlado por índice `selecionada`).
- **Props:** `max` (número opcional) — limita quantas perguntas são exibidas (usado na Início com `max={3}`; na página FAQ é usado sem limite); `aberta` — qual pergunta abrir de saída; `numbered` (padrão `true`); `onSelecionar` — quando informado, o componente vira uma lista de atalhos: o clique não expande a resposta, só avisa qual pergunta foi escolhida (a Início usa para navegar até `/faq?q=<key>`).
- Resposta que cita o endereço do Instituto ("Coronel Octaviano") ganha um link para o mapa.
- **`aberta` aceita a `key` da pergunta** (slug estável vindo da API, ex.: `edital-bolsa`) ou, por compatibilidade com links antigos, o índice numérico. A resolução acontece num `useEffect` separado, porque só é possível casar a key depois que as perguntas chegam da API. A key é preferível: o índice muda a cada reordenação e o ObjectId difere entre ambientes.
- Busca as perguntas via `callApi(getFAQ)` em `useEffect`; filtra só as `isActive` e ordena por `order`.
- Cada pergunta renderiza `p.order`. Pergunta e `formatarComoHTML(p.answer)` (resposta pode conter HTML).
- Clique no cabeçalho da pergunta expande/recolhe (classe `selecionada`).
- Existe um arquivo irmão `perguntas.js` com um array mockado de perguntas/respostas — não é mais importado por `index.jsx` (dados reais vêm da API); parece ser resquício/mock antigo.

### `BarraLateral` (`barra_lateral/index.jsx`)
Sidebar de navegação principal do layout autenticado (`App`).
- **Props:** `user`, `inscricao`, `statusVestibular` (vindos do `App`).
- Um único componente para desktop e mobile: estado `aberta` refletido em `data-open` e botão
  hambúrguer próprio (`aria-label`/`aria-expanded`); o CSS transforma a barra em faixa superior
  expansível em telas estreitas. Fecha ao mudar de rota. Não usa mais `useMediaQuery` nem o botão
  oculto `Button___openSideBar`.
- Links fixos: Início (`/`), Minha inscrição (`/inscricao`), Acompanhamento (`/acompanhamento`), Cursos (`/cursos`), Dúvidas frequentes (`/faq`). `LinkLateral` usa `useMatch(para)` para a classe `ativo`.
- **Selo de progresso** em "Minha inscrição": `n/9`, de `calcularProgresso(user, temOpcoesDeCurso(inscricao))` (`util/progresso.js`).
- **"Minha inscrição" bloqueada** (vira `<span aria-disabled>`) enquanto há vídeo de apresentação cadastrado e o candidato não o assistiu até o fim — reage na hora ao evento de vídeo assistido (`useAssistiuVideoInstitucional`).
- Rodapé: horário de atendimento, link de **WhatsApp (11) 96398-6252** (`wa.me/5511963986252`) e "Sair da conta" (remove `token`/`user` e vai para `/login`).
- Exibe o **logo do instituto** (`/assets/images/logo.svg`) ao lado de "Instituto Social / Nossa Senhora de Fátima" — mesmo tratamento do `PainelInstitucional`.

### `AdminSidebar` (`admin_sidebar/index.jsx`)
Sidebar do painel administrativo, com o mesmo comportamento responsivo da `BarraLateral`.
- **Props:** `admin` (do `local-storage`).
- **Admin**: Painel, Inscrições, Contas, Cursos, Compatibilidades, Dúvidas frequentes, Vestibular, Cupons, Importações, Administradores + grupo expansível **Relatórios** (Financeiro, Indicações, Cupons).
- **Secretaria**: Inscrições, Contas e, em Relatórios, Indicações e Cupons. **Financeiro**: Inscrições e, em Relatórios, só Financeiro. Cada link do grupo declara os `perfis` que o veem (espelho do `AdminReportsController`).
- `GrupoLateral` abre sozinho quando a rota atual é de um dos filhos.
- Rodapé: "Logado como {nome}" e "Sair do painel" (remove `adminToken`/`admin`).

### `CabecalhoPublico` (`cabecalho_publico/index.jsx`)
Topo do layout de visitante — usado pelo `App` quando não há sessão numa rota pública (hoje, o
catálogo de cursos). Sem props: marca do Instituto (link para `/cursos`) e os atalhos **Entrar**
(`/login`) e **Criar cadastro** (`/cadastro`).

### `Cabecalho` (`cabecalho/index.jsx`)
Header do layout autenticado.
- **Props:** `user`, `inscricao`.
- Em `useEffect`, verifica `get("token")`; se ausente, `navigate("/login")` (guarda redundante além da que existe em `App`).
- Esquerda: breadcrumb "Portal do candidato / {página}". Direita: nome do usuário, protocolo da inscrição (quando existe) e avatar com as iniciais; o clique abre o menu com **Sair**.
- Usa `useClickOutside` para fechar o menu ao clicar fora. Não tem mais indicador "Online" nem botão de menu mobile (o hambúrguer fica na `BarraLateral`).

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
- **`useModal()`** (`src/util/useModal.js`): hook de conveniência (`useContext(ModalContext)`).
- Consumidores hoje, ambos no painel admin: a lista de contas (`ModalConta`) e os registros importados (`RegistroForm`). O conteúdo do modal é renderizado pelo `ModalProvider`, **fora do `BrowserRouter`** — `<Link>`/`useNavigate` não funcionam lá dentro; a navegação é passada por callback da página. O antigo `SeletorDeAgendamento` foi removido do repositório.

### `PainelInstitucional` (`painel_institucional/index.jsx`)
Painel de marca (coluna navy) compartilhado pelas telas públicas — Login, Cadastro, Recuperar/Trocar
Senha e as equivalentes do painel admin.
- **Props:** `titulo` (default `"Inscrições"`), `destaque` (default `"2026"`), `descricao`, `mostrarStats`.
- Quando `mostrarStats`, busca a **quantidade de cursos na API** (`GET /api/courses/count`, anônimo — a tela é pública e não há token) e a exibe no bloco de indicadores. Chamada com `toastIt=false`: é número decorativo, então se a API não responder o indicador apenas não aparece, sem toast de erro. O "64 anos de história" segue fixo no código.
- Exibe o **logo do instituto** (`/assets/images/logo.svg`) ao lado de "Ação Social / Nossa Senhora de Fátima".
  Usa `logo.svg` — a marca em traço branco, feita para fundo escuro. O `logo2.svg` é a versão completa
  em azul **com fundo branco sólido** e viraria um retângulo branco sobre o painel navy.


### `Select` / `SelectItem` (`select/index.jsx`)
Wrapper de campo de seleção usado em todos os formulários do app.
- `<select>`/`<option>` nativos do HTML (props: `defaultValue`, `value`, `disabled`, `onChange(valorString)`, `children`, `className`, `placeholder` — a primeira `<option>` é sempre o placeholder, desabilitada e oculta).
- `SelectItem({ disabled, value, children, className })` repassa para `<option>`.
- A implementação alternativa em Radix, que ficava comentada no arquivo, foi removida; `@radix-ui/react-select` sobrou só no `package.json`.

### `EditorTexto` (`editor_texto/`)
Campo de texto formatado dos formulários do admin — substitui os `<textarea>` "aceita HTML", para
quem edita não precisar saber HTML. Recebe e devolve **HTML** (mesmo formato já gravado no banco).
- **Props:** `value`, `onChange(html)`, `onBlur`, `id`, `alturaMinima` (px, padrão 140), `ariaLabel`.
  Usado com `Controller` do `react-hook-form`.
- **Barra**: Negrito, Itálico, Sublinhado, lista com marcadores, lista numerada, Link (inserir,
  editar ou remover, por `prompt`), **Tabela** (insere 3×3 com linha de cabeçalho) e Limpar
  formatação. Com o cursor dentro de uma tabela aparece uma segunda barra: + Linha, − Linha,
  + Coluna, − Coluna, Cabeçalho e Excluir tabela. Atalhos Ctrl+B/I/U. Títulos, citações e
  código ficam desligados — só existe o que as telas do candidato sabem exibir.
- Sobre **TipTap** (`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-table`). `index.jsx` é um invólucro com
  `React.lazy`: o editor vai num chunk à parte e só é baixado no painel.
- **Só grava quando a pessoa edita o campo**: abrir e salvar o registro sem mexer no texto mantém o
  HTML original intacto. Ao editar, o conteúdo é reescrito no formato do editor: a **estrutura** é
  mantida (parágrafos, quebras de linha, negrito, listas, links e tabelas com suas linhas, colunas
  e cabeçalho), mas **estilos embutidos** (`style="…"`, cores, larguras) e `<div>`/`<span>` são
  descartados — a aparência passa a vir do mixin `texto-rico`, que dá às tabelas cabeçalho
  azul-tinta, bordas e linhas zebradas. `prepararHtml` insere um espaço entre `<span>` vizinhos
  antes de carregar, para "R$" e o valor não colarem.
- Campo vazio devolve `""` (não `<p></p>`), para o "campo obrigatório" funcionar.
- **Onde é usado**: curso (descrição, mercado de trabalho, reunião de pais e início das aulas) e
  FAQ (resposta). Ficam como texto simples: "período de matrícula" do curso (entra no meio de uma
  frase do e-mail) e a descrição da edição do vestibular.
- O texto dentro do editor usa o mixin `texto-rico` (`styles/_tokens.scss`), o mesmo aplicado onde
  esse HTML é exibido ao candidato (detalhe do curso e resposta do FAQ) — o reset global zera
  margens e paddings, então parágrafos, listas e negrito precisam desse mixin para aparecer.

### `ToasterContainer` (`toaster_container/index.jsx`)
Wrapper de `react-hot-toast`'s `<Toaster />`. Não é global em `main.jsx` — cada área precisa montá-lo
pelo menos uma vez na própria árvore, senão `toast.error`/`toast.success` (inclusive os disparados
por `callApi`) são chamados normalmente mas **não aparecem na tela**, já que não existe `<Toaster/>`
nenhum pra renderizá-los (bug real já visto: reset de senha do candidato no admin "não avisava" erro
de validação — a mensagem certa chegava do backend, só não tinha onde aparecer).
- **Props:** `props` (objeto opcional repassado ao `Toaster`; default `position: 'bottom-center'`, `reverseOrder`, `toastOptions: { duration: 3000 }`, `containerClassName: 'cont-toaster'`).
- Em `useEffect` reagindo a `location.pathname`, chama `toast.remove()` — limpa toasts pendentes ao trocar de rota.
- **App do candidato** (instanciado por página, sem layout compartilhado): `Inscricao`, `Acompanhamento`,
  `Login`, `Cadastro`, `RecuperarSenha`, `TrocarSenha`, `TrocarSenhaObrigatoria`. (`Inicio`, `Cursos` e `FAQ` não montam um — toast disparado nelas não aparece.)
- **Painel admin**: uma única instância no layout `AdminApp` (`pages/admin/index.jsx`), cobrindo todas
  as subpáginas autenticadas (`Outlet`) de uma vez — dashboard, inscrições (+ detalhes, onde fica o
  reset de senha), contas, cursos, compatibilidades, FAQ, vestibular, importações, relatórios,
  administradores. `AdminLogin`, `AdminBootstrap` e `AdminTrocarSenha` são rotas standalone fora
  desse layout, então mantêm a própria instância cada um.

## Hooks e utilitários (`src/util`)

- **`useClickOutside(ref, callback)`** — dispara `callback` em `mousedown`/`touchstart` fora do elemento referenciado. Usado no menu do usuário do cabeçalho e no modal.
- **`useMediaQuery(query)`** — wrapper de `window.matchMedia`. **Sem uso** desde que as sidebars passaram a ser responsivas por CSS.
- **`useModal()`** — ver seção Modal acima.
- **`useMinhaInscricao()`** — busca a inscrição do usuário na edição ativa, tratando 404 como "sem inscrição"; devolve `{ inscricao, carregando }`. Exporta também **`temOpcoesDeCurso(inscricao)`** (`firstChoice.courseCode > 0`) — inscrição pode existir sem curso, quando as opções foram canceladas.
- **`institutionVideo.js`** — vídeo de apresentação como pré-requisito da inscrição: `assistiuVideoInstitucional()`, `marcarVideoInstitucionalAssistido()` (grava `watchInstitutionVideo` no perfil e só então no `user` local), `podeEntrarNaInscricao(statusVestibular)` e o hook `useAssistiuVideoInstitucional()`.
- **`youtubeApi.js`** — `carregarYoutubeIframeApi()`: carrega a IFrame API do YouTube uma vez, para detectar o fim do vídeo.
- **`progresso.js`** — `calcularProgresso(user, temInscricao)` e `TOTAL_ETAPAS` (9): alimenta o selo da sidebar e o card da Início.
- **`permissoesAdmin.js`** — `permissoesAdmin(admin)`: o que cada perfil do painel pode fazer nas telas de inscrição (espelho dos `[Authorize(Roles)]` da API; sessão sem `role` salvo é tratada como Admin).
- **`date.js`** — funções puras de data/hora: `converterDataUTCParaLocalSemMudarDia`, `formatarParaInputDate` e, sobrando do agendamento, `gerarHorariosParaDiasDisponiveis`/`formatarAgendamentoParaISO` (sem uso).
- **`form.js`** — `generateFormData(json)`: converte um objeto plano em `FormData` (usado nos payloads de login).
- **`general.js`** — `sleep(ms)`, `mergeObjects(target, source)` (merge profundo respeitando tipos, via lodash `cloneDeep`), `testState(current, model, optional)` (validação recursiva de preenchimento de um objeto de estado contra um "modelo" de campos obrigatórios).
- **`string.jsx`** — `formatarData(stringData)` (data curta via `toLocaleDateString`), `formatarComoHTML(texto)` (parseia string HTML com `DOMParser` e retorna `<span dangerouslySetInnerHTML>`), `corrigeURLVideo(url)` (normaliza links do YouTube — padrão `youtu.be` ou `youtube.com/watch` — para o formato `embed`, preservando `?list=`).

## Componentes locais de página

### `src/pages/app/subpages/inscricao/componentes/` (formulário de inscrição)

- **`input.jsx`** (`Input`) — célula `<td>` de tabela de formulário, componente genérico de campo:
  - **Props:** `as` (componente de input a renderizar, default `'input'`; usado com `IMaskInput` para campos mascarados), `name`, `children`, `ref`, demais props repassadas ao componente.
  - Usa `useFormContext()` para ler `errors` e exibir mensagem de erro (`encontraErro`, também exportado) acima do campo.
  - Inclui correção para o bug de autofill do navegador: escuta `onAnimationStart` de uma animação chamada `onAutoFillStart` (definida no CSS) e força `onChange` com o valor atual — necessário porque o Chrome não dispara eventos normais de input em autofill.
  - `encontraErro(errors, name)` — resolve erro de campo aninhado a partir de um `name` com notação de ponto (`"address.cep"` → `errors.address.cep`).

- **`anexoRG.jsx`** (`AnexoRG`) — campo de anexo da foto do RG, usado no passo 4 do wizard de inscrição.
- **Props:** `onMudanca(temAnexo)` — avisa o passo se já existe anexo, para liberar o "Salvar e avançar".
- O arquivo **sobe assim que é escolhido** (`POST /users/rg-document`), em requisição própria: o passo
  do wizard é enviado como JSON no `PUT /users/profile` e não comporta um arquivo.
- Valida o tamanho (4MB) no cliente antes de subir — é esse o limite efetivo; a API aceitaria até 15MB. O formato é validado pelo backend (JPG, PNG, HEIC ou PDF).
- Mostra prévia da imagem — do arquivo recém-escolhido ou, na primeira carga, baixando o anexo já
  enviado (`GET /users/rg-document`). PDF não gera prévia, só o rótulo "Documento anexado".
- Atualiza `user.rgInfo.hasDocument` no `local-storage` para que o passo continue liberado após um F5.
- Exibe o aviso de **"foto legível"**.


- **`formCursos.jsx`** (`FormularioCursos`) — último "passo" do fluxo de inscrição (fora do wizard de dados pessoais): seleção de 1ª e 2ª opção de curso + horário.
  - Carrega lista de cursos (`getCursos`) e, se o usuário já tiver inscrição (`getInscricao`), pré-popula os `Select`s com os cursos/horários já escolhidos e busca os horários correspondentes.
  - Regra de negócio: não permite que 1ª e 2ª opção sejam exatamente o mesmo par curso+horário — ao detectar conflito, limpa a opção conflitante e mostra erro inline (`erro`, exibido em linha própria da tabela).
  - **Lista da 1ª opção filtrada** por `getOpcoesPrimeiraOpcao` (`GET /enrollments/first-choice-options`): só cursos e períodos que o candidato consegue usar — mesmos critérios da validação. A 1ª opção já salva na inscrição continua visível mesmo se deixou de valer (o aviso de validação explica). Lista vazia mostra *"Nenhum curso está disponível para o seu perfil…"*; se o endpoint falhar, a lista não é filtrada.
  - **Lista da 2ª opção filtrada pela matriz de compatibilidade**: a cada 1ª opção (curso **e período**), chama `getOpcoesSegundaOpcao` e mostra só os cursos e períodos liberados (já filtrados pelo perfil do candidato — aluno interno/externo, nascimento, escolaridade). Antes de escolher o período da 1ª, a 2ª fica desabilitada. Conforme a linha da matriz: *obrigatória* (rótulo com asterisco, sem "Sem segunda opção"), *opcional* (oferece "Sem segunda opção") ou *não permitida* / nenhum curso liberado (campo desabilitado). O próprio curso da 1ª aparece como "(outro período)" quando a diagonal libera e ele tem outro período — e a lista de períodos da 2ª esconde o já escolhido. Se a 1ª muda e a 2ª escolhida deixa de ser permitida, a 2ª é limpa com aviso inline.
  - Inscrição inexistente (`GET my-enrollment` → 404) é tratada como "sem inscrição" (checa `status === 200`); antes o corpo do 404 era lido como inscrição e mostrava o aviso de "opções canceladas" para todo candidato novo.
  - **Aviso antecipado de incompatibilidade** (`avisoCompatibilidade`): a cada mudança de curso/horário (1ª ou 2ª opção), com debounce de 400ms, chama `validaEscolhasCurso` (`POST /enrollments/validate-choices`) — o backend roda a mesma validação de `POST /enrollments` sem persistir nada, então não há regra de compatibilidade duplicada em JS (existiu uma versão espelhada em `compatibilidadeCursos.js`, removida em favor deste endpoint). O aviso aparece como texto inline (mesma linha/estilo do `erro` de conflito, classe `.cursos-erro`) e desabilita "Concluir Inscrição" enquanto durar — cobre não só incompatibilidade de curso, mas qualquer outro motivo de rejeição do backend (RG não anexado, mensalidades em aberto, idade, etc.), já que roda o validador inteiro.
  - Traz um link "Conheça os cursos disponíveis" para `/cursos`, aberto em **nova aba** — navegar para fora descartaria o estado do wizard.
  - Ao confirmar (`criaInscricao`), dispara barra de progresso (`react-top-loading-bar`), toast de sucesso e navega para `/acompanhamento` após 1s.
  - Erros de negócio do backend (bloqueio por mensalidades em aberto, RG não anexado) chegam por toast via `callApi`, além do aviso inline antecipado acima. As duas travas de "não pode mais editar" (inscrição validada, pagamento confirmado) **não** são previstas pelo aviso antecipado — só aparecem no toast ao concluir.

- **`formDados.jsx`** — oito componentes de formulário, um por "passo" do wizard de inscrição, todos consumindo o mesmo `useFormContext()` compartilhado (via `FormProvider` em `Inscricao`) e recebendo `{ avancar, retornar }`. Alterar os campos de `FormularioNascimento` ou `FormularioEscolar` com curso já escolhido dispara, em `Inscricao`, a confirmação de cancelamento das opções de curso:
  - `FormularioDadosPessoais` — nome, telefone (máscara `+55 (00) 00000-0000`), gênero (`Select` com opções de `selects.js`).
  - `FormularioEndereco` — CEP (máscara, com `onBlur` disparando `getEnderecoCompleto` para autopreencher rua/bairro/cidade/UF via ViaCEP), rua, bairro, cidade, estado (máscara 2 letras maiúsculas), número, complemento (opcional).
  - `FormularioNascimento` — data, cidade, estado (máscara UF), país.
  - `FormularioRG` — CPF (máscara `000.000.000-00`), número do RG, data de emissão (validação `min` de `01/01/1900`), órgão emissor e o **anexo obrigatório** (`AnexoRG`). Como o anexo não é campo do `react-hook-form`, o passo mantém um estado próprio (`temAnexo`) e o botão "Salvar e avançar" checa esse estado antes de chamar `avancar([...])`.
  - `FormularioResponsavelPrimario` — dados da mãe (nome, e-mail, telefone, telefone secundário); campo `relationship` fixado/desabilitado como "Mãe" (`Select disabled`).
  - `FormularioResponsavelSecundario` — mesmos campos do responsável primário, mas `relationship` livre (lista `parentesco`).
  - `FormularioEscolar` — escola atual, série atual (`Select` com `escolaridades`), tipo de escola (`Select` com `tipoEscola`).
  - `FormularioInformacoesGerais` — como conheceu o instituto (`Select`), renda mensal familiar (campo mascarado como moeda BRL via `IMaskInput` com `mask={Number}`), pessoas em casa, pessoas trabalhando. Lê `statusVestibular` por `useOutletContext()` e, conforme as flags da edição ativa, acrescenta duas seções opcionais (desde 2026-10-12):
    - **Indicação** (`allowReferral`): `referral.name` (nome completo de quem indicou, até 100 caracteres) e `referral.cpf` (máscara `000.000.000-00`). Sem `required`; a validação é cruzada (`validate` + `deps`): preencheu um, exige o outro, e o CPF precisa ter 11 dígitos. Os dois campos entram na lista de `avancar([...])` só quando a seção existe.
    - **Cupom de desconto** (`allowCoupon`): renderiza `CupomDesconto`.
  - Cada formulário é uma `<table className="tabela-form">`; footer com botão "← Voltar" (exceto no primeiro passo) e "Salvar e avançar", que chama `avancar([...nomes dos campos])` — o componente pai valida (`methods.trigger`), grava o bloco do passo (`PUT /users/profile` parcial) e avança; no último passo, submete o perfil inteiro.

- **`cupomDesconto.jsx`** (`CupomDesconto({ somenteLeitura })`) — seção "Cupom de desconto" da etapa 8, como linhas de uma `tabela-form`. Estado próprio, **fora do `react-hook-form`**: o cupom não vai no `PUT /users/profile`.
  - Traz escrita a regra: *"O cupom vale apenas para quem nunca foi aluno do Instituto."*
  - Campo de código (em maiúsculas) + botão **Aplicar** → `aplicaCupom` (`POST /users/coupon`). A validação é toda do backend. Aceito: mostra o desconto (percentual ou valor) e a taxa — original riscada + valor final; com valor final zero avisa que não será preciso pagar. Recusado: mostra o motivo devolvido pela API, em linha, sem toast, e o cupom anterior (se havia) continua aplicado.
  - Com cupom aplicado o campo trava e aparece **Remover cupom** → `removeCupom`.
  - Ao montar, se `user.coupon.code` existe no `local-storage`, chama `getCupomAplicado` para recarregar o estado; cupom que deixou de valer aparece como aviso, ainda com a opção de remover.
  - Atualiza `user.coupon` no `local-storage` ao aplicar/remover. O único erro HTTP esperado (pagamento já confirmado, `400`) chega por toast.
  - Enter no campo aplica o cupom em vez de enviar o formulário. `somenteLeitura` (fase `>= 3`) desabilita campo e botões.

- **`padroes.js`** — objeto com a "forma"/valores-padrão (todos strings vazias) de todo o formulário de inscrição; usado como base para `mergeObjects` (preenche com dados já existentes do usuário) e como "modelo" para `testState` (validação de obrigatoriedade antes do submit final). A indicação (`referral`) **não** está aqui — é opcional e travaria o envio; `inscricao/index.jsx` a acrescenta só aos valores iniciais (`padroesIndicacao`).
- **`selects.js`** — arrays de opções estáticas usados pelos `Select`s do formulário: `genero`, `parentesco`, `comoConheceu` (Amigos, Família, Cônjuge, Filho/Filha, Ex-Aluno, Redes Sociais, Internet, Outro), `estadosBrasileiros` (não usado atualmente nos formulários, que preferem input mascarado de UF), `escolaridades`, `tipoEscola`.

### `src/pages/app/subpages/acompanhamento/components/`

- **`linhaTempo/linhaTempo.jsx`** (`Timeline`, exportado como default; arquivo/pasta chamados de "linhaTempo") — monta a timeline de 5 etapas do processo seletivo: **Cadastro criado → Inscrição preenchida → Pagamento → Prova presencial → Resultado e matrícula**. Recebe `dadosInscricao`, `pagamentoConfirmado` e `onPagamentoConfirmado` por prop e `statusVestibular` via `useOutletContext()`.
  - **Prova presencial** e **Resultado e matrícula** ficam com status `bloqueado` (conteúdo `EtapaBloqueada`) até o pagamento ser confirmado. O estado de confirmação vive no `Acompanhamento`, que também esconde a coluna lateral da prova enquanto não há pagamento.
  - A data de resultado vem de `dadosInscricao.resultPublicationDate` (**por candidato**), com fallback para a global de `/parameters` — quem não tem inscrição continua vendo a data geral.
  - A etapa "Prova presencial" recebe o status `dispensado` quando `isInternalStudent` é verdadeiro (a API só marca como interno quem não tem 2ª opção fora do inglês).
  - `TimelineItem` é o item visual de cada etapa; a classe vem do status normalizado sem acento (`status-concluido`, `status-aguardando`, `status-dispensado`).

- **`linhaTempo/dadosLinha.jsx`** — conteúdo de cada etapa (todos exportados nomeados):
  - `CadastroCriado` / `InscricaoPreenchida` — mensagens estáticas de sucesso.
  - `Pagamento({ pago, onConfirmado })` — cobrança PIX da taxa de inscrição. Ao montar, chama `geraCobrancaInscricao` (com toast: taxa não configurada ou provedor fora do ar chegam como mensagem da API, e a tela oferece "Tentar novamente"). Mostra a imagem do QR code (`qrCodeImageUrl`, escondida se não carregar) e o código copia-e-cola com botão "Copiar" (`navigator.clipboard`, com fallback por toast pedindo cópia manual em contextos sem permissão).
    - Enquanto pendente, chama `getStatusPagamentoInscricao` logo ao carregar e depois a cada 5s — o provedor não tem webhook, então é essa consulta que confirma o pagamento. Também há o botão "Já paguei — verificar pagamento" para consultar na hora.
    - Cobrança vencida, recusada ou cancelada na consulta → pede outra ao backend automaticamente.
    - Confirmado, chama `onConfirmado(true)`: a etapa é concluída e as seguintes são liberadas sem recarregar a página.
    - **Cupom de desconto**: cobrança com `couponCode` mostra a linha "Cupom X aplicado" com o valor original riscado, o valor com desconto e o desconto; `couponNotice` (cupom que deixou de valer na emissão) aparece como aviso. Quando o cupom zera a taxa, a API devolve a inscrição já paga **sem `correlationId`** — a resposta é aceita pelo `status === 2`, a etapa conclui na hora e o texto vira "Taxa de inscrição quitada pelo cupom X — não é preciso pagar". (Antes de 2026-10-12 uma resposta sem `correlationId` era tratada como falha.)
  - `ProvaPresencial({ realizado, dadosInscricao })` — ramifica por `isInternalStudent`: aluno interno vê a mensagem de nivelamento no próprio curso; externo vê endereço, data e o aviso de que horário e sala chegam por e-mail em `roomNoticeEmailDate`.
  - `ResultadoMatricula({ realizado, dataPublicacao, urlResultado, mostrarUrl })` — mostra link do resultado quando disponível, ou data prevista de divulgação (e link antecipado se `mostrarUrl` estiver habilitado pelo backend).
  - Todas usam `converterDataUTCParaLocalSemMudarDia` para exibir datas.

> O modal de agendamento `selecionaDatas/` (`SeletorDeAgendamento`) foi **removido** do
> repositório. Do agendamento restam só o serviço `api/services/agendamento.js` e duas funções em
> `util/date.js`, sem uso, e os endpoints na API.

### `src/pages/admin/`

Área administrativa, com sessão própria (`adminToken`/`admin` no `local-storage`) e layout `AdminApp` + `AdminSidebar`. Páginas: `login`, `bootstrap`, `trocar-senha`, `dashboard`, `inscricoes` (+ `detalhes`), `contas`, `cursos` (+ `form`), `compatibilidades`, `faq` (+ `form`), `vestibular` (+ `form`), `cupons` (+ `form`), `importacoes`, `relatorios/financeiro` e `administradores`. O `AdminApp` redireciona por perfil (Secretaria, Financeiro) e por `mustChangePassword` — ver `architecture.md`.

- **`dashboard/index.jsx`** (`AdminDashboard`) — saudação, atalhos e estatísticas da edição ativa (`GET /admin/enrollments/dashboard`): totais, por status, gráfico de inscrições por dia e gráfico empilhado por curso × período com alternância **Todos / Pagos** (`paidCount`). Só Admin chega aqui.
- **`administradores/index.jsx`** (`AdminUsuarios`) — lista os administradores (perfil, situação, "troca de senha pendente", último acesso), reseta a senha de um deles (a nova é exibida uma única vez, com "Copiar") e cria administradores escolhendo o **perfil** (Admin, Financeiro, Secretaria).
- **`trocar-senha/index.jsx`** (`AdminTrocarSenha`) — troca obrigatória da senha do próprio admin depois de um reset (`POST /admin/auth/change-password`).
- **`relatorios/financeiro/index.jsx`** (`AdminRelatorioFinanceiro`) — filtros nome, de e até (obrigatórios, padrão hoje); tabela com protocolo, candidato, opções de curso, data/valor/tipo do pagamento e **Cupom** (código e desconto; vai também para o Excel); "Exportar para Excel" com `write-excel-file`, importado sob demanda.
- **`relatorios/indicacoes/index.jsx`** (`AdminRelatorioIndicacoes`) — relatório de indicações (`GET /admin/reports/referrals`), carregado ao abrir. Tabela com cabeçalho em duas linhas (grupos **Indicado** e **Quem indicou**, separados por um filete), protocolo como link para o detalhe da inscrição, datas e `Situacao`. Cartões de resumo, busca e "Exportar para Excel" (uma coluna por dado, sem agrupar).
- **`relatorios/cupons/index.jsx`** (`AdminRelatorioCupons`) — relatório de cupons (`GET /admin/reports/coupons`), carregado ao abrir: valor cheio, desconto, valor com desconto e valor pago por inscrição; cartões de resumo calculados sobre as inscrições pagas; filtros de busca e de código do cupom; exportação para Excel.
- **`relatorios/situacao.jsx`** (`Situacao({ status, pagamento })`), **`relatorios/util.js`** (rótulos de status, formatadores de moeda/data/CPF, `exportarExcel`) e **`relatorios/_relatorio.scss`** (mixin `relatorio-page`) — compartilhados pelos dois relatórios acima; o financeiro mantém os seus.
- **`contas/index.jsx`** (`AdminContas`) — lista paginada das contas de candidatos (coleção `users`), com busca por nome, e-mail ou CPF, situação (ativa/inativa) e protocolo da inscrição mais recente. "Ver dados" abre o **`ModalConta`** (`contas/modalConta.jsx`): situação da conta, lista de inscrições (cada uma com "Ver inscrição"), **históricos de e-mail e de CPF**, todos os dados cadastrais e três ações — **Trocar e-mail de login**, **Trocar CPF** (aceita qualquer valor, de propósito) e **Resetar senha** (em branco gera uma aleatória, mostrada uma vez). Cada troca pede confirmação e recarrega o modal e a lista. Fecha com Esc, clique fora ou o botão ×.
- **`componentes/dadosCandidato.jsx`** (`DadosCandidato({ candidato, podeVerAnexoRg })`, `Info`) — seções só leitura com os dados da conta (pessoais, endereço, nascimento, RG, responsáveis, escolaridade, informações gerais e **"Indicação e cupom"** — quem indicou, CPF de quem indicou formatado, cupom aplicado e quando; sempre visível, mesmo com as flags da edição desligadas), usadas pelo detalhe da inscrição e pelo modal de contas. Os estilos base de `.secao-inscricao`, `.grade-info` e `.info` moram aqui.

- **`compatibilidades/index.jsx`** (`AdminCompatibilidades`) — matriz de compatibilidade entre cursos: **linhas = 1ª opção**, **colunas = 2ª opção** (nomes na vertical, código em mono), primeira coluna e cabeçalho fixos na rolagem. Célula liberada em azul-tinta (✓), liberada com condição em areia, bloqueada em branco; a **diagonal** (listrada) é o mesmo curso em outro período. Cada linha tem o seletor de obrigatoriedade da 2ª opção (*Obrigatória / Opcional / Não permitida* — esta desabilita a linha) e atalhos "todas / nenhuma"; curso sem linha aparece como "Não configurado — bloqueado como 1ª opção".
  - A matriz tem a largura exata das colunas; ao lado fica o **painel lateral** (sticky) com legenda, editor da célula e Salvar/Descartar. Sem espaço para os dois, o painel desce para baixo da matriz.
  - Clique seleciona a célula (destaca linha e coluna) e abre o editor: flags **Aluno interno** / **Aluno externo** (nenhuma = bloqueada) e, por período do curso da 1ª opção, nascido de/até, escolaridade mínima e os períodos da 2ª opção habilitados — valores iniciais do cadastro do curso da 1ª opção. Célula com restrição fica em areia com `I` (só interno), `E` (só externo) ou `✓` (condições por período). Duplo clique ou Espaço liberam/bloqueiam direto; setas andam pela matriz.
  - Edição local até "Salvar alterações", que envia só as linhas alteradas (`PUT /admin/compatibilities`); "Descartar" volta ao salvo, e fechar a aba com alteração pendente pede confirmação (`beforeunload`).
- **`importacoes/index.jsx`** (`AdminImportacoes`) — envio dos três CSVs: **Alunos matriculados** (`nr_ano, id_aluno, ds_cpf, ds_rg, id_curso`), **Alunos inadimplentes** (`nr_ano, id_aluno, ds_cpf, ds_rg, id_curso, nm_curso, qtd_pendentes`) e **Ex-Alunos** (`nm_aluno, ds_cpf, ds_email, nm_responsavel, ds_endereco, ds_bairro, id_curso, nr_ano` — obrigatórias as duas primeiras; `id_curso`/`nr_ano` são o curso e o ano cursados; um registro por CPF, valendo a última linha do arquivo; desde 2026-10-12). Cada bloco (`CartaoImportacao`) mostra as colunas esperadas, o efeito da importação, o total de registros na base e a data do último lote, e exibe o resultado com as linhas recusadas e o motivo (limitado a 20 na tela). Matriculados e inadimplentes substituem **só os anos presentes no arquivo**; a de ex-alunos não tem ano e é um **upsert pelo CPF** (atualiza quem existe, inclui quem é novo, não remove quem não veio) — o cartão diz isso. Não há mais cartão destrutivo (o ramo `config.destrutivo` do componente ficou sem uso depois que a importação de pagamentos de mensalidade saiu).
- **`importacoes/registros.jsx`** (`RegistrosImportados`) + **`registroForm.jsx`** (`RegistroForm`) — abaixo dos cartões, abas **Matrículas**, **Inadimplentes** e **Ex-Alunos** com a lista paginada dos registros importados, filtros por ano (padrão: ano da edição ativa − 1), CPF, RG e — nos inadimplentes — nome, com debounce. "Novo registro", "Editar" (formulário no modal global) e "Remover". A aba Ex-Alunos (`semAno` na configuração do tipo) busca só por **nome e CPF**, não envia ano nem RG, e tem tabela própria: nome completo, CPF, e-mail, responsável, endereço e bairro; no formulário só nome e CPF são obrigatórios (campos com `opcional: true`).
- **`inscricoes/index.jsx`** (`AdminInscricoes`) — lista paginada com busca e filtro de status; o filtro tem também **"Pendente pagamento"** (vira `pendingPayment=true` na API: não canceladas e não pagas). Mostra a situação do pagamento de cada linha. Cada linha não paga e não cancelada tem **"Verificar pagamento"**, que força a consulta da cobrança no provedor (`POST /admin/enrollments/{id}/payment/refresh`), avisa o resultado por toast e recarrega a lista. O ícone de olho mostra uma **prévia do anexo do RG** ao lado da tabela (hover, ou clique para fixar; as URLs de objeto ficam em cache até sair da tela). **"Gerar Relatório"** baixa todas as linhas do filtro atual (`GET /admin/enrollments/report`) e monta o Excel no navegador. As ações seguem `permissoesAdmin`: Financeiro só consulta e abre os detalhes.
- **`inscricoes/detalhes/index.jsx`** — dados da inscrição, `EscolhasCurso`, `Pagamento`, `ResetarSenha`, `RemoverInscricao` e `DadosCandidato`; cada bloco aparece conforme `permissoesAdmin(admin)`. O `AnexoRGCandidato` (dentro de `DadosCandidato`) baixa o anexo do RG como blob (o endpoint exige o Bearer de admin, então um `<a href>` direto não funcionaria) e o abre em nova aba, revogando a URL de objeto depois.
  - **`EscolhasCurso({ inscricao, aoAtualizar })`** — mostra a 1ª/2ª opção de curso e período e,
    sob demanda ("Editar opções de curso"), permite trocá-las. Reaproveita a mesma UX de
    `FormularioCursos` (candidato): busca a lista de cursos do admin (`listarCursos`, que já traz
    `availablePeriods` embutido — sem chamada extra de horários), filtra a 1ª opção por
    `getOpcoesPrimeiraOpcaoAdmin` e recalcula a 2ª a cada troca da 1ª via
    `getOpcoesSegundaOpcaoAdmin` (debounce não é necessário aqui — não há aviso antecipado de
    incompatibilidade, só o erro real do backend ao salvar). Ao salvar, chama
    `atualizarEscolhasCurso` (`PUT /admin/enrollments/{id}/choices`), que roda a mesma validação do
    formulário do candidato mas funciona mesmo com a inscrição já validada ou paga — ver
    `nsf-app-v3/specs/features-usecases.md` seção 15. Só o perfil Admin edita (`somenteConsulta`
    para os demais).
  - **`Pagamento`** — mostra situação, valor, vencimento, data e forma do pagamento ("Cupom" quando o cupom zerou a taxa) e, quando há cupom na cobrança, **Cupom**, **Taxa original** e **Desconto do cupom**; `couponRejection` (cupom do candidato que não valia mais na emissão) aparece como aviso. No pagamento manual, valor em branco usa a taxa já com o desconto do cupom. Ações:
    **remover as informações de pagamento** (Admin/Secretaria — o candidato recebe uma cobrança
    nova ao reabrir o Acompanhamento), **registrar pagamento manual** (Admin/Financeiro — forma
    obrigatória entre Pix, Dinheiro, Cartão de débito, Cartão de crédito, Transferência e Outro;
    valor e data opcionais; oculto para inscrição já paga, cancelada ou sem curso) e **reenviar o
    e-mail de confirmação** (Admin/Secretaria, só com pagamento confirmado; avisa quem recebeu e
    quem falhou).
  - **`RemoverInscricao`** — "zona de perigo": apaga a inscrição do banco, com confirmação
    (Admin/Secretaria). A conta do candidato fica.
- **`faq/form/index.jsx`** — além de pergunta/resposta/ordem, edita a **`key`** (slug validado por `^[a-z0-9-]*$`) usada nos links diretos e no quadro "Informações gerais" da Início.
- **`cupons/index.jsx`** (`AdminCupons`) + **`cupons/form/index.jsx`** (`AdminCupomForm`, `padroes.js`) — CRUD de cupons de desconto, no molde das telas de FAQ (só Admin; desde 2026-10-12). Lista: código, descrição, desconto (`10%` ou `R$ 20,00`), validade, usos (`3 de 50`), status, **Editar** e **Desativar** (soft-delete, com confirmação). Formulário: código (a API grava em maiúsculas e sem espaços; travado depois que o cupom já foi usado), descrição, **tipo de desconto** (Percentual ou Valor fixo — `discountType` 1/2), valor (percentual até 100; o rótulo e a ajuda mudam com o tipo), validade inicial/final opcionais, limite de usos opcional (mostra os usos até agora) e "Cupom ativo". Datas vão como `AAAA-MM-DDT00:00:00.000Z`, como no formulário da edição.
- **`vestibular/form/index.jsx`** — edita as datas da edição, incluindo **resultado do candidato externo** em curso de continuidade e **data do e-mail com horário e sala**, os dados da cobrança PIX — **ano da edição** (compõe o correlationID `insfvest_{ano}{protocolo}`) e **taxa de inscrição**, ambos obrigatórios —, o interruptor **"Permitir novas inscrições nesta edição"**, os checkboxes **"Permite indicação"** e **"Permite cupom"** (`allowReferral`/`allowCoupon`, desligados por padrão — ligam as seções da etapa 8 do candidato e a regra correspondente na API) e a lista de **e-mails de teste** (logam e se inscrevem mesmo com o interruptor desligado). "Tornar esta a edição ativa" desativa as demais.
- **`cursos/form/index.jsx`** — além dos dados do curso, períodos e disciplinas: faixa de nascimento (obrigatória), **ordem de exibição** e o bloco **"E-mail de confirmação de inscrição"** (período de matrícula, início das aulas, número e valor das parcelas).
- **`cursos/form/capaCurso.jsx`** (`CapaCurso`) — capa do curso: prévia (baixada como blob de `GET /courses/{id}/image`, endpoint anônimo, reaproveitado aqui mesmo dentro do admin) + upload (`POST /admin/courses/{id}/image`, próprio serviço `enviarImagemCurso`), mesmo padrão upload-ao-escolher do `anexoRG.jsx`. Como o upload depende de um curso já existir, fica desabilitado em "Novo curso" até o primeiro salvamento — que, só nesse caso (criação), navega para a edição do curso recém-criado em vez da listagem, para liberar o envio da capa. O campo de texto livre "Identificador da imagem" que existia antes foi removido do formulário visível (vira um input oculto sincronizado via `setValue`, só para manter o valor no payload do `PUT`).

## Componentes de página (top-level, um por rota)

Não são "componentes reutilizáveis" no sentido estrito, mas compõem a UI de cada tela — documentados com mais detalhe de fluxo/regra de negócio em `features-usecases.md`:

- `App` (`pages/app`) — shell do portal: com sessão, sidebar + header + outlet, carregando o status do vestibular; sem sessão, só nas rotas públicas (`/cursos` e `/cursos/:id`), o layout de visitante (`CabecalhoPublico` + outlet, classe `shell publico`). Fora delas, sem sessão, redireciona para `/login`.
- `Inicio` (`pages/app/subpages/inicio`) — boas-vindas, alerta "Falta escolher seu curso", card "Vestibular {ano}" com progresso e botão conforme a situação (continuar inscrição / fazer pagamento / ver acompanhamento), card de datas, vídeo de apresentação (pré-requisito da inscrição), "Informações gerais", ações rápidas e as 3 primeiras dúvidas frequentes.
- `Cursos` (`pages/app/subpages/cursos`) — catálogo público: faixa de abertura com o total de cursos, chips de filtro com contagem (`filtrarCursos`: por tipo, mais o filtro especial "Inglês" pelo nome) e grade de `CardCurso` (interno). O card usa `<img loading="lazy">` com `urlImagemCurso(imageId)` — sem blob —, é focável (`role="link"`, Enter) e recebe `--ordem` para a animação de entrada em sequência. `CardCursoEsqueleto` enquanto a lista carrega.
- `DetalhesCurso` (`pages/app/subpages/cursos/detalhes`) — ficha do curso: capa com foto e nome, faixa de dados-chave (`<dl class="fatos">`: carga horária, idade, escolaridade mínima, mensalidade), visão geral, mercado de trabalho (opcional) e o cartão de inscrição sticky com os períodos ativos e o botão; em telas ≤960px, barra de inscrição fixa no rodapé. O botão leva a `/inscricao` ou, sem token, a `/login`. Trata curso não encontrado.
- `FAQ` (`pages/app/subpages/faq`) — página dedicada, reaproveita `AcordeaoPerguntas` sem limite.
- `Inscricao` (`pages/app/subpages/inscricao`) — orquestra o wizard de formulário de dados pessoais + seleção de curso.
- `Acompanhamento` (`pages/app/subpages/acompanhamento`) — protocolo, resumo da inscrição (1ª/2ª opção) + `Timeline` + coluna lateral da prova (só para externo e depois do pagamento). Trata os estados "sem inscrição" e "opções de curso canceladas".
- `Login`, `Cadastro`, `RecuperarSenha`, `TrocarSenha`, `TrocarSenhaObrigatoria` (`pages/login`, `pages/cadastro`, `pages/recuperar-senha`, `pages/trocar-senha`, `pages/trocar-senha-obrigatoria`) — telas de autenticação, todas com o mesmo layout de dois painéis (`PainelInstitucional` + formulário).
