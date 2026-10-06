import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import callApi from "../../../api/callAPI";
import toast from "react-hot-toast";
import { listarInscricoes, getRelatorioInscricoes, getDocumentoRGCandidato, verificarPagamento } from "../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };
const PAGAMENTO_LABEL = { Pending: "Pendente", Paid: "Pago", Expired: "Vencido", Failed: "Recusado", Canceled: "Cancelado" };
const PAGE_SIZE = 20;

// Opção do filtro de status que não é um EnrollmentStatus: vira pendingPayment=true na API.
const FILTRO_PENDENTE_PAGAMENTO = "PendingPayment";

// Colunas do relatório Excel — mesmos dados da listagem, mais os telefones do candidato e dos
// responsáveis. Sem RG, preview, links ou qualquer coisa que não seja texto/data.
const COLUNAS_RELATORIO = [
  { titulo: "Protocolo", valor: l => l.protocol },
  { titulo: "Candidato", valor: l => l.studentName },
  { titulo: "CPF", valor: l => l.studentCpf },
  { titulo: "E-mail", valor: l => l.studentEmail },
  { titulo: "Telefone do candidato", valor: l => l.studentPhone },
  { titulo: "Responsável 1 — Nome", valor: l => l.primaryResponsibleName },
  { titulo: "Responsável 1 — Telefone", valor: l => l.primaryResponsiblePhone },
  { titulo: "Responsável 1 — Telefone secundário", valor: l => l.primaryResponsiblePhoneSecondary },
  { titulo: "Responsável 2 — Nome", valor: l => l.secondaryResponsibleName },
  { titulo: "Responsável 2 — Telefone", valor: l => l.secondaryResponsiblePhone },
  { titulo: "Responsável 2 — Telefone secundário", valor: l => l.secondaryResponsiblePhoneSecondary },
  { titulo: "1ª opção — Curso", valor: l => l.firstChoiceCourseName },
  { titulo: "1ª opção — Período", valor: l => l.firstChoicePeriodName },
  { titulo: "2ª opção — Curso", valor: l => l.secondChoiceCourseName },
  { titulo: "2ª opção — Período", valor: l => l.secondChoicePeriodName },
  { titulo: "Status", valor: l => STATUS_LABEL[l.status] || l.status },
  { titulo: "Pagamento", valor: l => PAGAMENTO_LABEL[l.paymentStatus] || l.paymentStatus },
  { titulo: "Inscrito em", valor: l => converterDataUTCParaLocalSemMudarDia(l.createdAt) },
];

