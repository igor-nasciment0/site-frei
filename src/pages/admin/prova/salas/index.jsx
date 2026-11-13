import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { listarSalasProva, desativarSalaProva } from "../../../../api/services/admin/provaPresencial";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

export default function AdminSalasProva() {
  const [salas, setSalas] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(listarSalasProva, true);
    setSalas(Array.isArray(r) ? r : []);
  }

  async function desativar(sala) {
    if (!confirm(`Desativar a sala "${sala.name}"?`)) return;
    const r = await callApi(desativarSalaProva, true, sala.id);
    if (r !== undefined) carregar();
  }

  const totalAtivas = (salas || []).filter(s => s.isActive).reduce((soma, s) => soma + s.seats, 0);

  return (
    <div className="admin-prova-lista">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Prova presencial</p>
          <h1>Salas</h1>
        </div>
        <Link to="/admin/prova/salas/nova" className="btn-primario">Nova sala</Link>
      </div>

      <p className="aviso">
        Valem para todas as edições. A quantidade de carteiras é a mesma em todos os períodos; sala com
        0 carteiras não recebe ninguém. Quais salas entram em cada período, e com quais provas, fica em Períodos.
      </p>

      {!salas && <Carregamento />}

      {salas &&
        <table className="admin-table">
          <thead>
            <tr>
              <th className="numero">Ordem</th>
              <th>Sala</th>
              <th>Escola</th>
              <th className="numero">Carteiras</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {salas.length === 0 &&
              <tr className="vazio"><td colSpan={6}>Nenhuma sala cadastrada ainda.</td></tr>
            }
            {salas.map(sala => (
              <tr key={sala.id}>
                <td className="numero">{sala.order}</td>
                <td><strong>{sala.name}</strong></td>
                <td>{sala.schoolName || "—"}</td>
                <td className="numero">{sala.seats}</td>
                <td>
                  <span className={"admin-badge " + (sala.isActive ? "ativo" : "inativo")}>
                    {sala.isActive ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="acoes">
                  <Link to={`/admin/prova/salas/${sala.id}`}>Editar</Link>
                  {sala.isActive && <button onClick={() => desativar(sala)}>Desativar</button>}
                </td>
              </tr>
            ))}
          </tbody>
          {salas.length > 0 &&
            <tfoot>
              <tr>
                <td colSpan={3}>Total (salas ativas)</td>
                <td className="numero">{totalAtivas}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          }
        </table>
      }
    </div>
  );
}
