import { useEffect, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { listarTiposProva, desativarTipoProva } from "../../../../api/services/admin/provaPresencial";
import { listarCursos } from "../../../../api/services/admin/cursos";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

export default function AdminTiposProva() {
  const [tipos, setTipos] = useState(null);
  const [cursos, setCursos] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [t, c] = await Promise.all([callApi(listarTiposProva, true), callApi(listarCursos, false)]);
    if (Array.isArray(c)) setCursos(Object.fromEntries(c.map(curso => [curso.code, curso.name])));
    setTipos(Array.isArray(t) ? t : []);
  }

  async function desativar(tipo) {
    if (!confirm(`Desativar o tipo de prova "${tipo.name}"? Os cursos dele passam a ficar "Sem tipo de prova" na próxima alocação.`)) return;
    const r = await callApi(desativarTipoProva, true, tipo.id);
    if (r !== undefined) carregar();
  }

  return (
    <div className="admin-prova-lista">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Prova presencial</p>
          <h1>Tipos de prova</h1>
        </div>
        <Link to="/admin/prova/tipos/novo" className="btn-primario">Novo tipo de prova</Link>
      </div>

      <p className="aviso">
        A prova que o candidato faz vem do curso: da 1ª opção ou, para o aluno interno com 2ª opção fora
        do inglês, da 2ª. Cada curso fica em um tipo só. Na alocação, o tipo de maior prioridade ocupa as
        carteiras primeiro.
      </p>

      {!tipos && <Carregamento />}

      {tipos &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tipo de prova</th>
              <th className="numero">Prioridade</th>
              <th>Cursos</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tipos.length === 0 &&
              <tr className="vazio"><td colSpan={5}>Nenhum tipo de prova cadastrado ainda.</td></tr>
            }
            {tipos.map(tipo => (
              <tr key={tipo.id}>
                <td><strong>{tipo.name}</strong></td>
                <td className="numero">{tipo.priority}</td>
                <td className="cursos">
                  {tipo.courseCodes.map(c => cursos[c] ? `${c} — ${cursos[c]}` : String(c)).join(" · ")}
                </td>
                <td>
                  <span className={"admin-badge " + (tipo.isActive ? "ativo" : "inativo")}>
                    {tipo.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="acoes">
                  <Link to={`/admin/prova/tipos/${tipo.id}`}>Editar</Link>
                  {tipo.isActive && <button onClick={() => desativar(tipo)}>Desativar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}