export default function AdminInscricoes() {
  const [resultado, setResultado] = useState(null);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const [preview, setPreview] = useState(null);
  const [fixado, setFixado] = useState(null); // { userId, nome } do preview fixado por clique
  const [verificando, setVerificando] = useState(null); // id da inscrição com verificação de pagamento em curso
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const admin = useOutletContext();
  // Secretaria só consulta/verifica pagamento/vê detalhes/reseta senha — o relatório Excel
  // (como as demais páginas do painel) fica restrito ao perfil Admin.
  const somenteConsulta = admin?.role === "Secretaria";
  const cacheRg = useRef({});
  const navigate = useNavigate();

  // As URLs de objeto do preview ficam em cache (evita rebaixar o anexo a cada hover);
  // só são liberadas quando a pessoa sai da tela.
  useEffect(() => {
    const cache = cacheRg.current;
    return () => {
      Object.values(cache).forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, []);

  // Debounce simples do campo de busca — espera o usuário parar de digitar
  // antes de disparar a requisição (search casa com protocolo, nome, CPF ou e-mail).
  useEffect(() => {
    const t = setTimeout(() => {
      setPagina(1);
      setBusca(buscaInput);
    }, 400);

    return () => clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => { carregar(); }, [busca, status, pagina]);

  async function carregar() {
    const pendentePagamento = status === FILTRO_PENDENTE_PAGAMENTO;
    const r = await callApi(listarInscricoes, true, {
      search: busca || undefined,
      status: pendentePagamento ? undefined : status || undefined,
      pendingPayment: pendentePagamento || undefined,
      page: pagina,
      pageSize: PAGE_SIZE
    });

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setResultado(r);
  }

  // Busca todas as páginas que batem com o filtro atual (sem paginação, via endpoint próprio)
  // e gera o Excel no navegador — mesma biblioteca usada no relatório financeiro.
  async function gerarRelatorio() {
    setGerandoRelatorio(true);

    const pendentePagamento = status === FILTRO_PENDENTE_PAGAMENTO;
    const linhas = await callApi(getRelatorioInscricoes, true, {
      search: busca || undefined,
      status: pendentePagamento ? undefined : status || undefined,
      pendingPayment: pendentePagamento || undefined
    });

    if (linhas) {
      if (linhas.length === 0) {
        toast("Nenhuma inscrição encontrada para o filtro atual.");
      } else {
        try {
          const { default: writeXlsxFile } = await import("write-excel-file/browser");

          const cabecalho = COLUNAS_RELATORIO.map(c => ({ value: c.titulo, fontWeight: "bold" }));
          const corpo = linhas.map(l => COLUNAS_RELATORIO.map(c => ({ type: String, value: String(c.valor(l) ?? "") })));

          await writeXlsxFile([cabecalho, ...corpo]).toFile(`inscricoes_${dataDeHoje()}.xlsx`);
        } catch {
          toast.error("Não foi possível gerar o arquivo Excel.");
        }
      }
    }

    setGerandoRelatorio(false);
  }

  async function verificarPagamentoInscricao(item) {
    setVerificando(item.id);
    const r = await callApi(verificarPagamento, true, item.id);
    setVerificando(null);
    if (!r) return;

    // status do EnrollmentPaymentDto é numérico: 2 = pago.
    if (r.status === 2)
      toast.success(`Pagamento da inscrição ${item.protocol} confirmado.`);
    else if (!r.correlationId)
      toast(`A inscrição ${item.protocol} ainda não tem cobrança PIX emitida.`);
    else
      toast(`Pagamento da inscrição ${item.protocol} ainda não confirmado pelo provedor.`);

    carregar();
  }

  async function mostrarPreviewRg(item) {
    const emCache = cacheRg.current[item.userId];
    if (emCache) {
      setPreview({ userId: item.userId, nome: item.studentName, ...emCache });
      return;
    }

    setPreview({ userId: item.userId, nome: item.studentName, carregando: true });
    const blob = await callApi(getDocumentoRGCandidato, true, item.userId);
    if (!blob) {
      setPreview(atual => (atual?.userId === item.userId ? null : atual));
      return;
    }

    const dado = { url: URL.createObjectURL(blob), tipo: blob.type };
    cacheRg.current[item.userId] = dado;
    setPreview(atual => (atual?.userId === item.userId ? { userId: item.userId, nome: item.studentName, ...dado } : atual));
  }

  // Mouse saindo do ícone: some, a menos que esse item esteja fixado por clique — nesse caso,
  // se o hover era de outra linha "espiando por cima", volta a mostrar o preview fixado.
  function esconderPreviewRg(item) {
    if (fixado?.userId === item.userId) return;

    if (fixado) {
      const dado = cacheRg.current[fixado.userId];
      setPreview(dado ? { ...fixado, ...dado } : null);
      return;
    }

    setPreview(null);
  }

  // Clique no ícone: alterna fixar/desfixar o preview dessa linha.
  function alternarFixarRg(item) {
    if (fixado?.userId === item.userId) {
      setFixado(null);
      setPreview(null);
      return;
    }

    setFixado({ userId: item.userId, nome: item.studentName });
    mostrarPreviewRg(item);
  }

  function fecharPreview() {
    setFixado(null);
    setPreview(null);
  }

  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / resultado.pageSize), 1) : 1;

  return (
    <div className="admin-lista admin-inscricoes">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Inscrições</h1>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por protocolo, nome, CPF ou e-mail…"
          value={buscaInput}
          onChange={e => setBuscaInput(e.target.value)}
        />

        <select value={status} onChange={e => { setStatus(e.target.value); setPagina(1); }}>
          <option value="">Todos os status</option>
          <option value="Open">Aberta</option>
          <option value="Validated">Validada</option>
          <option value="Canceled">Cancelada</option>
          <option value={FILTRO_PENDENTE_PAGAMENTO}>Pendente pagamento</option>
        </select>

        {!somenteConsulta &&
          <button type="button" className="btn-exportar" disabled={gerandoRelatorio} onClick={gerarRelatorio}>
            {gerandoRelatorio ? "Gerando…" : "Gerar Relatório"}
          </button>
        }
      </div>

      {!resultado && <Carregamento />}

      {resultado &&
        <div className="corpo-tabela">
          <div className="coluna-tabela">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Candidato</th>
                  <th>CPF</th>
                  <th>RG</th>
                  <th>1ª opção</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Inscrito em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resultado.items.length === 0 &&
                  <tr className="vazio"><td colSpan={9}>Nenhuma inscrição encontrada.</td></tr>
                }

                {resultado.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.protocol}</td>
                    <td>
                      <span className="nome">{item.studentName}</span>
                      <span className="email">{item.studentEmail}</span>
                    </td>
                    <td>{item.studentCpf}</td>
                    <td className="col-rg">
                      {item.hasRgDocument &&
                        <button
                          type="button"
                          className={"icone-ver-rg" + (fixado?.userId === item.userId ? " fixado" : "")}
                          aria-label={`Pré-visualizar RG de ${item.studentName}`}
                          aria-pressed={fixado?.userId === item.userId}
                          onMouseEnter={() => mostrarPreviewRg(item)}
                          onMouseLeave={() => esconderPreviewRg(item)}
                          onFocus={() => mostrarPreviewRg(item)}
                          onBlur={() => esconderPreviewRg(item)}
                          onClick={() => alternarFixarRg(item)}
                        >
                          <IconeOlho />
                        </button>
                      }
                      <span>{item.studentRg || "—"}</span>
                    </td>
                    <td>{item.firstChoiceCourseName} — {item.firstChoicePeriodName}</td>
                    <td>
                      <span className={"admin-badge status-" + item.status.toLowerCase()}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <span className={"admin-badge pagamento-" + (item.paymentStatus || "").toLowerCase()}>
                        {PAGAMENTO_LABEL[item.paymentStatus] || item.paymentStatus || "—"}
                      </span>
                    </td>
                    <td>{converterDataUTCParaLocalSemMudarDia(item.createdAt)}</td>
                    <td className="acoes">
                      {item.paymentStatus !== "Paid" && item.status !== "Canceled" &&
                        <button
                          type="button"
                          className="acao-verificar-pagamento"
                          disabled={verificando === item.id}
                          onClick={() => verificarPagamentoInscricao(item)}
                        >
                          {verificando === item.id ? "Verificando…" : "Verificar pagamento"}
                        </button>
                      }
                      <Link to={`/admin/inscricoes/${item.id}`}>Ver detalhes</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {resultado.total > 0 &&
              <div className="paginacao">
                <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
                <span>Página {resultado.page} de {totalPaginas} · {resultado.total} inscrições</span>
                <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
              </div>
            }
          </div>

          {/* sticky dentro do flex — gruda ao lado da tabela (não dos filtros, que ficam fora
              deste wrapper) e acompanha a rolagem até sair da área da tabela. */}
          {preview &&
            <div className="painel-preview-rg">
              <div className="topo-preview">
                <span className="titulo-preview">RG de {preview.nome}</span>
                {fixado?.userId === preview.userId &&
                  <button type="button" className="fechar-preview" aria-label="Fechar preview" onClick={fecharPreview}>×</button>
                }
              </div>

              {preview.carregando && <Carregamento />}

              {!preview.carregando && preview.tipo?.startsWith("image/") &&
                <img src={preview.url} alt={`RG de ${preview.nome}`} />
              }

              {!preview.carregando && preview.tipo === "application/pdf" &&
                <iframe src={preview.url} title={`RG de ${preview.nome}`} />
              }
            </div>
          }
        </div>
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

function IconeOlho() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
