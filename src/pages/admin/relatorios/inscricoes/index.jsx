import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { getRelatorioInscricoesExternas, getRelatorioInscricoesValidas } from "../../../../api/services/admin/relatorios";
import Carregamento from "../../../../components/carregamento";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import { dataDeHoje, exportarExcel, formatarCpf, formatarDataHora } from "../util";
import "./index.scss";

// Os dois relatórios trazem as mesmas colunas; o de externas só filtra as linhas (no backend).
const TIPOS = {
  validas: {
    titulo: "Inscrições válidas",
    subtitulo: "Inscrições pagas da edição ativa do vestibular, com os dados do candidato e as opções de curso.",
    servico: getRelatorioInscricoesValidas,
    arquivo: "relatorio-inscricoes-validas",
    vazio: "Nenhuma inscrição paga na edição ativa.",
  },
  externas: {
    titulo: "Inscrições externas",
    subtitulo: "Inscrições pagas de quem escolheu um curso de continuidade de inglês sem estar matriculado no curso pré-requisito dele (cruzamento pelo CPF com os alunos matriculados importados).",
    servico: getRelatorioInscricoesExternas,
    arquivo: "relatorio-inscricoes-externas",
    vazio: "Nenhuma inscrição paga de candidato externo na edição ativa.",
  },
};

// O nascimento é gravado como data em UTC — sem a conversão, o fuso de Brasília mostraria o dia anterior.
const formatarNascimento = iso => iso ? converterDataUTCParaLocalSemMudarDia(iso) : "";

const COLUNAS = [
  { titulo: "Protocolo", valor: l => l.protocol },
  { titulo: "Inscrito em", valor: l => formatarDataHora(l.enrolledAt) },
  { titulo: "Pago em", valor: l => formatarDataHora(l.paidAt) },
  { titulo: "Nome", valor: l => l.name },
  { titulo: "CPF", valor: l => formatarCpf(l.cpf) },
  { titulo: "RG", valor: l => l.rg },
  { titulo: "Nascimento", valor: l => formatarNascimento(l.birthDate) },
  { titulo: "Escolaridade", valor: l => l.schoolGrade },
  { titulo: "Bairro", valor: l => l.neighborhood },
  { titulo: "Como conheceu", valor: l => l.howDidYouKnow },
  { titulo: "E-mail", valor: l => l.email },
  { titulo: "Telefone", valor: l => l.phone },
  { titulo: "1ª opção", valor: l => l.firstChoiceCourseName },
  { titulo: "Período da 1ª", valor: l => l.firstChoicePeriodName },
  { titulo: "2ª opção", valor: l => l.secondChoiceCourseName },
  { titulo: "Período da 2ª", valor: l => l.secondChoicePeriodName },
];

export default function AdminRelatorioInscricoes({ tipo }) {
  const config = TIPOS[tipo];
  const [linhas, setLinhas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const r = await callApi(config.servico, true);
      setCarregando(false);

      if (Array.isArray(r)) setLinhas(r);
    })();
  }, [config]);

  async function exportar() {
    setExportando(true);
    await exportarExcel(COLUNAS, linhas, `${config.arquivo}_${dataDeHoje()}.xlsx`);
    setExportando(false);
  }

  return (
    <div className="admin-lista admin-relatorio-inscricoes">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>{config.titulo}</h1>
        <p className="subtitulo">{config.subtitulo}</p>
      </div>

      {carregando && <Carregamento />}

      {!carregando && linhas &&
        <>
          <div className="barra-resultado">
            <span>{linhas.length} {linhas.length === 1 ? "inscrição" : "inscrições"}</span>
            <button type="button" className="btn-exportar" disabled={linhas.length === 0 || exportando} onClick={exportar}>
              {exportando ? "Gerando…" : "Exportar para Excel"}
            </button>
          </div>

          <div className="tabela-rolavel">
            <table className="admin-table">
              <thead>
                <tr>
                  {COLUNAS.map(c => <th key={c.titulo}>{c.titulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 &&
                  <tr className="vazio"><td colSpan={COLUNAS.length}>{config.vazio}</td></tr>
                }

                {linhas.map(l => (
                  <tr key={l.enrollmentId}>
                    <td><Link className="protocolo" to={`/admin/inscricoes/${l.enrollmentId}`}>{l.protocol}</Link></td>
                    {COLUNAS.slice(1).map(c => {
                      const valor = c.valor(l);
                      return <td key={c.titulo}>{valor || <span className="sem-dado">—</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
    </div>
  );
}
