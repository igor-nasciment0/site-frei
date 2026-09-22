import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import callApi from "../../../api/callAPI";
import { listarInscricoes, getDocumentoRGCandidato } from "../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };
const PAGE_SIZE = 20;

export default function AdminInscricoes() {
  const [resultado, setResultado] = useState(null);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const [preview, setPreview] = useState(null);
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
    const r = await callApi(listarInscricoes, true, { search: busca || undefined, status: status || undefined, page: pagina, pageSize: PAGE_SIZE });

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setResultado(r);
  }

  async function mostrarPreviewRg(item) {
    const emCache = cacheRg.current[item.userId];
    if (emCache) {
      setPreview({ nome: item.studentName, ...emCache });
      return;
    }

    setPreview({ nome: item.studentName, carregando: true });
    const blob = await callApi(getDocumentoRGCandidato, true, item.userId);
    if (!blob) {
      setPreview(null);
      return;
    }

    const dado = { url: URL.createObjectURL(blob), tipo: blob.type };
    cacheRg.current[item.userId] = dado;
    setPreview(atual => (atual?.nome === item.studentName ? { nome: item.studentName, ...dado } : atual));
  }

  function esconderPreviewRg() {
    setPreview(null);
  }

  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / resultado.pageSize), 1) : 1;

  return (
    <div className="admin-lista admin-inscricoes">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Inscrições</h1>
      </div>

      <div className="corpo-com-preview">
        <div className="coluna-tabela">
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
            </select>
          </div>

          {!resultado && <Carregamento />}

          {resultado &&
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Candidato</th>
                  <th>CPF</th>
                  <th>RG</th>
                  <th>1ª opção</th>
                  <th>Status</th>
                  <th>Inscrito em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resultado.items.length === 0 &&
                  <tr className="vazio"><td colSpan={8}>Nenhuma inscrição encontrada.</td></tr>
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
                      <span>{item.studentRg || "—"}</span>
                      {item.hasRgDocument &&
                        <button
                          type="button"
                          className="icone-ver-rg"
                          aria-label={`Pré-visualizar RG de ${item.studentName}`}
                          onMouseEnter={() => mostrarPreviewRg(item)}
                          onMouseLeave={esconderPreviewRg}
                          onFocus={() => mostrarPreviewRg(item)}
                          onBlur={esconderPreviewRg}
                        >
                          <IconeOlho />
                        </button>
                      }
                    </td>
                    <td>{item.firstChoiceCourseName} — {item.firstChoicePeriodName}</td>
                    <td>
                      <span className={"admin-badge status-" + item.status.toLowerCase()}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                    <td>{converterDataUTCParaLocalSemMudarDia(item.createdAt)}</td>
                    <td className="acoes">
                      <Link to={`/admin/inscricoes/${item.id}`}>Ver detalhes</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }

          {resultado && resultado.total > 0 &&
            <div className="paginacao">
              <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
              <span>Página {resultado.page} de {totalPaginas} · {resultado.total} inscrições</span>
              <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
            </div>
          }
        </div>

        {preview &&
          <div className="painel-preview-rg">
            <span className="titulo-preview">RG de {preview.nome}</span>

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
    </div>
  );
}

function IconeOlho() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
