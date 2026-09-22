import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import {
  getInscricao,
  resetarSenha,
  resetarPagamento,
  inserirPagamentoManual,
  removerInscricao,
} from "../../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import DadosCandidato, { Info } from "../../componentes/dadosCandidato";
import "./index.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

const PAYMENT_STATUS_LABEL = {
  Pending: "Pendente",
  Paid: "Pago",
  Expired: "Expirado",
  Failed: "Falhou",
  Canceled: "Cancelado",
};

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

      <Pagamento inscricao={inscricao} aoAtualizar={carregar} />

      <ResetarSenha inscricaoId={inscricao.id} nomeCandidato={student.name} />

      <DadosCandidato candidato={student} />

      <RemoverInscricao inscricaoId={inscricao.id} protocolo={inscricao.protocol} nomeCandidato={student.name} />
    </div>
  );
}

// Zona de perigo: apaga o documento da inscrição do banco (curso, status, dados de prova e
// todos os campos de pagamento embutidos nela — não há coleção separada de pagamento por
// inscrição). Irreversível. A conta do candidato (User) não é afetada — ele pode se inscrever
// de novo do zero, se a edição ainda permitir.
function RemoverInscricao({ inscricaoId, protocolo, nomeCandidato }) {
  const navigate = useNavigate();
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    const confirmado = confirm(
      `Remover definitivamente a inscrição de "${nomeCandidato}" (protocolo ${protocolo})?\n\n` +
      "Isso apaga o registro desta inscrição e todas as informações de pagamento associadas a ela. " +
      "Não pode ser desfeito. A conta do candidato continua existindo — ele pode se inscrever de novo, se a edição ainda permitir."
    );
    if (!confirmado) return;

    setRemovendo(true);
    const r = await callApi(removerInscricao, true, inscricaoId);
    setRemovendo(false);

    if (r?.success) {
      toast.success("Inscrição removida.");
      navigate("/admin/inscricoes");
    }
  }

  return (
    <div className="secao-inscricao secao-perigo">
      <h2>Remover inscrição</h2>
      <p className="aviso">
        Apaga definitivamente o registro desta inscrição e todas as informações de pagamento associadas a ela. Ação irreversível — a conta do candidato não é afetada.
      </p>
      <button type="button" className="admin-btn-perigo" disabled={removendo} onClick={remover}>
        {removendo ? "Removendo…" : "Remover inscrição"}
      </button>
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

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(dataStringUTC) {
  return dataStringUTC ? new Date(dataStringUTC).toLocaleString("pt-BR") : "—";
}

// Mostra os campos de pagamento (PIX) da inscrição e permite duas ações administrativas
// que só afetam o pagamento, nunca a inscrição em si: remover a cobrança vigente (o
// candidato recebe uma nova, com QR code novo, ao reabrir o Acompanhamento) e registrar um
// pagamento recebido fora do PIX, sem precisar gerar QR code.
function Pagamento({ inscricao, aoAtualizar }) {
  const [resetando, setResetando] = useState(false);
  const [valorManual, setValorManual] = useState("");
  const [dataManual, setDataManual] = useState("");
  const [enviandoManual, setEnviandoManual] = useState(false);

  async function resetar() {
    if (!confirm("Remover as informações de pagamento desta inscrição? Uma cobrança PIX nova (com QR code novo) será gerada na próxima vez que o candidato abrir o Acompanhamento."))
      return;

    setResetando(true);
    const r = await callApi(resetarPagamento, true, inscricao.id);
    setResetando(false);

    if (r) {
      toast.success("Informações de pagamento removidas.");
      aoAtualizar();
    }
  }

  async function inserirManual() {
    if (!confirm("Marcar esta inscrição como paga manualmente?")) return;

    setEnviandoManual(true);
    const r = await callApi(inserirPagamentoManual, true, inscricao.id, {
      valor: valorManual ? Number(valorManual) : undefined,
      pagoEm: dataManual ? new Date(dataManual).toISOString() : undefined,
    });
    setEnviandoManual(false);

    if (r) {
      toast.success("Pagamento registrado manualmente.");
      setValorManual("");
      setDataManual("");
      aoAtualizar();
    }
  }

  const status = inscricao.paymentStatus;

  return (
    <div className="secao-inscricao secao-pagamento">
      <h2>Pagamento</h2>

      <div className="grade-info">
        <Info
          rotulo="Status"
          valor={<span className={"admin-badge status-" + (status || "").toLowerCase()}>{PAYMENT_STATUS_LABEL[status] || status}</span>}
        />
        <Info rotulo="Valor" valor={formatarMoeda(inscricao.paymentAmount)} />
        <Info rotulo="Pago em" valor={formatarDataHora(inscricao.paymentPaidAt)} />
        <Info rotulo="Cobrança vence em" valor={formatarDataHora(inscricao.paymentExpiresAt)} />
        <Info rotulo="Correlation ID (PIX)" valor={inscricao.paymentCorrelationId || "—"} />
      </div>

      {inscricao.paymentCopyPasteCode &&
        <div className="campo-copia-cola">
          <span className="rotulo">Código PIX copia-e-cola</span>
          <code>{inscricao.paymentCopyPasteCode}</code>
        </div>
      }

      <div className="acoes-pagamento">
        <div className="bloco-acao">
          <p className="aviso">
            Remove a cobrança atual; o candidato recebe uma cobrança nova (com QR code novo) ao reabrir o Acompanhamento.
          </p>
          <button type="button" className="admin-btn-perigo" disabled={resetando} onClick={resetar}>
            {resetando ? "Removendo…" : "Remover informações de pagamento"}
          </button>
        </div>

        <div className="bloco-acao">
          <p className="aviso">
            Marca a inscrição como paga sem gerar QR code — use para pagamentos recebidos fora do PIX.
          </p>
          <div className="linha-pagamento-manual">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor (opcional)"
              value={valorManual}
              onChange={e => setValorManual(e.target.value)}
            />
            <input
              type="datetime-local"
              value={dataManual}
              onChange={e => setDataManual(e.target.value)}
            />
            <button type="button" className="btn-primario" disabled={enviandoManual} onClick={inserirManual}>
              {enviandoManual ? "Registrando…" : "Inserir pagamento manual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
