import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import {
  listarMatriculados, criarMatriculado, atualizarMatriculado, removerMatriculado,
  listarInadimplentes, criarInadimplente, atualizarInadimplente, removerInadimplente,
} from "../../../api/services/admin/registrosImportados";
import { listarEdicoes } from "../../../api/services/admin/vestibular";
import useModal from "../../../util/useModal";
import Carregamento from "../../../components/carregamento";
import RegistroForm from "./registroForm";
import "./registros.scss";

const PAGE_SIZE = 20;

const TIPOS = {
  matriculas: {
    titulo: "Matrículas",
    temNome: false,
    listar: listarMatriculados,
    criar: criarMatriculado,
    atualizar: atualizarMatriculado,
    remover: removerMatriculado,
  },
  inadimplentes: {
    titulo: "Inadimplentes",
    temNome: true,
    listar: listarInadimplentes,
    criar: criarInadimplente,
    atualizar: atualizarInadimplente,
    remover: removerInadimplente,
  },
};

export default function RegistrosImportados() {
  const [tipo, setTipo] = useState("matriculas");
  const [anoPadrao, setAnoPadrao] = useState(null);

  const [anoInput, setAnoInput] = useState("");
  const [cpfInput, setCpfInput] = useState("");
  const [rgInput, setRgInput] = useState("");
  const [nomeInput, setNomeInput] = useState("");

  const [filtros, setFiltros] = useState(null); // só existe depois do ano padrão carregar
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [recarregarToken, setRecarregarToken] = useState(0);

  const navigate = useNavigate();
  const { openModal } = useModal();
  const config = TIPOS[tipo];

  // Distingue o preenchimento automático do ano padrão (ao carregar) de uma edição
  // feita pela pessoa usuária — só a segunda deve dobrar a busca via debounce.
  const interagiuRef = useRef(false);

  // Ano padrão: (ano da edição ativa do vestibular) - 1.
  useEffect(() => {
    (async () => {
      const edicoes = await callApi(listarEdicoes, true);
      if (!edicoes) return;

      const ativa = edicoes.find(e => e.isActive);
      const ano = ativa ? ativa.year - 1 : new Date().getFullYear() - 1;

      setAnoPadrao(ano);
      setAnoInput(String(ano));
      setFiltros({ ano, cpf: "", rg: "", nome: "" });
    })();
  }, []);

  // Debounce dos filtros de texto.
  useEffect(() => {
    if (filtros === null || !interagiuRef.current) return;

    const t = setTimeout(() => {
      setPagina(1);
      const anoNumero = anoInput.trim() === "" ? undefined : Number(anoInput);
      setFiltros({
        ano: Number.isFinite(anoNumero) ? anoNumero : undefined,
        cpf: cpfInput,
        rg: rgInput,
        nome: nomeInput,
      });
    }, 400);

    return () => clearTimeout(t);
  }, [anoInput, cpfInput, rgInput, nomeInput]);

  useEffect(() => {
    if (filtros === null) return;
    let ativo = true;

    (async () => {
      const params = {
        year: filtros.ano,
        cpf: filtros.cpf || undefined,
        rg: filtros.rg || undefined,
        page: pagina,
        pageSize: PAGE_SIZE,
      };
      if (config.temNome) params.name = filtros.nome || undefined;

      const r = await callApi(config.listar, true, params);
      if (!ativo) return;

      if (!r) {
        navigate("/admin/login");
        return;
      }

      setResultado(r);
    })();

    return () => { ativo = false; };
  }, [tipo, filtros, pagina, recarregarToken, navigate, config]);

  function editarFiltro(setter) {
    return evento => {
      interagiuRef.current = true;
      setter(evento.target.value);
    };
  }

  function trocarTipo(novoTipo) {
    if (novoTipo === tipo) return;
    setTipo(novoTipo);
    setPagina(1);
    setResultado(null);
    setNomeInput("");
  }

  function recarregar() {
    setRecarregarToken(t => t + 1);
  }

  function abrirForm(registro) {
    openModal({
      customUI: fechar => (
        <RegistroForm
          tipo={tipo}
          registro={registro}
          anoPadrao={anoPadrao}
          fechar={fechar}
          onSalvar={async dados => {
            const r = registro
              ? await callApi(config.atualizar, true, registro.id, dados)
              : await callApi(config.criar, true, dados);

            if (r) {
              toast.success(registro ? "Registro atualizado!" : "Registro criado!");
              fechar();
              recarregar();
            }
          }}
        />
      ),
    });
  }

  async function excluir(registro) {
    if (!confirm(`Remover o registro do aluno ${registro.studentId}?`)) return;

    const r = await callApi(config.remover, true, registro.id);
    if (r !== undefined) recarregar();
  }

  const totalPaginas = resultado ? Math.max(Math.ceil(resultado.total / resultado.pageSize), 1) : 1;

  return (
    <div className="admin-registros-importados">
      <div className="cabecalho-secao">
        <h2>Registros importados</h2>

        <div className="abas" role="tablist">
          {Object.entries(TIPOS).map(([chave, cfg]) =>
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={tipo === chave}
              className={tipo === chave ? "ativa" : ""}
              onClick={() => trocarTipo(chave)}
            >
              {cfg.titulo}
            </button>
          )}
        </div>
      </div>

      <div className="filtros">
        <div className="campo">
          <label htmlFor="filtro-ano">Ano</label>
          <input id="filtro-ano" type="number" value={anoInput} onChange={editarFiltro(setAnoInput)} />
        </div>

        <div className="campo">
          <label htmlFor="filtro-cpf">CPF</label>
          <input id="filtro-cpf" type="text" placeholder="Somente números ou com máscara" value={cpfInput} onChange={editarFiltro(setCpfInput)} />
        </div>

        <div className="campo">
          <label htmlFor="filtro-rg">RG</label>
          <input id="filtro-rg" type="text" value={rgInput} onChange={editarFiltro(setRgInput)} />
        </div>

        {config.temNome &&
          <div className="campo">
            <label htmlFor="filtro-nome">Nome</label>
            <input id="filtro-nome" type="text" value={nomeInput} onChange={editarFiltro(setNomeInput)} />
          </div>
        }

        <button type="button" className="btn-primario" onClick={() => abrirForm(null)}>
          Novo registro
        </button>
      </div>

      {!resultado && <Carregamento />}

      {resultado &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ano</th>
              <th>ID do aluno</th>
              {config.temNome && <th>Nome</th>}
              <th>CPF</th>
              <th>RG</th>
              <th>Curso</th>
              {tipo === "inadimplentes" && <th>Meses pendentes</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {resultado.items.length === 0 &&
              <tr className="vazio">
                <td colSpan={config.temNome ? 8 : 6}>Nenhum registro encontrado.</td>
              </tr>
            }

            {resultado.items.map(item =>
              <tr key={item.id}>
                <td>{item.year}</td>
                <td>{item.studentId}</td>
                {config.temNome && <td>{item.studentName || "—"}</td>}
                <td>{item.cpf}</td>
                <td>{item.rg}</td>
                <td>{tipo === "inadimplentes" ? (item.courseName || item.courseCode) : item.courseCode}</td>
                {tipo === "inadimplentes" && <td>{item.pendingCount}</td>}
                <td className="acoes">
                  <button type="button" onClick={() => abrirForm(item)}>Editar</button>
                  <button type="button" onClick={() => excluir(item)}>Remover</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      }

      {resultado && resultado.total > 0 &&
        <div className="paginacao">
          <button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</button>
          <span>Página {resultado.page} de {totalPaginas} · {resultado.total} registro(s)</span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</button>
        </div>
      }
    </div>
  );
}
