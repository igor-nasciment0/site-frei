import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { getRelatorioIndicacoes } from "../../../../api/services/admin/relatorios";
import Carregamento from "../../../../components/carregamento";
import Situacao from "../situacao";
import {
  PAGAMENTO_LABEL, STATUS_LABEL,
  dataDeHoje, exportarExcel, formatarCpf, formatarData, formatarDataHora,
} from "../util";
import "./index.scss";

// Excel: uma coluna por dado, sem agrupar — fica filtrável na planilha.
const COLUNAS_EXCEL = [
  { titulo: "Nº", valor: (l, i) => i + 1 },
  { titulo: "Indicado", valor: l => l.name },
  { titulo: "CPF do indicado", valor: l => formatarCpf(l.cpf) },
  { titulo: "Inscrição do indicado", valor: l => l.protocol },
  { titulo: "Curso (1ª opção)", valor: l => l.firstChoiceCourseName },
  { titulo: "Data da inscrição", valor: l => formatarDataHora(l.enrolledAt) },
  { titulo: "Data do pagamento", valor: l => formatarDataHora(l.paidAt) },
  { titulo: "Status da inscrição", valor: l => l.status ? (STATUS_LABEL[l.status] || l.status) : "Sem inscrição" },
  { titulo: "Pagamento", valor: l => PAGAMENTO_LABEL[l.paymentStatus] || l.paymentStatus },
  { titulo: "Quem indicou (informado)", valor: l => l.referrerName },
  { titulo: "CPF de quem indicou", valor: l => formatarCpf(l.referrerCpf) },
  { titulo: "Quem indicou (nome no cadastro)", valor: l => l.referrerAccountName },
  { titulo: "Inscrição de quem indicou", valor: l => l.referrerProtocol },
  { titulo: "Data da inscrição (quem indicou)", valor: l => formatarDataHora(l.referrerEnrolledAt) },
  { titulo: "Data do pagamento (quem indicou)", valor: l => formatarDataHora(l.referrerPaidAt) },
  { titulo: "Status da inscrição (quem indicou)", valor: l => situacaoIndicadorTexto(l) },
  { titulo: "Pagamento (quem indicou)", valor: l => PAGAMENTO_LABEL[l.referrerPaymentStatus] || l.referrerPaymentStatus },
];

function situacaoIndicadorTexto(l) {
  if (l.referrerStatus) return STATUS_LABEL[l.referrerStatus] || l.referrerStatus;
  return l.referrerHasAccount ? "Sem inscrição" : "Sem cadastro no portal";
}

