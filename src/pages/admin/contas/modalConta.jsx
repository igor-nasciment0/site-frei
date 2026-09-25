import { useEffect, useRef, useState } from "react";
import callApi from "../../../api/callAPI";
import toast from "react-hot-toast";
import { getConta, resetarSenhaConta } from "../../../api/services/admin/contas";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import DadosCandidato, { Info } from "../componentes/dadosCandidato";
import "./modalConta.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

// Dados da conta do candidato em modo somente leitura — o painel não edita contas; a única
// ação é resetar a senha (mesma do detalhe da inscrição). Sem senha informada, o backend gera
// uma aleatória que só existe nesta resposta, então é exibida uma vez para o admin repassar.
function ResetarSenha({ contaId, nomeCandidato }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function resetar() {
    if (!confirm(`Resetar a senha de "${nomeCandidato}"? A senha atual deixará de funcionar imediatamente.`)) return;

    setEnviando(true);
    const r = await callApi(resetarSenhaConta, true, contaId, novaSenha || undefined);
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
        <button type="button" className="btn-primario" disabled={enviando} onClick={resetar}>
          {enviando ? "Resetando…" : "Resetar senha"}
        </button>
      </div>

      {senhaGerada &&
        <div className="senha-gerada">
          <span>Nova senha: <strong>{senhaGerada}</strong></span>
          <button type="button" className="btn-fantasma" onClick={copiar}>Copiar</button>
        </div>
      }
    </div>
  );
}

// Dados da conta do candidato.
export default function ModalConta({ id, fechar, onVerInscricao }) {
  const [conta, setConta] = useState(null);
  const [falhou, setFalhou] = useState(false);
  const botaoFechar = useRef(null);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const r = await callApi(getConta, true, id);
      if (!ativo) return;

      if (r?.account) setConta(r);
      else setFalhou(true);
    })();

    return () => { ativo = false; };
  }, [id]);

  // O ModalProvider fecha no clique fora; Esc e o foco inicial ficam por conta daqui.
  useEffect(() => {
    botaoFechar.current?.focus();

    function aoTeclar(e) {
      if (e.key === "Escape") fechar();
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [fechar]);

  const account = conta?.account;

  return (
    <div className="modal-conta" role="dialog" aria-modal="true" aria-labelledby="modal-conta-titulo">
      <div className="topo">
        <div>
          <p className="eyebrow">Conta do candidato</p>
          <h2 id="modal-conta-titulo">{account?.name || (falhou ? "Conta" : "Carregando…")}</h2>
        </div>
        <button ref={botaoFechar} type="button" className="fechar" aria-label="Fechar" onClick={fechar}>×</button>
      </div>

      <div className="corpo">
        {!conta && !falhou && <Carregamento />}

        {falhou && <p className="mensagem">Não foi possível carregar os dados desta conta.</p>}

        {conta &&
          <>
            <div className="secao-inscricao">
              <h2>Conta</h2>
              <div className="grade-info">
                <Info
                  rotulo="Situação"
                  valor={<span className={"admin-badge " + (account.isActive ? "ativo" : "inativo")}>{account.isActive ? "Ativa" : "Inativa"}</span>}
                />
                <Info rotulo="Criada em" valor={converterDataUTCParaLocalSemMudarDia(account.createdAt)} />
                <Info rotulo="Última atualização" valor={account.modifiedAt ? converterDataUTCParaLocalSemMudarDia(account.modifiedAt) : "—"} />
              </div>
            </div>

            <div className="secao-inscricao">
              <h2>Inscrições</h2>
              {conta.enrollments.length === 0
                ? <p className="mensagem">Esta conta ainda não fez inscrição.</p>
                : <ul className="lista-inscricoes">
                  {conta.enrollments.map(inscricao => (
                    <li key={inscricao.id}>
                      <div>
                        <span className="protocolo">{inscricao.protocol}</span>
                        <span className="detalhe">
                          {inscricao.firstChoiceCourseName} — {inscricao.firstChoicePeriodName}
                          {" · "}{converterDataUTCParaLocalSemMudarDia(inscricao.createdAt)}
                        </span>
                      </div>
                      <div className="acoes-inscricao">
                        <span className={"admin-badge status-" + inscricao.status.toLowerCase()}>
                          {STATUS_LABEL[inscricao.status] || inscricao.status}
                        </span>
                        <button type="button" className="btn-fantasma" onClick={() => onVerInscricao(inscricao.id)}>
                          Ver inscrição
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              }
            </div>

            <ResetarSenha contaId={id} nomeCandidato={account.name} />

            <DadosCandidato candidato={account} />
          </>
        }
      </div>
    </div>
  );
}
