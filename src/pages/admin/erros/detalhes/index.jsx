import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getErro } from "../../../../api/services/admin/erros";
import { formatarDataHora } from "../../relatorios/util";
import Carregamento from "../../../../components/carregamento";
import { Info } from "../../componentes/dadosCandidato";
import { nomeCurto, rotuloUsuario, situacaoStatus } from "../util";
import "./index.scss";

export default function AdminErroDetalhes() {
  const { id } = useParams();
  const [log, setLog] = useState(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let ativo = true;
    setLog(null);
    setNaoEncontrado(false);

    (async () => {
      const r = await callApi(getErro, true, id);
      if (!ativo) return;
      if (r) setLog(r);
      else setNaoEncontrado(true);
    })();

    return () => { ativo = false; };
  }, [id]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoParaCopiar(log));
      toast.success("Detalhes copiados.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  if (naoEncontrado) {
    return (
      <div className="admin-erro-detalhes">
        <Link to="/admin/erros" className="voltar">← Log de erros</Link>
        <p>Registro de erro não encontrado — pode ter expirado (os registros ficam 90 dias).</p>
      </div>
    );
  }

  if (!log) return <Carregamento />;

  const status = situacaoStatus(log.statusCode);

  return (
    <div className="admin-erro-detalhes">
      <Link to="/admin/erros" className="voltar">← Log de erros</Link>

      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Log de erros · {formatarDataHora(log.occurredAt)}</p>
          <h1>{log.exceptionMessage || log.message}</h1>
        </div>
        <button type="button" className="btn-fantasma" onClick={copiar}>Copiar detalhes</button>
      </div>

      <section className="secao-inscricao">
        <h2>Resumo</h2>
        <div className="grade-info">
          <Info rotulo="Status" valor={<span className={"status-erro " + status.classe}>{status.rotulo}</span>} />
          <Info rotulo="Nível" valor={log.level} />
          <Info rotulo="Origem" valor={nomeCurto(log.source)} />
          <Info rotulo="Exceção" valor={log.exceptionType} />
        </div>
        <Info rotulo="Mensagem do log" valor={log.message} />
      </section>

      <section className="secao-inscricao">
        <h2>Requisição</h2>
        <div className="grade-info">
          <Info rotulo="Rota" valor={log.path ? `${log.httpMethod} ${log.path}${log.queryString || ""}` : null} />
          <Info rotulo="Usuário" valor={log.userName ? rotuloUsuario(log) : "Anônimo / fora de requisição"} />
          <Info rotulo="E-mail" valor={log.userEmail} />
          <Info rotulo="Id do usuário" valor={log.userId} />
          <Info rotulo="IP" valor={log.clientIp} />
          <Info rotulo="TraceId" valor={log.traceId} />
        </div>
        <Info rotulo="Navegador" valor={log.userAgent} />
      </section>

      {log.related.length > 0 &&
        <section className="secao-inscricao">
          <h2>Na mesma requisição</h2>
          <p className="ajuda">
            Outros erros registrados durante a mesma chamada — normalmente um deles é a causa e o
            outro, a mensagem que voltou para quem usava o sistema.
          </p>
          <ul className="relacionados">
            {log.related.map(r => {
              const s = situacaoStatus(r.statusCode);
              return (
                <li key={r.id}>
                  <Link to={`/admin/erros/${r.id}`}>
                    <span className={"status-erro " + s.classe}>{s.rotulo}</span>
                    <span className="texto">{r.exceptionMessage || r.message}</span>
                    <span className="origem">{nomeCurto(r.source)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      }

      <section className="secao-inscricao">
        <h2>Detalhe técnico</h2>
        {log.exceptionDetail
          ? <pre className="pilha">{log.exceptionDetail}</pre>
          : <p className="ajuda">Este registro não tem exceção associada.</p>
        }
      </section>
    </div>
  );
}

function textoParaCopiar(log) {
  return [
    `Quando: ${formatarDataHora(log.occurredAt)} (${log.occurredAt})`,
    `Status: ${log.statusCode ?? "—"} · Nível: ${log.level} · Origem: ${log.source}`,
    `Rota: ${log.httpMethod ?? ""} ${log.path ?? "—"}${log.queryString ?? ""}`,
    `Usuário: ${log.userName ?? "—"} (${log.userRole ?? "—"}) · ${log.userEmail ?? ""}`,
    `TraceId: ${log.traceId ?? "—"}`,
    `Mensagem: ${log.message}`,
    "",
    log.exceptionDetail ?? "",
  ].join("\n");
}
