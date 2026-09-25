import { useEffect, useRef, useState } from "react";
import callApi from "../../../api/callAPI";
import toast from "react-hot-toast";
import { getConta, resetarSenhaConta, trocarEmailConta } from "../../../api/services/admin/contas";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import DadosCandidato, { Info } from "../componentes/dadosCandidato";
import "./modalConta.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

// Dados da conta do candidato. As únicas edições são trocar o e-mail de login e resetar a senha (mesma do detalhe da inscrição). Sem senha informada, o backend gera
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

// Troca o e-mail de login da conta. O backend valida formato, recusa e-mail de outra conta
// (ativa ou inativa) e grava em minúsculas; o erro chega por toast via callApi.
function TrocarEmail({ contaId, emailAtual, nomeCandidato, aoTrocar }) {
  const [novoEmail, setNovoEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function trocar(e) {
    e.preventDefault();

    const email = novoEmail.trim();
    if (!email) return;

    if (email === emailAtual) {
      toast.error("O novo e-mail é igual ao atual.");
      return;
    }

    if (!confirm(`Trocar o e-mail de "${nomeCandidato}" para "${email.toLowerCase()}"? O login passa a ser com o novo e-mail e o atual (${emailAtual}) deixa de funcionar imediatamente.`)) return;

    setEnviando(true);
    const r = await callApi(trocarEmailConta, true, contaId, email);
    setEnviando(false);

    if (r?.id) {
      toast.success("E-mail alterado com sucesso!");
      setNovoEmail("");
      aoTrocar();
    }
  }

  return (
    <div className="secao-inscricao secao-reset-senha">
      <h2>Trocar e-mail de login</h2>
      <p className="aviso">
        E-mail atual: <strong>{emailAtual}</strong>. A troca vale na hora; a pessoa não recebe aviso por e-mail.
      </p>

      <form className="linha-reset" onSubmit={trocar}>
        <input
          type="email"
          placeholder="Novo e-mail"
          value={novoEmail}
          onChange={e => setNovoEmail(e.target.value)}
          maxLength={150}
          required
        />
        <button type="submit" className="btn-primario" disabled={enviando}>
          {enviando ? "Trocando…" : "Trocar e-mail"}
        </button>
      </form>
    </div>
  );
}

// Dados da conta do candidato.
export default function ModalConta({ id, fechar, onVerInscricao, onAlterada }) {
  const [conta, setConta] = useState(null);
  const [falhou, setFalhou] = useState(false);
  const botaoFechar = useRef(null);

  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const r = await callApi(getConta, true, id);
      if (!ativo) return;

      if (r?.account) setConta(r);
      else setFalhou(true);
    })();

    return () => { ativo = false; };
  }, [id, versao]);

  function aoTrocarEmail() {
    setVersao(v => v + 1);
    onAlterada?.();
  }

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

            {conta.emailChanges?.length > 0 &&
              <div className="secao-inscricao">
                <h2>Histórico de e-mail</h2>
                <ul className="lista-inscricoes">
                  {conta.emailChanges.map((c, i) => (
                    <li key={i}>
                      <div>
                        <span className="detalhe">{c.oldEmail} → <strong>{c.newEmail}</strong></span>
                        <span className="detalhe">
                          {new Date(c.changedAt).toLocaleString("pt-BR")}{c.changedByAdmin ? ` · por ${c.changedByAdmin}` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            }

            <TrocarEmail contaId={id} emailAtual={account.email} nomeCandidato={account.name} aoTrocar={aoTrocarEmail} />

            <ResetarSenha contaId={id} nomeCandidato={account.name} />

            <DadosCandidato candidato={account} />
          </>
        }
      </div>
    </div>
  );
}
