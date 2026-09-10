import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getDocumentoRGCandidato, getInscricao, resetarSenha } from "../../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
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

      <div className="secao-inscricao">
        <h2>Dados pessoais</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={student.name} />
          <Info rotulo="E-mail" valor={student.email} />
          <Info rotulo="Telefone" valor={student.phone} />
          <Info rotulo="CPF" valor={student.cpf} />
          <Info rotulo="Gênero" valor={student.gender} />
          <Info rotulo="Idade" valor={student.age != null ? `${student.age} anos` : "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Endereço</h2>
        <div className="grade-info">
          <Info rotulo="CEP" valor={student.address?.cep} />
          <Info rotulo="Rua" valor={student.address?.street} />
          <Info rotulo="Número" valor={student.address?.number} />
          <Info rotulo="Complemento" valor={student.address?.complement || "—"} />
          <Info rotulo="Bairro" valor={student.address?.neighborhood} />
          <Info rotulo="Cidade" valor={student.address?.city} />
          <Info rotulo="Estado" valor={student.address?.state} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Nascimento</h2>
        <div className="grade-info">
          <Info rotulo="Data" valor={student.birthInfo?.date ? converterDataUTCParaLocalSemMudarDia(student.birthInfo.date) : "—"} />
          <Info rotulo="Cidade" valor={student.birthInfo?.city} />
          <Info rotulo="Estado" valor={student.birthInfo?.state} />
          <Info rotulo="País" valor={student.birthInfo?.country} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Documento (RG)</h2>
        <div className="grade-info">
          <Info rotulo="Número" valor={student.rgInfo?.number} />
          <Info rotulo="Data de emissão" valor={student.rgInfo?.issueDate ? converterDataUTCParaLocalSemMudarDia(student.rgInfo.issueDate) : "—"} />
          <Info rotulo="Órgão emissor" valor={student.rgInfo?.issuingAuthority} />
          <Info
            rotulo="Anexo"
            valor={student.rgInfo?.hasDocument
              ? converterDataUTCParaLocalSemMudarDia(student.rgInfo.documentUploadedAt)
              : "Não enviado"}
          />
        </div>

        {student.rgInfo?.hasDocument && <AnexoRGCandidato userId={student.id} />}
      </div>

      <div className="secao-inscricao">
        <h2>Responsável primário</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={student.primaryResponsible?.name} />
          <Info rotulo="Parentesco" valor={student.primaryResponsible?.relationship} />
          <Info rotulo="E-mail" valor={student.primaryResponsible?.email} />
          <Info rotulo="Telefone" valor={student.primaryResponsible?.phone} />
          <Info rotulo="Telefone secundário" valor={student.primaryResponsible?.phoneSecondary || "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Responsável secundário</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={student.secondaryResponsible?.name} />
          <Info rotulo="Parentesco" valor={student.secondaryResponsible?.relationship} />
          <Info rotulo="E-mail" valor={student.secondaryResponsible?.email} />
          <Info rotulo="Telefone" valor={student.secondaryResponsible?.phone} />
          <Info rotulo="Telefone secundário" valor={student.secondaryResponsible?.phoneSecondary || "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Escolaridade</h2>
        <div className="grade-info">
          <Info rotulo="Escola atual" valor={student.schoolInfo?.currentSchool} />
          <Info rotulo="Série atual" valor={student.schoolInfo?.currentGrade} />
          <Info rotulo="Tipo de escola" valor={student.schoolInfo?.schoolType} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Informações gerais</h2>
        <div className="grade-info">
          <Info rotulo="Como conheceu o instituto" valor={student.generalInfo?.howDidYouKnow} />
          <Info rotulo="Renda mensal familiar" valor={student.generalInfo?.income != null ? formatarMoeda(student.generalInfo.income) : "—"} />
          <Info rotulo="Pessoas em casa" valor={student.generalInfo?.peopleAtHome} />
          <Info rotulo="Pessoas trabalhando" valor={student.generalInfo?.peopleWorking} />
        </div>
      </div>
    </div>
  );
}

function AnexoRGCandidato({ userId }) {
  const [abrindo, setAbrindo] = useState(false);

  async function abrir() {
    setAbrindo(true);
    const blob = await callApi(getDocumentoRGCandidato, true, userId);
    setAbrindo(false);

    if (!blob) return;

    // A URL de objeto é revogada só depois que a aba teve tempo de carregar o arquivo.
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  return (
    <button type="button" className="btn-fantasma" disabled={abrindo} onClick={abrir}>
      {abrindo ? "Abrindo…" : "Ver anexo do RG"}
    </button>
  );
}

function Info({ rotulo, valor }) {
  return (
    <div className="info">
      <span className="rotulo">{rotulo}</span>
      <span className="valor">{valor === "" || valor == null ? "—" : valor}</span>
    </div>
  );
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
