import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import { getCompatibilidades, salvarCompatibilidades } from "../../../api/services/admin/compatibilidades";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

// Mesmos valores do enum SecondChoiceRequirement da API.
const OBRIGATORIEDADES = [
  { valor: 1, rotulo: "Obrigatória" },
  { valor: 2, rotulo: "Opcional" },
  { valor: 3, rotulo: "Não permitida" },
];
const NAO_PERMITIDA = 3;

// Datas vêm da API em ISO (UTC); o <input type="date"> trabalha com "aaaa-mm-dd".
const paraInput = iso => (iso ? iso.slice(0, 10) : "");
const paraApi = valor => (valor ? `${valor}T00:00:00Z` : null);

// Linha da API → estado local, com as células indexadas pelo código do curso da 2ª opção.
// Guarda também o que é de curso/período inativo (fora da tela), para não apagar ao salvar.
function paraEstado(rows) {
  const linhas = {};
  for (const row of rows) {
    linhas[row.firstCourseCode] = {
      obrigatoriedade: row.secondChoiceRequirement,
      celulas: Object.fromEntries(row.allowedSecondChoices.map(c => [c.courseCode, {
        courseCode: c.courseCode,
        allowInternal: c.allowInternal,
        allowExternal: c.allowExternal,
        condicoes: Object.fromEntries(c.periodRules.map(p => [p.firstPeriodCode, {
          inicio: paraInput(p.earliestBirthDate),
          fim: paraInput(p.latestBirthDate),
          escolaridade: p.minSchoolLevel ?? "",
          periodosDesabilitados: p.disabledSecondPeriodCodes,
        }])),
      }])),
    };
  }
  return linhas;
}

// Valores do cadastro do curso da 1ª opção — iniciais para período sem condição salva.
function condicaoDoCadastro(curso) {
  return {
    inicio: paraInput(curso.defaultEarliestBirthDate),
    fim: paraInput(curso.defaultLatestBirthDate),
    escolaridade: curso.defaultMinSchoolLevel ?? "",
    periodosDesabilitados: [],
  };
}

function condicaoDoPeriodo(celula, primeiro, periodo) {
  return celula.condicoes[periodo] ?? condicaoDoCadastro(primeiro);
}

function linhaParaApi(codigo, linha, primeiro) {
  return {
    firstCourseCode: codigo,
    secondChoiceRequirement: linha.obrigatoriedade,
    allowedSecondChoices: Object.values(linha.celulas).map(celula => {
      // Materializa os valores do cadastro nos períodos visíveis, para o que está na tela ser o
      // que fica salvo. Período sem as duas datas fica de fora (a API usa o cadastro do curso).
      const condicoes = { ...celula.condicoes };
      for (const periodo of primeiro?.periods ?? [])
        condicoes[periodo.code] ??= condicaoDoCadastro(primeiro);

      return {
        courseCode: celula.courseCode,
        allowInternal: celula.allowInternal,
        allowExternal: celula.allowExternal,
        periodRules: Object.entries(condicoes)
          .filter(([, c]) => c.inicio && c.fim)
          .map(([periodo, c]) => ({
            firstPeriodCode: Number(periodo),
            earliestBirthDate: paraApi(c.inicio),
            latestBirthDate: paraApi(c.fim),
            minSchoolLevel: c.escolaridade || null,
            disabledSecondPeriodCodes: c.periodosDesabilitados,
          })),
      };
    }),
  };
}

// Célula com alguma condição além de "liberada para todos, como no cadastro".
function temRestricao(celula, primeiro) {
  if (!celula.allowInternal || !celula.allowExternal) return true;
  const padrao = condicaoDoCadastro(primeiro);
  return Object.values(celula.condicoes).some(c =>
    c.periodosDesabilitados.length > 0 || c.escolaridade || c.inicio !== padrao.inicio || c.fim !== padrao.fim);
}

function simboloCelula(celula) {
  if (celula.allowInternal && !celula.allowExternal) return "I";
  if (!celula.allowInternal && celula.allowExternal) return "E";
  return "✓";
}

function descreveCelula(celula, primeiro) {
  const partes = [];
  if (!celula.allowExternal) partes.push("só alunos internos");
  if (!celula.allowInternal) partes.push("só alunos externos");
  if (celula.allowInternal && celula.allowExternal && temRestricao(celula, primeiro)) partes.push("com condições por período");
  return partes.length ? `liberada (${partes.join(", ")})` : "liberada";
}

const CELULA_NOVA = codigo => ({ courseCode: codigo, allowInternal: true, allowExternal: true, condicoes: {} });

