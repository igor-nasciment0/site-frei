import { useState } from "react";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getRelatorioFinanceiro } from "../../../../api/services/admin/relatorios";
import Carregamento from "../../../../components/carregamento";
import "./index.scss";

const COLUNAS = [
  { titulo: "Nº", valor: (l, i) => i + 1 },
  { titulo: "Código da Inscrição", valor: l => l.protocol },
  { titulo: "Nome", valor: l => l.name },
  { titulo: "CPF", valor: l => l.cpf },
  { titulo: "Email", valor: l => l.email },
  { titulo: "Opção 1", valor: l => l.firstChoiceCourseName },
  { titulo: "Período", valor: l => l.firstChoicePeriodName },
  { titulo: "Opção 2", valor: l => l.secondChoiceCourseName },
  { titulo: "Período", valor: l => l.secondChoicePeriodName },
  { titulo: "Data de Pagamento", valor: l => formatarDataHora(l.paidAt) },
  { titulo: "Valor Pago", valor: l => formatarMoeda(l.amount) },
  { titulo: "Tipo do Pagamento", valor: l => l.paymentType },
];

export default function AdminRelatorioFinanceiro() {
  const hoje = dataDeHoje();
  const [nome, setNome] = useState("");
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(hoje);
  const [linhas, setLinhas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);

  async function buscar(e) {
    e.preventDefault();

    if (!de || !ate) {
      toast.error("Informe a data inicial e a data final.");
      return;
    }

    if (ate < de) {
      toast.error("A data final não pode ser anterior à data inicial.");
      return;
    }

    setCarregando(true);
    const r = await callApi(getRelatorioFinanceiro, true, { nome: nome.trim(), de, ate });
    setCarregando(false);

    if (r) setLinhas(r);
  }

  async function exportar() {
    setExportando(true);
    try {
      // Carregado só ao exportar: a biblioteca não pesa no bundle das demais telas.
      const { default: writeXlsxFile } = await import("write-excel-file/browser");

      const cabecalho = COLUNAS.map(c => ({ value: c.titulo, fontWeight: "bold" }));
      const corpo = linhas.map((l, i) => COLUNAS.map(c => ({ type: String, value: String(c.valor(l, i) ?? "") })));

      await writeXlsxFile([cabecalho, ...corpo]).toFile(`relatorio-financeiro_${de}_a_${ate}.xlsx`);
    } catch {
      toast.error("Não foi possível gerar o arquivo Excel.");
    }
    setExportando(false);
  }

  return (
    <div className="admin-lista admin-relatorio-financeiro">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>Financeiro</h1>
        <p className="subtitulo">Inscrições pagas da edição ativa do vestibular, pela data do pagamento.</p>
      </div>

      <form className="filtros" onSubmit={buscar}>
        <label>
          <span>Nome</span>
          <input type="text" placeholder="Nome do candidato" value={nome} onChange={e => setNome(e.target.value)} />
        </label>

        <label>
          <span>De *</span>
          <input type="date" required value={de} onChange={e => setDe(e.target.value)} />
        </label>

        <label>
          <span>Até *</span>
          <input type="date" required value={ate} onChange={e => setAte(e.target.value)} />
        </label>

        <button type="submit" className="btn-primario" disabled={carregando}>
          {carregando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {carregando && <Carregamento />}

      {!carregando && linhas &&
        <>
          <div className="barra-resultado">
            <span>{linhas.length} {linhas.length === 1 ? "pagamento" : "pagamentos"}</span>
            <button type="button" className="btn-exportar" disabled={linhas.length === 0 || exportando} onClick={exportar}>
              {exportando ? "Gerando…" : "Exportar para Excel"}
            </button>
          </div>

          <div className="rolagem-tabela">
            <table className="admin-table">
              <thead>
                <tr>{COLUNAS.map((c, i) => <th key={i}>{c.titulo}</th>)}</tr>
              </thead>
              <tbody>
                {linhas.length === 0 &&
                  <tr className="vazio"><td colSpan={COLUNAS.length}>Nenhum pagamento encontrado no período.</td></tr>
                }

                {linhas.map((l, linha) => (
                  <tr key={l.enrollmentId}>
                    {COLUNAS.map((c, i) => <td key={i}>{c.valor(l, linha) || "—"}</td>)}
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

// AAAA-MM-DD no fuso local (toISOString viraria o dia depois das 21h em Brasília).
function dataDeHoje() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
