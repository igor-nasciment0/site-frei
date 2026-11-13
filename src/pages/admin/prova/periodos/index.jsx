import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import {
  listarPeriodosProva, listarSalasProva, listarTiposProva, desativarPeriodoProva,
} from "../../../../api/services/admin/provaPresencial";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

export default function AdminPeriodosProva() {
  const [periodos, setPeriodos] = useState(null);
  const [salas, setSalas] = useState({});
  const [tipos, setTipos] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [p, s, t] = await Promise.all([
      callApi(listarPeriodosProva, true), callApi(listarSalasProva, false), callApi(listarTiposProva, false),
    ]);
    if (Array.isArray(s)) setSalas(Object.fromEntries(s.map(sala => [sala.id, sala])));
    if (Array.isArray(t)) setTipos(Object.fromEntries(t.map(tipo => [tipo.id, tipo.name])));
    setPeriodos(Array.isArray(p) ? p : []);
  }

  async function desativar(periodo) {
    if (!confirm(`Desativar o "${periodo.name}"? Quem já está alocado nele continua até a próxima rodada da alocação.`)) return;
    const r = await callApi(desativarPeriodoProva, true, periodo.id);
    if (r !== undefined) carregar();
  }

  // Carteiras das salas ativas usadas no período.
  const carteiras = periodo => periodo.rooms
    .map(r => salas[r.roomId])
    .filter(s => s?.isActive)
    .reduce((soma, s) => soma + s.seats, 0);

  return (
    <div className="admin-prova-lista">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Prova presencial</p>
          <h1>Períodos</h1>
        </div>
        <Link to="/admin/prova/periodos/novo" className="btn-primario">Novo período</Link>
      </div>

      <p className="aviso">
        Horários da prova, todos no dia da prova da edição ativa. Cada período diz quais salas são usadas
        e quais provas cada sala recebe — uma sala pode receber mais de um tipo de prova ao mesmo tempo.
        A alocação enche os períodos nesta ordem.
      </p>

      {!periodos && <Carregamento />}

      {periodos &&
        <table className="admin-table">
          <thead>
            <tr>
              <th className="numero">Ordem</th>
              <th>Período</th>
              <th>Horário</th>
              <th className="numero">Salas</th>
              <th className="numero">Carteiras</th>
              <th>Limites por grupo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {periodos.length === 0 &&
              <tr className="vazio"><td colSpan={8}>Nenhum período cadastrado ainda.</td></tr>
            }
            {periodos.map(periodo => (
              <tr key={periodo.id}>
                <td className="numero">{periodo.order}</td>
                <td><strong>{periodo.name}</strong></td>
                <td>{periodo.startTime} às {periodo.endTime}</td>
                <td className="numero">{periodo.rooms.length}</td>
                <td className="numero">{carteiras(periodo)}</td>
                <td className="cursos">
                  {(periodo.typeGroupLimits || []).length === 0
                    ? "—"
                    : periodo.typeGroupLimits.map(g => `${g.name || g.examTypeIds.map(t => tipos[t] || "?").join(" + ")}: ${g.maxAllocations}`).join(" · ")}
                </td>
                <td>
                  <span className={"admin-badge " + (periodo.isActive ? "ativo" : "inativo")}>
                    {periodo.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="acoes">
                  <Link to={`/admin/prova/periodos/${periodo.id}`}>Editar</Link>
                  {periodo.isActive && <button onClick={() => desativar(periodo)}>Desativar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}