// Linha ainda não configurada: tudo bloqueado. Ao ser editada, nasce com 2ª opção obrigatória.
const LINHA_NOVA = { obrigatoriedade: 1, celulas: {} };

export default function AdminCompatibilidades() {
  const [cursos, setCursos] = useState(null);
  const [escolaridades, setEscolaridades] = useState([]);
  const [cursosContinuidade, setCursosContinuidade] = useState([]);
  const [salvas, setSalvas] = useState({});
  const [linhas, setLinhas] = useState({});
  const [alteradas, setAlteradas] = useState(new Set());
  const [selecionada, setSelecionada] = useState(null); // { linha, coluna|null } — códigos de curso
  const [salvando, setSalvando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  // Evita perder a matriz editada ao fechar ou recarregar a aba.
  useEffect(() => {
    if (alteradas.size === 0) return;

    const avisar = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [alteradas]);

  function aplicarMatriz(matriz) {
    const estado = paraEstado(matriz.rows);
    setCursos(matriz.courses);
    setEscolaridades(matriz.schoolLevels);
    setCursosContinuidade(matriz.continuityCourseCodes);
    setSalvas(estado);
    setLinhas(estado);
    setAlteradas(new Set());
  }

  async function carregar() {
    const r = await callApi(getCompatibilidades, true);
    if (!r) {
      navigate("/admin/login");
      return;
    }
    aplicarMatriz(r);
  }

  function alterarLinha(codigo, alterar) {
    setLinhas(atuais => ({ ...atuais, [codigo]: alterar(atuais[codigo] ?? LINHA_NOVA) }));
    setAlteradas(atuais => new Set(atuais).add(codigo));
  }

  function mudarObrigatoriedade(codigo, valor) {
    alterarLinha(codigo, linha => ({ ...linha, obrigatoriedade: Number(valor) }));
  }

  function mudarCelula(linhaCodigo, colunaCodigo, alterar) {
    if ((linhas[linhaCodigo] ?? LINHA_NOVA).obrigatoriedade === NAO_PERMITIDA) return;

    alterarLinha(linhaCodigo, linha => {
      const celulas = { ...linha.celulas };
      const nova = alterar(celulas[colunaCodigo]);

      // Sem nenhum perfil marcado a célula é bloqueada — some da linha.
      if (!nova || (!nova.allowInternal && !nova.allowExternal)) delete celulas[colunaCodigo];
      else celulas[colunaCodigo] = nova;

      return { ...linha, celulas };
    });
  }

  function alternarCelula(linhaCodigo, colunaCodigo) {
    mudarCelula(linhaCodigo, colunaCodigo, atual => (atual ? null : CELULA_NOVA(colunaCodigo)));
  }

  function mudarPerfil(linhaCodigo, colunaCodigo, campo, marcado) {
    mudarCelula(linhaCodigo, colunaCodigo, atual => {
      const base = atual ?? { ...CELULA_NOVA(colunaCodigo), allowInternal: false, allowExternal: false };
      return { ...base, [campo]: marcado };
    });
  }

  function mudarCondicao(linhaCodigo, colunaCodigo, periodo, campo, valor) {
    const primeiro = cursos.find(c => c.code === linhaCodigo);
    mudarCelula(linhaCodigo, colunaCodigo, atual => ({
      ...atual,
      condicoes: {
        ...atual.condicoes,
        [periodo]: { ...condicaoDoPeriodo(atual, primeiro, periodo), [campo]: valor },
      },
    }));
  }

  function alternarPeriodoSegunda(linhaCodigo, colunaCodigo, periodo, segundoPeriodo, habilitado) {
    const primeiro = cursos.find(c => c.code === linhaCodigo);
    mudarCelula(linhaCodigo, colunaCodigo, atual => {
      const condicao = condicaoDoPeriodo(atual, primeiro, periodo);
      const semEste = condicao.periodosDesabilitados.filter(p => p !== segundoPeriodo);
      return {
        ...atual,
        condicoes: {
          ...atual.condicoes,
          [periodo]: { ...condicao, periodosDesabilitados: habilitado ? semEste : [...semEste, segundoPeriodo] },
        },
      };
    });
  }

  function restaurarCadastro(linhaCodigo, colunaCodigo) {
    mudarCelula(linhaCodigo, colunaCodigo, atual => ({ ...atual, condicoes: {} }));
  }

  function liberarLinhaInteira(codigo, liberar) {
    alterarLinha(codigo, linha => {
      const celulas = { ...linha.celulas };
      for (const curso of cursos) {
        if (liberar && !celulas[curso.code]) celulas[curso.code] = CELULA_NOVA(curso.code);
        if (!liberar) delete celulas[curso.code];
      }
      return { ...linha, celulas };
    });
  }

  function descartar() {
    if (!confirm("Descartar as alterações não salvas?")) return;
    setLinhas(salvas);
    setAlteradas(new Set());
  }

  async function salvar() {
    const cursoPorCodigo = Object.fromEntries(cursos.map(c => [c.code, c]));
    const payload = [...alteradas].map(codigo => linhaParaApi(codigo, linhas[codigo], cursoPorCodigo[codigo]));

    const datasInvertidas = payload.some(l => l.allowedSecondChoices.some(c =>
      c.periodRules.some(p => p.earliestBirthDate > p.latestBirthDate)));

    if (datasInvertidas) {
      toast.error("Há período com a data de nascimento inicial depois da final.");
      return;
    }

    setSalvando(true);
    const r = await callApi(salvarCompatibilidades, true, payload);
    setSalvando(false);

    if (r) {
      aplicarMatriz(r);
      toast.success("Compatibilidades salvas.");
    }
  }

  // Setas movem a seleção pela matriz; Espaço libera/bloqueia a célula em foco.
  function teclaNaCelula(e, linhaIdx, colunaIdx) {
    const movimentos = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

    if (e.key === " ") {
      e.preventDefault();
      alternarCelula(cursos[linhaIdx].code, cursos[colunaIdx].code);
      return;
    }

    const movimento = movimentos[e.key];
    if (!movimento) return;

    e.preventDefault();
    const l = Math.min(Math.max(linhaIdx + movimento[0], 0), cursos.length - 1);
    const c = Math.min(Math.max(colunaIdx + movimento[1], 0), cursos.length - 1);
    setSelecionada({ linha: cursos[l].code, coluna: cursos[c].code });
    document.getElementById(`celula-${l}-${c}`)?.focus();
  }

  const cursoPorCodigo = useMemo(
    () => Object.fromEntries((cursos ?? []).map(c => [c.code, c])),
    [cursos]);

  if (!cursos)
    return <div className="admin-compatibilidades"><Carregamento /></div>;

  return (
    <div className="admin-compatibilidades">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Compatibilidades</h1>
        </div>
      </div>

      <p className="instrucoes">
        <strong>Linhas</strong> são a 1ª opção do candidato; <strong>colunas</strong>, a 2ª. Uma
        célula liberada permite aquela combinação — o resto fica bloqueado, inclusive curso novo,
        até ser configurado aqui. A <strong>diagonal</strong> (o curso com ele mesmo) libera o
        mesmo curso em outro período. O seletor de cada linha diz se a 2ª opção é obrigatória,
        opcional ou não permitida para aquele curso.
      </p>

      <div className="matriz-layout">
        <div className="matriz-rolagem">
          <table className="matriz">
            <thead>
              <tr>
                <th className="canto">
                  <span className="eixo-coluna">2ª opção →</span>
                  <span className="eixo-linha">1ª opção ↓</span>
                </th>
                {cursos.map(curso => (
                  <th
                    key={curso.code}
                    scope="col"
                    className={"cabecalho-coluna" + (selecionada?.coluna === curso.code ? " destacado" : "")}
                    title={curso.name}
                  >
                    <span className="nome-vertical">{curso.name}</span>
                    <span className="codigo">{curso.code}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cursos.map((linhaCurso, linhaIdx) => {
                const configurada = !!linhas[linhaCurso.code];
                const linha = linhas[linhaCurso.code] ?? LINHA_NOVA;
                const semSegunda = linha.obrigatoriedade === NAO_PERMITIDA;

                return (
                  <tr key={linhaCurso.code} className={semSegunda ? "sem-segunda" : ""}>
                    <th
                      scope="row"
                      className={"cabecalho-linha" + (selecionada?.linha === linhaCurso.code ? " destacado" : "")}
                    >
                      <div className="nome-linha">
                        <span className="codigo">{linhaCurso.code}</span>
                        <span className="nome" title={linhaCurso.name}>{linhaCurso.name}</span>
                        {alteradas.has(linhaCurso.code) && <span className="alterada" title="Alteração não salva">•</span>}
                      </div>
                      {!configurada &&
                        <p className="nao-configurada">Não configurado — bloqueado como 1ª opção</p>
                      }
                      <div className="controles-linha">
                        <select
                          aria-label={`Segunda opção para ${linhaCurso.name}`}
                          value={configurada ? linha.obrigatoriedade : ""}
                          onChange={e => mudarObrigatoriedade(linhaCurso.code, e.target.value)}
                        >
                          {!configurada && <option value="" disabled>Configurar…</option>}
                          {OBRIGATORIEDADES.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                        </select>
                        {!semSegunda &&
                          <span className="atalhos-linha">
                            <button type="button" onClick={() => liberarLinhaInteira(linhaCurso.code, true)}>todas</button>
                            <button type="button" onClick={() => liberarLinhaInteira(linhaCurso.code, false)}>nenhuma</button>
                          </span>
                        }
                      </div>
                    </th>

                    {cursos.map((colunaCurso, colunaIdx) => {
                      const celula = linha.celulas[colunaCurso.code];
                      const diagonal = linhaCurso.code === colunaCurso.code;
                      const selecionadaAqui = selecionada?.linha === linhaCurso.code && selecionada?.coluna === colunaCurso.code;
                      const liberada = celula && !semSegunda;

                      const classes = ["celula"];
                      if (diagonal) classes.push("diagonal");
                      if (liberada) classes.push(temRestricao(celula, linhaCurso) ? "condicional" : "liberada");
                      if (selecionadaAqui) classes.push("selecionada");

                      const situacao = semSegunda ? "sem 2ª opção" : !celula ? "bloqueada" : descreveCelula(celula, linhaCurso);

                      return (
                        <td key={colunaCurso.code}>
                          <button
                            type="button"
                            id={`celula-${linhaIdx}-${colunaIdx}`}
                            className={classes.join(" ")}
                            disabled={semSegunda}
                            title={`${linhaCurso.name} → ${diagonal ? "outro período do mesmo curso" : colunaCurso.name}: ${situacao}`}
                            aria-label={`1ª opção ${linhaCurso.name}, 2ª opção ${diagonal ? "mesmo curso em outro período" : colunaCurso.name}: ${situacao}`}
                            aria-pressed={!!celula}
                            onClick={() => setSelecionada({ linha: linhaCurso.code, coluna: colunaCurso.code })}
                            onDoubleClick={() => alternarCelula(linhaCurso.code, colunaCurso.code)}
                            onKeyDown={e => teclaNaCelula(e, linhaIdx, colunaIdx)}
                          >
                            {liberada ? simboloCelula(celula) : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="painel-lateral">

          {!selecionada &&
            <p className="editor-vazio">Selecione uma célula para liberar a combinação e definir condições.</p>
          }

          {selecionada &&
            <EditorCelula
              primeiro={cursoPorCodigo[selecionada.linha]}
              segundo={cursoPorCodigo[selecionada.coluna]}
              linha={linhas[selecionada.linha] ?? LINHA_NOVA}
              escolaridades={escolaridades}
              continuidade={cursosContinuidade.includes(selecionada.linha)}
              onPerfil={(campo, marcado) => mudarPerfil(selecionada.linha, selecionada.coluna, campo, marcado)}
              onCondicao={(periodo, campo, valor) => mudarCondicao(selecionada.linha, selecionada.coluna, periodo, campo, valor)}
              onPeriodoSegunda={(periodo, segundo, habilitado) => alternarPeriodoSegunda(selecionada.linha, selecionada.coluna, periodo, segundo, habilitado)}
              onRestaurar={() => restaurarCadastro(selecionada.linha, selecionada.coluna)}
            />
          }

          <div className="acoes-salvar">
            <span className="contagem">
              {alteradas.size === 0 ? "Nenhuma alteração" : `${alteradas.size} ${alteradas.size === 1 ? "linha alterada" : "linhas alteradas"}`}
            </span>
            <div className="botoes">
              <button type="button" className="btn-fantasma" disabled={alteradas.size === 0 || salvando} onClick={descartar}>
                Descartar
              </button>
              <button type="button" className="btn-primario" disabled={alteradas.size === 0 || salvando} onClick={salvar}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </div>
          <details className="bloco-legenda" open>
            <summary className="titulo-bloco">Legenda</summary>
            <ul className="legenda">
              <li><span className="amostra liberada">✓</span> Liberada para todos</li>
              <li><span className="amostra condicional">I</span> Só alunos internos</li>
              <li><span className="amostra condicional">E</span> Só alunos externos</li>
              <li><span className="amostra condicional">✓</span> Liberada com condições por período</li>
              <li><span className="amostra bloqueada" /> Bloqueada</li>
              <li><span className="amostra diagonal" /> Mesmo curso, outro período</li>
            </ul>
            <p className="atalhos">Clique numa célula para ver e editar. Duplo clique ou Espaço libera/bloqueia; as setas andam pela matriz.</p>
          </details>
        </aside>
      </div>
    </div>
  );
}

function EditorCelula({ primeiro, segundo, linha, escolaridades, continuidade, onPerfil, onCondicao, onPeriodoSegunda, onRestaurar }) {
  const diagonal = primeiro.code === segundo.code;
  const celula = linha.celulas[segundo.code];

  const titulo = (
    <p className="editor-titulo">
      <span className="rotulo">1ª</span> {primeiro.name}
      <span className="seta">→</span>
      <span className="rotulo">2ª</span> {diagonal ? "o mesmo curso, em outro período" : segundo.name}
    </p>
  );

  if (linha.obrigatoriedade === NAO_PERMITIDA)
    return (
      <div className="bloco-editor">
        {titulo}
        <p className="editor-aviso">Esta 1ª opção não permite 2ª opção. Mude a regra da linha para liberar combinações.</p>
      </div>
    );

  return (
    <div className="bloco-editor">
      {titulo}

      <div className="perfis">
        <label className="interruptor">
          <input type="checkbox" checked={!!celula?.allowInternal} onChange={e => onPerfil("allowInternal", e.target.checked)} />
          <span>Aluno interno</span>
        </label>
        <label className="interruptor">
          <input type="checkbox" checked={!!celula?.allowExternal} onChange={e => onPerfil("allowExternal", e.target.checked)} />
          <span>Aluno externo</span>
        </label>
      </div>

      <p className="editor-ajuda">
        {continuidade
          ? `Interno = já matriculado no curso anterior da continuidade de ${primeiro.name}.`
          : `${primeiro.name} não é curso de continuidade: ninguém é interno nele, então só a flag Aluno externo tem efeito.`}
      </p>

      {!celula &&
        <p className="editor-aviso destaque">
          Combinação bloqueada. Marque <strong>Aluno interno</strong> e/ou <strong>Aluno externo</strong> para
          liberar e configurar, por período, nascimento, escolaridade e os períodos da 2ª opção.
        </p>
      }

      {celula &&
        <div className="condicoes-periodos">
          <p className="titulo-bloco">Condições por período da 1ª opção</p>
          <p className="editor-ajuda">
            Valores iniciais do cadastro de {primeiro.name}
            {primeiro.courseSchoolLevelText && <> (escolaridade: <em>“{primeiro.courseSchoolLevelText}”</em>)</>}.
          </p>

          {primeiro.periods.length === 0 && <p className="editor-aviso">{primeiro.name} não tem períodos cadastrados.</p>}

          {primeiro.periods.map(periodo => {
            const c = condicaoDoPeriodo(celula, primeiro, periodo.code);
            const invertido = c.inicio && c.fim && c.inicio > c.fim;
            const periodosSegundo = segundo.periods.filter(p => !(diagonal && p.code === periodo.code));

            return (
              <fieldset key={periodo.code} className={"condicao-periodo" + (invertido ? " erro" : "")}>
                <legend>{primeiro.name} — {periodo.name}</legend>
                <label>
                  Nascido de
                  <input type="date" value={c.inicio} onChange={e => onCondicao(periodo.code, "inicio", e.target.value)} />
                </label>
                <label>
                  até
                  <input type="date" value={c.fim} onChange={e => onCondicao(periodo.code, "fim", e.target.value)} />
                </label>
                <label className="largo">
                  Escolaridade mín.
                  <select value={c.escolaridade} onChange={e => onCondicao(periodo.code, "escolaridade", e.target.value)}>
                    <option value="">Qualquer</option>
                    {escolaridades.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                {invertido && <p className="editor-erro largo">A data inicial não pode ser depois da final.</p>}

                <div className="largo periodos-segunda">
                  <span className="rotulo-periodos">Períodos da 2ª opção</span>
                  {periodosSegundo.length === 0 && <span className="editor-aviso">Nenhum outro período.</span>}
                  {periodosSegundo.map(p2 => (
                    <label key={p2.code} className="interruptor pequeno">
                      <input
                        type="checkbox"
                        checked={!c.periodosDesabilitados.includes(p2.code)}
                        onChange={e => onPeriodoSegunda(periodo.code, p2.code, e.target.checked)}
                      />
                      <span>{p2.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          {Object.keys(celula.condicoes).length > 0 &&
            <button type="button" className="link-acao" onClick={onRestaurar}>Voltar aos valores do cadastro</button>
          }
        </div>
      }
    </div>
  );
}
