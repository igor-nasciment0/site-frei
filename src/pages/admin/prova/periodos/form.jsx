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

  async function salvar(e) {
    e.preventDefault();
    if (!dados.name.trim()) return toast.error("Informe o nome do período.");
    if (!dados.startTime || !dados.endTime || dados.startTime >= dados.endTime)
      return toast.error("O horário de início deve ser anterior ao de fim.");

    const payload = {
      ...dados,
      name: dados.name.trim(),
      order: parseInt(dados.order, 10) || 0,
      // na ordem das salas
      rooms: salas.filter(s => config[s.id]).map(s => ({ roomId: s.id, examTypeIds: config[s.id] })),
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