export default function AdminRelatorioIndicacoes() {
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

  async function carregar(termo) {
    setCarregando(true);
    const r = await callApi(getRelatorioIndicacoes, true, { busca: termo });
    setCarregando(false);

    if (Array.isArray(r)) setLinhas(r);
  }

  useEffect(() => { carregar(""); }, []);

  function buscar(e) {
    e.preventDefault();
    carregar(busca.trim());
  }

  async function exportar() {
    setExportando(true);
    await exportarExcel(COLUNAS_EXCEL, linhas, `relatorio-indicacoes_${dataDeHoje()}.xlsx`);
    setExportando(false);
  }

  const totalIndicadores = linhas ? new Set(linhas.map(l => l.referrerCpf)).size : 0;
  const indicadosPagos = linhas ? linhas.filter(l => l.paymentStatus === "Paid").length : 0;
  const indicadoresInscritos = linhas ? new Set(linhas.filter(l => l.referrerProtocol).map(l => l.referrerCpf)).size : 0;

  return (
    <div className="admin-lista admin-relatorio-indicacoes">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>Indicações</h1>
        <p className="subtitulo">
          Candidatos que informaram quem os indicou, com a inscrição de cada um na edição ativa do vestibular.
          Quem indicou é localizado pelo CPF informado pelo candidato.
        </p>
      </div>

      <form className="filtros" onSubmit={buscar}>
        <label>
          <span>Buscar</span>
          <input
            type="text"
            placeholder="Nome, CPF ou nº de inscrição — do indicado ou de quem indicou"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </label>

        <button type="submit" className="btn-primario" disabled={carregando}>
          {carregando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {carregando && <Carregamento />}

      {!carregando && linhas &&
        <>
          <div className="resumo">
            <div><span className="rotulo">Indicações</span><span className="valor">{linhas.length}</span></div>
            <div><span className="rotulo">Indicados com pagamento confirmado</span><span className="valor">{indicadosPagos}</span></div>
            <div><span className="rotulo">Pessoas que indicaram</span><span className="valor">{totalIndicadores}</span></div>
            <div><span className="rotulo">Delas, também inscritas</span><span className="valor">{indicadoresInscritos}</span></div>
          </div>

          <div className="barra-resultado">
            <span>{linhas.length} {linhas.length === 1 ? "indicação" : "indicações"}</span>
            <button type="button" className="btn-exportar" disabled={linhas.length === 0 || exportando} onClick={exportar}>
              {exportando ? "Gerando…" : "Exportar para Excel"}
            </button>
          </div>

          <div className="tabela-rolavel">
            <table className="admin-table">
              <thead>
                <tr className="grupos">
                  <th />
                  <th colSpan={4}>Indicado</th>
                  <th colSpan={4} className="inicio-grupo">Quem indicou</th>
                </tr>
                <tr>
                  <th>Nº</th>
                  <th>Candidato</th>
                  <th>Inscrição</th>
                  <th>Datas</th>
                  <th>Situação</th>
                  <th className="inicio-grupo">Nome</th>
                  <th>Inscrição</th>
                  <th>Datas</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 &&
                  <tr className="vazio"><td colSpan={9}>Nenhuma indicação encontrada.</td></tr>
                }

                {linhas.map((l, i) => (
                  <tr key={l.userId}>
                    <td className="numero">{i + 1}</td>

                    <td>
                      <span className="principal">{l.name}</span>
                      <span className="secundario">{formatarCpf(l.cpf) || "CPF não informado"}</span>
                    </td>
                    <td>
                      <Inscricao id={l.enrollmentId} protocolo={l.protocol} curso={l.firstChoiceCourseName} />
                    </td>
                    <td><Datas inscricao={l.enrolledAt} pagamento={l.paidAt} /></td>
                    <td><Situacao status={l.status} pagamento={l.paymentStatus} /></td>

                    <td className="inicio-grupo">
                      <span className="principal">{l.referrerName}</span>
                      <span className="secundario">{formatarCpf(l.referrerCpf)}</span>
                      {/* O nome digitado pelo candidato pode diferir do nome no cadastro de quem indicou. */}
                      {l.referrerAccountName && nomesDiferentes(l.referrerAccountName, l.referrerName) &&
                        <span className="secundario">No cadastro: {l.referrerAccountName}</span>
                      }
                    </td>
                    <td>
                      {l.referrerProtocol
                        ? <Inscricao id={l.referrerEnrollmentId} protocolo={l.referrerProtocol} />
                        : <span className="sem-dado">{l.referrerHasAccount ? "Sem inscrição" : "Sem cadastro no portal"}</span>
                      }
                    </td>
                    <td><Datas inscricao={l.referrerEnrolledAt} pagamento={l.referrerPaidAt} /></td>
                    <td>
                      {l.referrerStatus
                        ? <Situacao status={l.referrerStatus} pagamento={l.referrerPaymentStatus} />
                        : <span className="sem-dado">—</span>
                      }
                    </td>
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

function Inscricao({ id, protocolo, curso }) {
  if (!protocolo)
    return <span className="sem-dado">Sem inscrição</span>;

  return (
    <>
      <Link className="protocolo" to={`/admin/inscricoes/${id}`}>{protocolo}</Link>
      {curso && <span className="secundario">{curso}</span>}
    </>
  );
}

function Datas({ inscricao, pagamento }) {
  if (!inscricao)
    return <span className="sem-dado">—</span>;

  return (
    <>
      <span>Inscrição: {formatarData(inscricao)}</span>
      <span className="secundario">{pagamento ? `Pagamento: ${formatarData(pagamento)}` : "Pagamento: —"}</span>
    </>
  );
}

function nomesDiferentes(a, b) {
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
}
