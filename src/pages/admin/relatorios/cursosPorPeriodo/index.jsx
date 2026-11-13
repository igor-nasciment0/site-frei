import { useEffect, useMemo, useState } from "react";
import callApi from "../../../../api/callAPI";
import { getRelatorioInscricoesValidas } from "../../../../api/services/admin/relatorios";
import Carregamento from "../../../../components/carregamento";
import { dataDeHoje, exportarExcel } from "../util";
import "./index.scss";

// O filtro usa a coluna "Interno / Externo" do relatório de inscrições válidas (studentProfile):
// só quem escolheu curso de continuidade de inglês como 1ª opção é Interno ou Externo; os demais
// são "N/A" e só entram em "Todos".
const PERFIS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "Interno", rotulo: "Aluno interno" },
  { valor: "Externo", rotulo: "Aluno externo" },
];

const COLUNAS = [
  { titulo: "Curso", valor: l => l.curso },
  { titulo: "Período", valor: l => l.periodo },
  { titulo: "Inscrições", valor: l => l.quantidade },
];

// Os nomes vêm da inscrição (cópia do momento da escolha); espaços e quebras de linha soltos não
// podem separar o mesmo curso em duas linhas.
const limpar = texto => String(texto || "").replace(/\s+/g, " ").trim();

function agruparPorCursoPeriodo(inscricoes) {
  const grupos = new Map();

  for (const i of inscricoes) {
    const curso = limpar(i.firstChoiceCourseName);
    const periodo = limpar(i.firstChoicePeriodName);
    const chave = `${curso.toLocaleLowerCase("pt-BR")}|${periodo.toLocaleLowerCase("pt-BR")}`;

    const grupo = grupos.get(chave) ?? { chave, curso, periodo, quantidade: 0 };
    grupo.quantidade++;
    grupos.set(chave, grupo);
  }

  return [...grupos.values()].sort((a, b) =>
    a.curso.localeCompare(b.curso, "pt-BR") || a.periodo.localeCompare(b.periodo, "pt-BR"));
}

export default function AdminRelatorioCursosPorPeriodo() {
  const [inscricoes, setInscricoes] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState("todos");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const r = await callApi(getRelatorioInscricoesValidas, true);
      setCarregando(false);

      if (Array.isArray(r)) setInscricoes(r);
    })();
  }, []);

  const linhas = useMemo(() => {
    if (!inscricoes) return null;
    const filtradas = perfil === "todos" ? inscricoes : inscricoes.filter(i => i.studentProfile === perfil);
    return agruparPorCursoPeriodo(filtradas);
  }, [inscricoes, perfil]);

  const total = linhas ? linhas.reduce((soma, l) => soma + l.quantidade, 0) : 0;

  async function exportar() {
    setExportando(true);
    const sufixo = perfil === "todos" ? "" : `-${perfil.toLowerCase()}s`;
    await exportarExcel(COLUNAS, linhas, `relatorio-cursos-por-periodo${sufixo}_${dataDeHoje()}.xlsx`);
    setExportando(false);
  }

  return (
    <div className="admin-lista admin-relatorio-cursos-periodo">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>Cursos por período</h1>
        <p className="subtitulo">
          Inscrições válidas (pagas e não canceladas) da edição ativa, contadas pela 1ª opção de curso e período.
        </p>
      </div>

      <div className="filtros">
        <label>
          <span>Perfil do candidato</span>
          <select value={perfil} onChange={e => setPerfil(e.target.value)}>
            {PERFIS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        </label>
      </div>
      {perfil !== "todos" &&
        <p className="nota-filtro">
          Interno e externo só se aplicam a quem escolheu um curso de continuidade de inglês como 1ª opção
          (mesma regra da coluna "Interno / Externo" do relatório de inscrições válidas).
        </p>
      }

      {carregando && <Carregamento />}

      {!carregando && linhas &&
        <>
          <div className="barra-resultado">
            <span>{total} {total === 1 ? "inscrição" : "inscrições"} em {linhas.length} {linhas.length === 1 ? "curso/período" : "cursos/períodos"}</span>
            <button type="button" className="btn-exportar" disabled={linhas.length === 0 || exportando} onClick={exportar}>
              {exportando ? "Gerando…" : "Exportar para Excel"}
            </button>
          </div>

          <div className="tabela-rolavel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Período</th>
                  <th className="valor">Inscrições</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 &&
                  <tr className="vazio"><td colSpan={COLUNAS.length}>Nenhuma inscrição válida para este filtro na edição ativa.</td></tr>
                }

                {linhas.map(l => (
                  <tr key={l.chave}>
                    <td>{l.curso || <span className="sem-dado">—</span>}</td>
                    <td>{l.periodo || <span className="sem-dado">—</span>}</td>
                    <td className="valor">{l.quantidade}</td>
                  </tr>
                ))}
              </tbody>
              {linhas.length > 0 &&
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total</td>
                    <td className="valor">{total}</td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
        </>
      }
    </div>
  );
}
