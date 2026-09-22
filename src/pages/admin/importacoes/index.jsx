import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import {
  getStatusImportacoes,
  importarMatriculados,
  importarInadimplentes,
} from "../../../api/services/admin/importacoes";
import Carregamento from "../../../components/carregamento";
import ToasterContainer from "../../../components/toaster_container";
import RegistrosImportados from "./registros";
import "./index.scss";

const IMPORTACOES = [
  {
    chave: "enrolledStudents",
    titulo: "Alunos matriculados",
    colunas: "nr_ano, id_aluno, ds_cpf, ds_rg, id_curso",
    servico: importarMatriculados,
    descricao:
      "Identifica o aluno interno — quem já cursa inglês e escolheu a continuidade faz nivelamento na própria turma, sem prova do vestibular.",
    efeito: "Substitui apenas os anos presentes no arquivo. Anos anteriores são preservados.",
  },
  {
    chave: "delinquentStudents",
    titulo: "Alunos inadimplentes",
    colunas: "nr_ano, id_aluno, ds_cpf, ds_rg, id_curso, nm_curso, qtd_pendentes",
    servico: importarInadimplentes,
    descricao:
      "Bloqueia a inscrição de quem tem 2 ou mais mensalidades pendentes no ano de referência (ano da edição ativa do vestibular menos 1).",
    efeito: "Substitui apenas os anos presentes no arquivo. Anos anteriores são preservados.",
  },
];

export default function AdminImportacoes() {
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(getStatusImportacoes, true);

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setStatus(r);
  }

  return (
    <div className="admin-lista admin-importacoes">
      <ToasterContainer />

      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Importações</h1>
      </div>

      <p className="aviso">
        Arquivos CSV do sistema acadêmico. O separador (<code>;</code> ou <code>,</code>) é detectado
        automaticamente e as colunas são lidas pelo nome no cabeçalho, não pela posição.
      </p>

      {!status && <Carregamento />}

      {status &&
        <div className="cartoes">
          {IMPORTACOES.map(config =>
            <CartaoImportacao
              key={config.chave}
              config={config}
              status={status[config.chave]}
              aoImportar={carregar}
            />
          )}
        </div>
      }

      <RegistrosImportados />
    </div>
  );
}

function CartaoImportacao({ config, status, aoImportar }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function selecionar(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;

    if (config.destrutivo &&
      !confirm(`Isso substitui TODOS os registros de "${config.titulo}". Continuar?`))
      return;

    setEnviando(true);
    setResultado(null);

    const r = await callApi(config.servico, true, arquivo);

    setEnviando(false);

    if (!r) return;

    setResultado(r);
    toast.success(`${r.imported} registro(s) importado(s).`);
    aoImportar();
  }

  return (
    <div className="cartao-importacao">
      <div className="topo">
        <h2>{config.titulo}</h2>
        <code className="colunas">{config.colunas}</code>
      </div>

      <p className="descricao">{config.descricao}</p>
      <p className={"efeito" + (config.destrutivo ? " destrutivo" : "")}>{config.efeito}</p>

      <div className="situacao">
        <div>
          <span className="rotulo">Registros na base</span>
          <span className="valor">{status?.totalRecords ?? 0}</span>
        </div>
        <div>
          <span className="rotulo">Último envio</span>
          <span className="valor">
            {status?.lastImportAt
              ? new Date(status.lastImportAt).toLocaleString("pt-BR")
              : "Nunca"}
          </span>
        </div>
      </div>

      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={selecionar} hidden />

      <button
        type="button"
        className="btn-primario"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
      >
        {enviando ? "Importando…" : "Enviar CSV"}
      </button>

      {resultado &&
        <div className="resultado">
          <p>
            {resultado.totalRows} linha(s) lida(s) · <strong>{resultado.imported} importada(s)</strong>
            {resultado.skipped > 0 && ` · ${resultado.skipped} ignorada(s)`}
          </p>

          {resultado.errors?.length > 0 &&
            <ul className="erros">
              {resultado.errors.slice(0, 20).map((erro, i) =>
                <li key={i}>Linha {erro.line}: {erro.reason}</li>
              )}
              {resultado.errors.length > 20 &&
                <li>… e mais {resultado.errors.length - 20} erro(s).</li>
              }
            </ul>
          }
        </div>
      }
    </div>
  );
}
