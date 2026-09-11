import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import callApi from "../../../api/callAPI";
import { listarContas } from "../../../api/services/admin/contas";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import useModal from "../../../util/useModal";
import Carregamento from "../../../components/carregamento";
import ModalConta from "./modalConta";
import "./index.scss";

const PAGE_SIZE = 20;

export default function AdminContas() {
  const [resultado, setResultado] = useState(null);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const navigate = useNavigate();
  const { openModal } = useModal();

  // Debounce simples do campo de busca — espera o usuário parar de digitar
  // antes de disparar a requisição (search casa com nome, e-mail ou CPF).
  useEffect(() => {
    const t = setTimeout(() => {
      setPagina(1);
      setBusca(buscaInput);
    }, 400);

    return () => clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const r = await callApi(listarContas, true, { search: busca || undefined, page: pagina, pageSize: PAGE_SIZE });
      if (!ativo) return;

      if (!r) {
        navigate("/admin/login");
        return;
      }

      setResultado(r);
    })();

    return () => { ativo = false; };
  }, [busca, pagina, navigate]);

  // O modal é renderizado pelo ModalProvider, fora do BrowserRouter: a navegação para a
  // inscrição é feita por aqui, onde o router existe.
  function abrirConta(id) {
    openModal({
      customUI: fechar => (
        <ModalConta
          id={id}
          fechar={fechar}
          onVerInscricao={idInscricao => {
            fechar();
            navigate(`/admin/inscricoes/${idInscricao}`);
          }}
        />
      ),
    });
  }

  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / resultado.pageSize), 1) : 1;

  return (
    <div className="admin-lista admin-contas">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Contas</h1>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou CPF…"
          value={buscaInput}
          onChange={e => setBuscaInput(e.target.value)}
        />
      </div>

      {!resultado && <Carregamento />}

      {resultado &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>CPF</th>
              <th>Nascimento</th>
              <th>Inscrição</th>
              <th>Situação</th>
              <th>Criada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {resultado.items.length === 0 &&
              <tr className="vazio"><td colSpan={7}>Nenhuma conta encontrada.</td></tr>
            }

            {resultado.items.map(item => (
              <tr key={item.id}>
                <td>
                  <span className="nome">{item.name || "—"}</span>
                  <span className="email">{item.email}</span>
                </td>
                <td>{item.cpf || "—"}</td>
                <td>{item.birthDate ? converterDataUTCParaLocalSemMudarDia(item.birthDate) : "—"}</td>
                <td>{item.latestEnrollmentProtocol || "Sem inscrição"}</td>
                <td>
                  <span className={"admin-badge " + (item.isActive ? "ativo" : "inativo")}>
                    {item.isActive ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>{converterDataUTCParaLocalSemMudarDia(item.createdAt)}</td>
                <td className="acoes">
                  <button type="button" onClick={() => abrirConta(item.id)}>Ver dados</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }

      {resultado && resultado.total > 0 &&
        <div className="paginacao">
          <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
          <span>Página {resultado.page} de {totalPaginas} · {resultado.total} contas</span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
        </div>
      }
    </div>
  );
}
