import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import {
  listarTiposProva, getTipoProva, criarTipoProva, atualizarTipoProva,
} from "../../../../api/services/admin/provaPresencial";
import { listarCursos } from "../../../../api/services/admin/cursos";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

export default function AdminTipoProvaForm() {
  const { id } = useParams();
  const editando = !!id;
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [cursos, setCursos] = useState([]);
  // curso → nome do outro tipo ativo que já o usa
  const [usados, setUsados] = useState({});
  const [dados, setDados] = useState({ name: "", priority: 0, courseCodes: [], isActive: true });

  useEffect(() => {
    (async () => {
      const [listaCursos, tipos, tipo] = await Promise.all([
        callApi(listarCursos, true),
        callApi(listarTiposProva, true),
        editando ? callApi(getTipoProva, true, id) : Promise.resolve(null),
      ]);

      if (editando && !tipo) {
        navigate("/admin/prova/tipos");
        return;
      }

      setCursos(Array.isArray(listaCursos) ? listaCursos : []);
      const mapa = {};
      for (const t of Array.isArray(tipos) ? tipos : []) {
        if (t.id === id || !t.isActive) continue;
        for (const c of t.courseCodes) mapa[c] = t.name;
      }
      setUsados(mapa);
      if (tipo) setDados({ name: tipo.name, priority: tipo.priority, courseCodes: tipo.courseCodes, isActive: tipo.isActive });
      setCarregando(false);
    })();
  }, [id]);

  function alternarCurso(codigo) {
    setDados(d => ({
      ...d,
      courseCodes: d.courseCodes.includes(codigo)
        ? d.courseCodes.filter(c => c !== codigo)
        : [...d.courseCodes, codigo],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!dados.name.trim()) return toast.error("Informe o nome do tipo de prova.");
    if (dados.courseCodes.length === 0) return toast.error("Escolha ao menos um curso.");

    const payload = { ...dados, name: dados.name.trim(), priority: Number(dados.priority) || 0 };
    setSalvando(true);
    const r = editando
      ? await callApi(atualizarTipoProva, true, id, payload)
      : await callApi(criarTipoProva, true, payload);
    setSalvando(false);

    if (r?.id) {
      toast.success(editando ? "Tipo de prova atualizado!" : "Tipo de prova criado!");
      navigate("/admin/prova/tipos");
    }
  }

  if (carregando) return <Carregamento />;

  // Cursos do cadastro + algum código do tipo que não esteja mais no cadastro.
  const codigos = new Set(cursos.map(c => c.code));
  const orfaos = dados.courseCodes.filter(c => !codigos.has(c));

  return (
    <div className="admin-prova-form">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Prova presencial</p>
        <h1>{editando ? "Editar tipo de prova" : "Novo tipo de prova"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={salvar}>
          <div className="grade">
            <div className="campo">
              <label htmlFor="name">Nome</label>
              <input id="name" type="text" maxLength={100} placeholder="ex.: 9º ano"
                value={dados.name} onChange={e => setDados({ ...dados, name: e.target.value })} />
            </div>

            <div className="campo">
              <label htmlFor="priority">Prioridade</label>
              <input id="priority" type="number" step="1"
                value={dados.priority} onChange={e => setDados({ ...dados, priority: e.target.value })} />
              <span className="ajuda">Maior número = alocado primeiro. Numa sala com mais de um tipo, ocupa as carteiras antes.</span>
            </div>

            <div className="campo checkbox">
              <input id="isActive" type="checkbox" checked={dados.isActive}
                onChange={e => setDados({ ...dados, isActive: e.target.checked })} />
              <label htmlFor="isActive">Tipo de prova ativo</label>
            </div>
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao"><h3>Cursos que fazem esta prova</h3></div>
            <div className="lista-opcoes">
              {cursos.map(curso => {
                const outro = usados[curso.code];
                const bloqueado = !!outro && dados.isActive && !dados.courseCodes.includes(curso.code);
                return (
                  <label key={curso.code} className={bloqueado ? "desabilitado" : ""}>
                    <input type="checkbox" disabled={bloqueado}
                      checked={dados.courseCodes.includes(curso.code)}
                      onChange={() => alternarCurso(curso.code)} />
                    <span>
                      {curso.code} — {curso.name}
                      {!curso.isActive && <small>Curso inativo</small>}
                      {outro && <small>Já está em &quot;{outro}&quot;</small>}
                    </span>
                  </label>
                );
              })}
              {orfaos.map(codigo => (
                <label key={codigo}>
                  <input type="checkbox" checked onChange={() => alternarCurso(codigo)} />
                  <span>{codigo}<small>Não está mais no cadastro de cursos</small></span>
                </label>
              ))}
            </div>
          </div>

          <div className="rodape-form">
            <Link to="/admin/prova/tipos" className="btn-fantasma">Cancelar</Link>
            <button disabled={salvando} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar tipo de prova"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
