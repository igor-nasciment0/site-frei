import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getInscricao, resetarSenha } from "../../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import DadosCandidato, { Info } from "../../componentes/dadosCandidato";
import "./index.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

export default function AdminInscricaoDetalhes() {
  const { id } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [id]);

  async function carregar() {
    const r = await callApi(getInscricao, true, id);

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setInscricao(r);
  }

  if (!inscricao) return <Carregamento />;

  const student = inscricao.student || {};

  return (
    <div className="admin-inscricao-detalhes">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Protocolo {inscricao.protocol}</h1>
        </div>
        <Link to="/admin/inscricoes" className="btn-fantasma">← Voltar para a lista</Link>
      </div>

      <div className="secao-inscricao">
        <h2>Inscrição</h2>
        <div className="grade-info">
          <Info rotulo="Status" valor={<span className={"admin-badge status-" + inscricao.status?.toLowerCase()}>{STATUS_LABEL[inscricao.status] || inscricao.status}</span>} />
          <Info rotulo="Inscrito em" valor={converterDataUTCParaLocalSemMudarDia(inscricao.createdAt)} />
          <Info rotulo="Última atualização" valor={converterDataUTCParaLocalSemMudarDia(inscricao.modifiedAt)} />
          <Info rotulo="Sala da prova" valor={inscricao.testRoom || "—"} />
          <Info rotulo="Horário da prova" valor={inscricao.testTime || "—"} />
        </div>

        <div className="grade-info">
          <Info rotulo="1ª opção" valor={inscricao.firstChoice ? `${inscricao.firstChoice.courseName} — ${inscricao.firstChoice.periodName}` : "—"} />
          <Info rotulo="2ª opção" valor={inscricao.secondChoice ? `${inscricao.secondChoice.courseName} — ${inscricao.secondChoice.periodName}` : "—"} />
        </div>
      </div>

      <ResetarSenha inscricaoId={inscricao.id} nomeCandidato={student.name} />

      <DadosCandidato candidato={student} />
    </div>
  );
}

// Ação de resetar a senha do candidato dono da inscrição. Se o campo de nova
// senha for deixado em branco, o backend gera uma senha aleatória — nesse
// caso ela só existe nesta resposta, então é exibida (uma única vez) para o
// admin copiar e repassar ao candidato.
function ResetarSenha({ inscricaoId, nomeCandidato }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function resetar() {
    if (!confirm(`Resetar a senha de "${nomeCandidato}"? A senha atual deixará de funcionar imediatamente.`)) return;

    setEnviando(true);
    const r = await callApi(resetarSenha, true, inscricaoId, novaSenha || undefined);
    setEnviando(false);

    if (r?.success) {
      setSenhaGerada(r.newPassword);
      setNovaSenha("");
      toast.success("Senha resetada com sucesso!");
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(senhaGerada);
    toast.success("Senha copiada!");
  }

  return (
    <div className="secao-inscricao secao-reset-senha">
      <h2>Resetar senha do candidato</h2>
      <p className="aviso">
        Deixe o campo em branco para gerar uma senha aleatória, ou defina uma senha específica para repassar ao candidato.
      </p>

      <div className="linha-reset">
        <input
          type="text"
          placeholder="Nova senha (opcional)"
          value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)}
        />
        <button className="btn-primario" disabled={enviando} onClick={resetar}>
          {enviando ? "Resetando…" : "Resetar senha"}
        </button>
      </div>

      {senhaGerada &&
        <div className="senha-gerada">
          <span>Nova senha: <strong>{senhaGerada}</strong></span>
          <button className="btn-fantasma" onClick={copiar}>Copiar</button>
        </div>
      }
    </div>
  );
}
