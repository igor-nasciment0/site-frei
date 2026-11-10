import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import callApi from "../../../api/callAPI";
import { listarErros } from "../../../api/services/admin/erros";
import { formatarDataHora } from "../relatorios/util";
import Carregamento from "../../../components/carregamento";
import { nomeCurto, rotuloUsuario, situacaoStatus } from "./util";
import "./index.scss";

const TAMANHO_PAGINA = 50;

const TIPOS = [
  { valor: "", rotulo: "Todos" },
  { valor: "server", rotulo: "Falhas internas (5xx e sem status)" },
  { valor: "client", rotulo: "Recusas (4xx)" },
];

export default function AdminErros() {
  const [resultado, setResultado] = useState(null);
  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const navigate = useNavigate();

  // Espera parar de digitar antes de buscar.
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
      const r = await callApi(listarErros, true, { busca, tipo, de, ate, pagina, tamanhoPagina: TAMANHO_PAGINA });
      if (!ativo) return;
      if (r) setResultado(r);
    })();

    return () => { ativo = false; };
  }, [busca, tipo, de, ate, pagina, versao]);

  function mudarFiltro(setter) {
    return e => {
      setPagina(1);
      setter(e.target.value);
    };
  }

  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / resultado.pageSize), 1) : 1;

  return (
    <div className="admin-lista admin-erros">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Log de erros</h1>
        <button type="button" className="btn-fantasma" onClick={() => setVersao(v => v + 1)}>Atualizar</button>
      </div>

      <p className="aviso">
        Todo erro registrado pela API: falhas internas (exceções, e-mail que não foi enviado,
        provedor de pagamento fora do ar) e recusas devolvidas ao usuário (validação, regra de
        negócio). Os registros ficam 90 dias.
      </p>

      <div className="filtros">
        <input
          type="text"
          className="busca"
          placeholder="Buscar por mensagem, rota, usuário, e-mail ou traceId…"
          value={buscaInput}
          onChange={e => setBuscaInput(e.target.value)}
        />
        <select value={tipo} onChange={mudarFiltro(setTipo)} aria-label="Tipo de erro">
          {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
        <label>
          De
          <input type="date" value={de} onChange={mudarFiltro(setDe)} />
        </label>
        <label>
          Até
          <input type="date" value={ate} onChange={mudarFiltro(setAte)} />
        </label>
      </div>

      {!resultado && <Carregamento />}

      {resultado &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Status</th>
              <th>Rota</th>
              <th>Mensagem</th>
              <th>Usuário</th>
            </tr>
          </thead>
          <tbody>
            {resultado.items.length === 0 &&
              <tr className="vazio"><td colSpan={5}>Nenhum erro encontrado.</td></tr>
            }

            {resultado.items.map(log => {
              const status = situacaoStatus(log.statusCode);
              return (
                <tr
                  key={log.id}
                  className="linha-erro"
                  tabIndex={0}
                  role="link"
                  onClick={() => navigate(`/admin/erros/${log.id}`)}
                  onKeyDown={e => { if (e.key === "Enter") navigate(`/admin/erros/${log.id}`); }}
                >
                  <td className="quando">{formatarDataHora(log.occurredAt)}</td>
                  <td><span className={"status-erro " + status.classe}>{status.rotulo}</span></td>
                  <td className="rota">
                    {log.path ? <><span className="metodo">{log.httpMethod}</span> {log.path}</> : "—"}
                  </td>
                  <td className="mensagem">
                    <span className="texto">{log.exceptionMessage || log.message}</span>
                    <span className="origem">{nomeCurto(log.source)}</span>
                  </td>
                  <td>{rotuloUsuario(log)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }

      {resultado && resultado.total > 0 &&
        <div className="paginacao">
          <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
          <span>Página {resultado.page} de {totalPaginas} · {resultado.total} registros</span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
        </div>
      }
    </div>
  );
}
