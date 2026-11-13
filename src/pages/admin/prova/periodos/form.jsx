import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import {
  getPeriodoProva, criarPeriodoProva, atualizarPeriodoProva, listarSalasProva, listarTiposProva,
} from "../../../../api/services/admin/provaPresencial";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

export default function AdminPeriodoProvaForm() {
  const { id } = useParams();
  const editando = !!id;
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salas, setSalas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [dados, setDados] = useState({ name: "", startTime: "08:00", endTime: "10:00", order: 1, isActive: true });
  // roomId → [examTypeIds]; sala fora do mapa = não usada no período
  const [config, setConfig] = useState({});
  const [descartadas, setDescartadas] = useState(0);
  // Limites por grupo de tipos de prova no período inteiro: [{ name, examTypeIds, maxAllocations }]
  const [grupos, setGrupos] = useState([]);

  useEffect(() => {
    (async () => {
      const [listaSalas, listaTipos, periodo] = await Promise.all([
        callApi(listarSalasProva, true),
        callApi(listarTiposProva, true),
        editando ? callApi(getPeriodoProva, true, id) : Promise.resolve(null),
      ]);

      if (editando && !periodo) {
        navigate("/admin/prova/periodos");
        return;
      }

      const salasAtivas = (Array.isArray(listaSalas) ? listaSalas : []).filter(s => s.isActive);
      const tiposAtivos = (Array.isArray(listaTipos) ? listaTipos : []).filter(t => t.isActive);
      setSalas(salasAtivas);
      setTipos(tiposAtivos);

      if (periodo) {
        setDados({ name: periodo.name, startTime: periodo.startTime, endTime: periodo.endTime, order: periodo.order, isActive: periodo.isActive });

        // A API recusa sala ou tipo inativo ao salvar: eles saem do formulário, com aviso.
        const idsSalas = new Set(salasAtivas.map(s => s.id));
        const idsTipos = new Set(tiposAtivos.map(t => t.id));
        const mapa = {};
        let fora = 0;
        for (const r of periodo.rooms) {
          const tiposValidos = r.examTypeIds.filter(t => idsTipos.has(t));
          if (!idsSalas.has(r.roomId) || tiposValidos.length === 0) { fora++; continue; }
          if (tiposValidos.length !== r.examTypeIds.length) fora++;
          mapa[r.roomId] = tiposValidos;
        }
        setConfig(mapa);

        const gruposValidos = [];
        for (const g of periodo.typeGroupLimits || []) {
          const tiposValidos = g.examTypeIds.filter(t => idsTipos.has(t));
          if (tiposValidos.length !== g.examTypeIds.length) fora++;
          if (tiposValidos.length > 0)
            gruposValidos.push({ name: g.name || "", examTypeIds: tiposValidos, maxAllocations: g.maxAllocations });
        }
        setGrupos(gruposValidos);
        setDescartadas(fora);
      }
      setCarregando(false);
    })();
  }, [id]);

  const mudar = campo => e =>
    setDados({ ...dados, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function alternarSala(salaId) {
    setConfig(c => {
      const novo = { ...c };
      if (novo[salaId]) delete novo[salaId];
      else novo[salaId] = tipos.map(t => t.id); // ao marcar a sala, já vem com todos os tipos
      return novo;
    });
  }

  function alternarTipo(salaId, tipoId) {
    setConfig(c => {
      const atuais = c[salaId] || [];
      const tiposSala = atuais.includes(tipoId) ? atuais.filter(t => t !== tipoId) : [...atuais, tipoId];
      const novo = { ...c };
      if (tiposSala.length === 0) delete novo[salaId];
      else novo[salaId] = tiposSala;
      return novo;
    });
  }

  const mudarGrupo = (indice, campo, valor) =>
    setGrupos(gs => gs.map((g, i) => (i === indice ? { ...g, [campo]: valor } : g)));

  function alternarTipoGrupo(indice, tipoId) {
    setGrupos(gs => gs.map((g, i) => i !== indice ? g : {
      ...g,
      examTypeIds: g.examTypeIds.includes(tipoId) ? g.examTypeIds.filter(t => t !== tipoId) : [...g.examTypeIds, tipoId],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    if (!dados.name.trim()) return toast.error("Informe o nome do período.");
    if (!dados.startTime || !dados.endTime || dados.startTime >= dados.endTime)
      return toast.error("O horário de início deve ser anterior ao de fim.");
    if (grupos.some(g => g.examTypeIds.length === 0))
      return toast.error("Cada grupo de limite precisa de ao menos um tipo de prova.");
    if (grupos.some(g => g.maxAllocations === "" || !(Number(g.maxAllocations) >= 0)))
      return toast.error("Informe o limite de cada grupo (0 ou mais).");

    const payload = {
      ...dados,
      name: dados.name.trim(),
      order: parseInt(dados.order, 10) || 0,
      // na ordem das salas
      rooms: salas.filter(s => config[s.id]).map(s => ({ roomId: s.id, examTypeIds: config[s.id] })),
      typeGroupLimits: grupos.map(g => ({
        name: g.name.trim(),
        examTypeIds: g.examTypeIds,
        maxAllocations: parseInt(g.maxAllocations, 10) || 0,
      })),
    };

    setSalvando(true);
    const r = editando
      ? await callApi(atualizarPeriodoProva, true, id, payload)
      : await callApi(criarPeriodoProva, true, payload);
    setSalvando(false);

    if (r?.id) {
      toast.success(editando ? "Período atualizado!" : "Período criado!");
      navigate("/admin/prova/periodos");
    }
  }

  if (carregando) return <Carregamento />;

  const usadas = salas.filter(s => config[s.id]);
  const totalCarteiras = usadas.reduce((soma, s) => soma + s.seats, 0);
  const carteirasPorTipo = Object.fromEntries(tipos.map(t => [
    t.id, usadas.filter(s => config[s.id].includes(t.id)).reduce((soma, s) => soma + s.seats, 0),
  ]));

  return (
    <div className="admin-prova-form">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Prova presencial</p>
        <h1>{editando ? "Editar período" : "Novo período"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={salvar}>
          <div className="grade">
            <div className="campo">
              <label htmlFor="name">Nome</label>
              <input id="name" type="text" maxLength={100} placeholder="ex.: 1º período" value={dados.name} onChange={mudar("name")} />
            </div>

            <div className="campo">
              <label htmlFor="order">Ordem</label>
              <input id="order" type="number" step="1" value={dados.order} onChange={mudar("order")} />
              <span className="ajuda">A alocação enche os períodos nesta ordem (menor primeiro).</span>
            </div>

            <div className="campo">
              <label htmlFor="startTime">Início</label>
              <input id="startTime" type="time" value={dados.startTime} onChange={mudar("startTime")} />
              <span className="ajuda">É o horário que o candidato vê no Acompanhamento.</span>
            </div>

            <div className="campo">
              <label htmlFor="endTime">Fim</label>
              <input id="endTime" type="time" value={dados.endTime} onChange={mudar("endTime")} />
            </div>

            <div className="campo checkbox">
              <input id="isActive" type="checkbox" checked={dados.isActive} onChange={mudar("isActive")} />
              <label htmlFor="isActive">Período ativo</label>
            </div>
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao"><h3>Salas e provas do período</h3></div>
            <p className="aviso">
              Marque as salas usadas neste período e, em cada uma, as provas que ela recebe. Uma sala com
              mais de um tipo é dividida entre eles: o de maior prioridade ocupa as carteiras primeiro.
              {descartadas > 0 && ` ${descartadas} sala(s) ou prova(s) inativas foram tiradas deste período e saem ao salvar.`}
            </p>

            {salas.length === 0 || tipos.length === 0
              ? <p className="aviso">Cadastre salas e tipos de prova ativos antes de montar o período.</p>
              : (
                <div className="tabela-salas">
                  <table>
                    <thead>
                      <tr>
                        <th className="centro">Usar</th>
                        <th>Sala</th>
                        <th className="centro">Carteiras</th>
                        {tipos.map(t => <th key={t.id} className="centro">{t.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {salas.map(sala => {
                        const usada = !!config[sala.id];
                        return (
                          <tr key={sala.id} className={usada ? "" : "fora"}>
                            <td className="centro">
                              <input type="checkbox" aria-label={`Usar ${sala.name}`}
                                checked={usada} onChange={() => alternarSala(sala.id)} />
                            </td>
                            <td>{sala.name}</td>
                            <td className="centro">{sala.seats}</td>
                            {tipos.map(t => (
                              <td key={t.id} className="centro">
                                <input type="checkbox" aria-label={`${sala.name}: ${t.name}`}
                                  disabled={!usada}
                                  checked={usada && config[sala.id].includes(t.id)}
                                  onChange={() => alternarTipo(sala.id, t.id)} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td></td>
                        <td>{usadas.length} sala(s)</td>
                        <td className="centro">{totalCarteiras}</td>
                        {tipos.map(t => <td key={t.id} className="centro">{carteirasPorTipo[t.id]}</td>)}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao">
              <h3>Limites por grupo de provas</h3>
              <button type="button" className="btn-fantasma" disabled={tipos.length === 0}
                onClick={() => setGrupos([...grupos, { name: "", examTypeIds: [], maxAllocations: 0 }])}>
                Adicionar grupo
              </button>
            </div>
            <p className="aviso">
              Opcional. Limita quantos candidatos dos tipos do grupo, somados, são alocados neste período
              — em todas as salas juntas. Quem passar do limite vai para o próximo período. Dentro do
              grupo, o tipo de maior prioridade entra primeiro. Limite 0 = o grupo não faz prova neste
              período. Os tipos fora dos grupos ficam só com o limite das carteiras. Um tipo fica em um
              grupo só.
            </p>

            {grupos.length === 0 && <p className="aviso">Nenhum limite neste período.</p>}

            {grupos.map((grupo, indice) => (
              <div key={indice} className="grupo-limite">
                <div className="linha-grupo">
                  <div className="campo">
                    <label htmlFor={`grupo-nome-${indice}`}>Nome do grupo (opcional)</label>
                    <input id={`grupo-nome-${indice}`} type="text" maxLength={100} placeholder="ex.: Inglês avançado"
                      value={grupo.name} onChange={e => mudarGrupo(indice, "name", e.target.value)} />
                  </div>
                  <div className="campo">
                    <label htmlFor={`grupo-max-${indice}`}>Máximo de alocados</label>
                    <input id={`grupo-max-${indice}`} type="number" min="0" max="10000" step="1"
                      value={grupo.maxAllocations} onChange={e => mudarGrupo(indice, "maxAllocations", e.target.value)} />
                  </div>
                  <button type="button" className="admin-btn-perigo"
                    onClick={() => setGrupos(grupos.filter((_, i) => i !== indice))}>
                    Remover
                  </button>
                </div>
                <div className="lista-opcoes">
                  {tipos.map(t => {
                    const outro = grupos.findIndex((g, i) => i !== indice && g.examTypeIds.includes(t.id));
                    const bloqueado = outro >= 0;
                    return (
                      <label key={t.id} className={bloqueado ? "desabilitado" : ""}>
                        <input type="checkbox" disabled={bloqueado}
                          checked={grupo.examTypeIds.includes(t.id)}
                          onChange={() => alternarTipoGrupo(indice, t.id)} />
                        <span>
                          {t.name}
                          {bloqueado && <small>Já está em {grupos[outro].name ? `"${grupos[outro].name}"` : `outro grupo`}</small>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rodape-form">
            <Link to="/admin/prova/periodos" className="btn-fantasma">Cancelar</Link>
            <button disabled={salvando} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar período"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
