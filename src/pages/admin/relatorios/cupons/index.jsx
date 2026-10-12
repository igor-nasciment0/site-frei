import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { getRelatorioCupons } from "../../../../api/services/admin/relatorios";
import Carregamento from "../../../../components/carregamento";
import Situacao from "../situacao";
import {
  PAGAMENTO_LABEL, STATUS_LABEL,
  dataDeHoje, exportarExcel, formatarCpf, formatarData, formatarDataHora, formatarMoeda,
} from "../util";
import "./index.scss";

const COLUNAS_EXCEL = [
  { titulo: "Nº", valor: (l, i) => i + 1 },
  { titulo: "Inscrição", valor: l => l.protocol },
  { titulo: "Candidato", valor: l => l.name },
  { titulo: "CPF", valor: l => formatarCpf(l.cpf) },
  { titulo: "Curso (1ª opção)", valor: l => l.firstChoiceCourseName },
  { titulo: "Cupom", valor: l => l.couponCode },
  { titulo: "Valor cheio", valor: l => formatarMoeda(l.originalFee) },
  { titulo: "Desconto", valor: l => formatarMoeda(l.discount) },
  { titulo: "Valor com desconto", valor: l => formatarMoeda(l.amountDue) },
  { titulo: "Valor pago", valor: l => l.amountPaid == null ? "" : formatarMoeda(l.amountPaid) },
  { titulo: "Forma de pagamento", valor: l => l.paymentType },
  { titulo: "Data da inscrição", valor: l => formatarDataHora(l.enrolledAt) },
  { titulo: "Data do pagamento", valor: l => formatarDataHora(l.paidAt) },
  { titulo: "Status da inscrição", valor: l => STATUS_LABEL[l.status] || l.status },
  { titulo: "Pagamento", valor: l => PAGAMENTO_LABEL[l.paymentStatus] || l.paymentStatus },
];

export default function AdminRelatorioCupons() {
  const [busca, setBusca] = useState("");
  const [cupom, setCupom] = useState("");
  const [linhas, setLinhas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

  async function carregar(filtros) {
    setCarregando(true);
    const r = await callApi(getRelatorioCupons, true, filtros);
    setCarregando(false);

    if (Array.isArray(r)) setLinhas(r);
  }

  useEffect(() => { carregar({}); }, []);

  function buscar(e) {
    e.preventDefault();
    carregar({ busca: busca.trim(), cupom: cupom.trim() });
  }

  async function exportar() {
    setExportando(true);
    await exportarExcel(COLUNAS_EXCEL, linhas, `relatorio-cupons_${dataDeHoje()}.xlsx`);
    setExportando(false);
  }

  // Os totais consideram só o que já foi pago — o que entrou e de quanto foi o desconto concedido.
  const pagas = linhas ? linhas.filter(l => l.paymentStatus === "Paid") : [];
  const soma = (lista, campo) => lista.reduce((total, l) => total + Number(l[campo] || 0), 0);

  return (
    <div className="admin-lista admin-relatorio-cupons">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>Cupons</h1>
        <p className="subtitulo">
          Inscrições da edição ativa do vestibular que usaram cupom de desconto: valor cheio da taxa, desconto e quanto foi pago.
          A inscrição entra aqui quando o desconto é aplicado à cobrança ou ao pagamento.
        </p>
      </div>

      <form className="filtros" onSubmit={buscar}>
        <label>
          <span>Buscar</span>
          <input type="text" placeholder="Nome, CPF ou nº de inscrição" value={busca} onChange={e => setBusca(e.target.value)} />
        </label>

        <label>
          <span>Cupom</span>
          <input type="text" placeholder="Código do cupom" value={cupom} onChange={e => setCupom(e.target.value)} />
        </label>

        <button type="submit" className="btn-primario" disabled={carregando}>
          {carregando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {carregando && <Carregamento />}

      {!carregando && linhas &&
        <>
          <div className="resumo">
            <div><span className="rotulo">Inscrições com cupom</span><span className="valor">{linhas.length}</span></div>
            <div><span className="rotulo">Pagas</span><span className="valor">{pagas.length}</span></div>
            <div><span className="rotulo">Valor cheio das pagas</span><span className="valor">{formatarMoeda(soma(pagas, "originalFee"))}</span></div>
            <div><span className="rotulo">Desconto concedido</span><span className="valor">{formatarMoeda(soma(pagas, "discount"))}</span></div>
            <div><span className="rotulo">Total pago</span><span className="valor">{formatarMoeda(soma(pagas, "amountPaid"))}</span></div>
          </div>

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
                  <th>Nº</th>
                  <th>Inscrição</th>
                  <th>Candidato</th>
                  <th>Cupom</th>
                  <th className="valor">Valor cheio</th>
                  <th className="valor">Desconto</th>
                  <th className="valor">Com desconto</th>
                  <th className="valor">Pago</th>
                  <th>Datas</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 &&
                  <tr className="vazio"><td colSpan={10}>Nenhuma inscrição com cupom encontrada.</td></tr>
                }

                {linhas.map((l, i) => (
                  <tr key={l.enrollmentId}>
                    <td className="numero">{i + 1}</td>
                    <td>
                      <Link className="protocolo" to={`/admin/inscricoes/${l.enrollmentId}`}>{l.protocol}</Link>
                      {l.firstChoiceCourseName && <span className="secundario">{l.firstChoiceCourseName}</span>}
                    </td>
                    <td>
                      <span className="principal">{l.name}</span>
                      <span className="secundario">{formatarCpf(l.cpf)}</span>
                    </td>
                    <td><span className="codigo-cupom">{l.couponCode}</span></td>
                    <td className="valor">{formatarMoeda(l.originalFee)}</td>
                    <td className="valor desconto">−{formatarMoeda(l.discount)}</td>
                    <td className="valor">{formatarMoeda(l.amountDue)}</td>
                    <td className="valor">
                      {l.amountPaid == null ? <span className="sem-dado">—</span> : formatarMoeda(l.amountPaid)}
                      {l.paymentType && <span className="secundario">{l.paymentType}</span>}
                    </td>
                    <td>
                      <span>Inscrição: {formatarData(l.enrolledAt)}</span>
                      <span className="secundario">{l.paidAt ? `Pagamento: ${formatarData(l.paidAt)}` : "Pagamento: —"}</span>
                    </td>
                    <td><Situacao status={l.status} pagamento={l.paymentStatus} /></td>
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
