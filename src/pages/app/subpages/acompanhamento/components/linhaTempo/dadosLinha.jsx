import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import callApi from "../../../../../../api/callAPI";
import { getPagamentoInscricao } from "../../../../../../api/services/inscricao";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../../../util/date";

const ENDERECO_INSTITUTO = "Av. Coronel Octaviano de Freitas Costa, 463 - Veleiros, São Paulo - SP, 04773-000";

const PAGAMENTO_PAGO = 2;

// Enquanto a cobrança está pendente, o webhook do provedor pode confirmar a qualquer
// momento — recarrega de tempos em tempos para a etapa virar sozinha.
const INTERVALO_CONSULTA_PAGAMENTO = 10000;

export function CadastroCriado() {
  return (
    <div className="conteudo realizado">
      <p>Sua conta foi criada com sucesso.</p>
    </div>
  );
}

export function InscricaoPreenchida() {
  return (
    <div className="conteudo realizado">
      <p>Inscrição preenchida e enviada com sucesso.</p>
    </div>
  );
}

export function Pagamento({ pago }) {
  const [cobranca, setCobranca] = useState(null);
  const [carregando, setCarregando] = useState(!pago);
  const [copiado, setCopiado] = useState(false);
  const timeoutCopia = useRef(null);

  useEffect(() => {
    if (pago) return;

    let ativo = true;

    async function consultar() {
      const r = await callApi(getPagamentoInscricao, false);
      if (!ativo) return;

      if (r?.status !== 404) setCobranca(r?.data);
      setCarregando(false);
    }

    consultar();
    const intervalo = setInterval(consultar, INTERVALO_CONSULTA_PAGAMENTO);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [pago]);

  useEffect(() => () => clearTimeout(timeoutCopia.current), []);

  // A cobrança confirmada pelo polling vale tanto quanto a que veio na inscrição.
  const confirmado = pago || cobranca?.status === PAGAMENTO_PAGO;

  async function copiar() {
    if (!cobranca?.copyPasteCode) return;

    try {
      await navigator.clipboard.writeText(cobranca.copyPasteCode);
      setCopiado(true);
      timeoutCopia.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Contextos sem permissão de área de transferência (http, navegador antigo):
      // o código continua visível e selecionável na tela.
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  if (confirmado) {
    return (
      <div className="conteudo realizado">
        <p>Pagamento da taxa de inscrição confirmado.</p>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="conteudo">
        <p>Gerando a cobrança…</p>
      </div>
    );
  }

  if (!cobranca?.copyPasteCode) {
    return (
      <div className="conteudo">
        <p>A cobrança da taxa de inscrição aparecerá aqui em instantes. Se demorar, recarregue a página.</p>
      </div>
    );
  }

  return (
    <div className="conteudo pagamento">
      <p>
        Pague a taxa de inscrição
        {cobranca.amount > 0 && ` de ${cobranca.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
        {' '}via PIX. A confirmação é automática e pode levar alguns minutos.
      </p>

      {cobranca.qrCodeBase64 &&
        <img
          className="qrcode"
          src={`data:image/png;base64,${cobranca.qrCodeBase64}`}
          alt="QR Code para pagamento via PIX"
        />
      }

      <div className="codigo-pix">
        <code>{cobranca.copyPasteCode}</code>
        <button type="button" onClick={copiar}>{copiado ? "Copiado!" : "Copiar código"}</button>
      </div>

      {cobranca.expiresAt &&
        <p className="expiracao">Cobrança válida até {converterDataUTCParaLocalSemMudarDia(cobranca.expiresAt)}.</p>
      }
    </div>
  );
}

export function ProvaPresencial({ realizado, dadosInscricao }) {
  // Aluno interno faz o nivelamento na própria turma: não há prova de vestibular para ele.
  if (dadosInscricao?.isInternalStudent) {
    return (
      <div className="conteudo realizado">
        <p>
          Como você já é aluno do Instituto e escolheu a continuidade do seu curso, a prova será o
          nivelamento do próprio curso — portanto <strong>não é necessário realizar a prova no dia
          do vestibular</strong>.
        </p>
      </div>
    );
  }

  if (!realizado)
    return (
      <div className="conteudo">
        <p>A prova será realizada presencialmente no Instituto
          {dadosInscricao?.testDate && `, no dia ${converterDataUTCParaLocalSemMudarDia(dadosInscricao.testDate)}`}.
        </p>
        <strong>Instituto Social Nossa Senhora de Fátima</strong>
        <p>{ENDERECO_INSTITUTO}</p>
        <p className="aviso">
          O horário e a sala serão enviados por e-mail
          {dadosInscricao?.roomNoticeEmailDate
            ? ` no dia ${converterDataUTCParaLocalSemMudarDia(dadosInscricao.roomNoticeEmailDate)}`
            : " antes da data da prova"}.
        </p>
      </div>
    );

  return (
    <div className="conteudo realizado">
      <p>A prova foi aplicada com sucesso aos presentes no dia marcado
        {dadosInscricao?.testDate && `, ${converterDataUTCParaLocalSemMudarDia(dadosInscricao.testDate)}`}
        {dadosInscricao?.testTime && `, às ${dadosInscricao.testTime}`}
        {dadosInscricao?.testRoom && `, na sala ${dadosInscricao.testRoom}`}.
      </p>
    </div>
  );
}

export function ResultadoMatricula({ realizado, dataPublicacao, urlResultado, mostrarUrl }) {
  if (realizado) {
    return (
      <div className="conteudo realizado">
        <p>Resultado disponível! Acesse:</p>
        <a href={urlResultado} target="_blank" rel="noopener noreferrer">{urlResultado}</a>
      </div>
    );
  }

  return (
    <div className="conteudo">
      <p>O resultado e as informações de matrícula ficarão disponíveis em nosso site no dia {converterDataUTCParaLocalSemMudarDia(dataPublicacao)}.</p>
      {mostrarUrl &&
        <a href={urlResultado} target="_blank" rel="noopener noreferrer">{urlResultado}</a>
      }
    </div>
  );
}
