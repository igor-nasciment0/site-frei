import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getSalaProva, criarSalaProva, atualizarSalaProva } from "../../../../api/services/admin/provaPresencial";
import Carregamento from "../../../../components/carregamento";
import "../prova.scss";

// Valores iniciais de uma sala nova: todas as salas de hoje ficam no Instituto.
const NOVA_SALA = {
  name: "",
  seats: 0,
  order: 0,
  schoolName: "Instituto Social Nossa Senhora de Fátima",
  address: "Av. Coronel Octaviano de Freitas Costa, 463 - Veleiros, São Paulo - SP, 04773-000",
  isActive: true,
};

export default function AdminSalaProvaForm() {
  const { id } = useParams();
  const editando = !!id;
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [dados, setDados] = useState(NOVA_SALA);

  useEffect(() => {
    if (!editando) return;
    (async () => {
      const sala = await callApi(getSalaProva, true, id);
      if (!sala) {
        navigate("/admin/prova/salas");
        return;
      }
      setDados({
        name: sala.name, seats: sala.seats, order: sala.order,
        schoolName: sala.schoolName, address: sala.address, isActive: sala.isActive,
      });
      setCarregando(false);
    })();
  }, [id]);

  const mudar = campo => e =>
    setDados({ ...dados, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function salvar(e) {
    e.preventDefault();
    if (!dados.name.trim()) return toast.error("Informe o nome da sala.");

    const payload = {
      ...dados,
      name: dados.name.trim(),
      seats: Math.max(0, parseInt(dados.seats, 10) || 0),
      order: parseInt(dados.order, 10) || 0,
    };

    setSalvando(true);
    const r = editando
      ? await callApi(atualizarSalaProva, true, id, payload)
      : await callApi(criarSalaProva, true, payload);
    setSalvando(false);

    if (r?.id) {
      toast.success(editando ? "Sala atualizada!" : "Sala criada!");
      navigate("/admin/prova/salas");
    }
  }

  if (carregando) return <Carregamento />;

  return (
    <div className="admin-prova-form">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Prova presencial</p>
        <h1>{editando ? "Editar sala" : "Nova sala"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={salvar}>
          <div className="grade">
            <div className="campo">
              <label htmlFor="name">Nome da sala</label>
              <input id="name" type="text" maxLength={100} placeholder="ex.: Sala 24" value={dados.name} onChange={mudar("name")} />
              <span className="ajuda">É o que o candidato vê no Acompanhamento e o que sai na lista de porta.</span>
            </div>

            <div className="campo">
              <label htmlFor="seats">Carteiras</label>
              <input id="seats" type="number" min="0" max="1000" step="1" value={dados.seats} onChange={mudar("seats")} />
              <span className="ajuda">Quantos candidatos cabem por período. 0 = a sala não recebe ninguém.</span>
            </div>

            <div className="campo">
              <label htmlFor="order">Ordem</label>
              <input id="order" type="number" step="1" value={dados.order} onChange={mudar("order")} />
              <span className="ajuda">A alocação enche as salas nesta ordem (menor primeiro).</span>
            </div>

            <div className="campo checkbox">
              <input id="isActive" type="checkbox" checked={dados.isActive} onChange={mudar("isActive")} />
              <label htmlFor="isActive">Sala ativa</label>
            </div>

            <div className="campo largo">
              <label htmlFor="schoolName">Escola</label>
              <input id="schoolName" type="text" maxLength={200} value={dados.schoolName} onChange={mudar("schoolName")} />
            </div>

            <div className="campo largo">
              <label htmlFor="address">Endereço</label>
              <input id="address" type="text" maxLength={300} value={dados.address} onChange={mudar("address")} />
            </div>
          </div>

          <div className="rodape-form">
            <Link to="/admin/prova/salas" className="btn-fantasma">Cancelar</Link>
            <button disabled={salvando} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar sala"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
