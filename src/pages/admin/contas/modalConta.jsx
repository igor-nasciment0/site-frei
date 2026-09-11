import { useEffect, useRef, useState } from "react";
import callApi from "../../../api/callAPI";
import { getConta } from "../../../api/services/admin/contas";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import DadosCandidato, { Info } from "../componentes/dadosCandidato";
import "./modalConta.scss";

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

// Dados da conta do candidato em modo somente leitura — o painel não edita contas.
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
          <p className="eyebrow">Conta do candidato · somente leitura</p>
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

            <DadosCandidato candidato={account} />
          </>
        }
      </div>
    </div>
  );
}
