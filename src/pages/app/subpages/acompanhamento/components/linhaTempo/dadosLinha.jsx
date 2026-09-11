import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import callApi from "../../../../../../api/callAPI";
import { geraCobrancaInscricao, getStatusPagamentoInscricao } from "../../../../../../api/services/inscricao";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../../../util/date";

const ENDERECO_INSTITUTO = "Av. Coronel Octaviano de Freitas Costa, 463 - Veleiros, São Paulo - SP, 04773-000";

const PAGAMENTO_PENDENTE = 1;
const PAGAMENTO_PAGO = 2;
// Vencida, recusada ou cancelada: pede outra cobrança ao backend, que reemite.
const PAGAMENTO_ENCERRADO = [3, 4, 5];

// O provedor PIX não avisa quando o pagamento cai: enquanto a cobrança está pendente,
// consulta a situação de tempos em tempos para a etapa virar sozinha.
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

export function Pagamento({ pago, onConfirmado }) {
  const [cobranca, setCobranca] = useState(null);
  const [carregando, setCarregando] = useState(!pago);
  const [falhou, setFalhou] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [qrIndisponivel, setQrIndisponivel] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const timeoutCopia = useRef(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      clearTimeout(timeoutCopia.current);
    };
  }, []);

  const gerar = useCallback(async () => {
    setCarregando(true);
    setFalhou(false);

    // Com toast: taxa não configurada ou provedor fora do ar chegam como mensagem da API.
    const r = await callApi(geraCobrancaInscricao, true);
    if (!montado.current) return;

    if (r?.correlationId) {
      setCobranca(r);
      setQrIndisponivel(false);
    } else {
      setFalhou(true);
    }
    setCarregando(false);
  }, []);

  const verificar = useCallback(async () => {
    const r = await callApi(getStatusPagamentoInscricao, false);
    if (!montado.current || !r?.correlationId) return r;

    // Gravar antes de reemitir tira a cobrança de "pendente" e para a consulta periódica —
    // se a reemissão falhar, a tela mostra "Tentar novamente" em vez de repetir a cada 10s.
    setCobranca(r);
    if (PAGAMENTO_ENCERRADO.includes(r.status)) gerar();
    return r;
  }, [gerar]);

  useEffect(() => {
    if (!pago) gerar();
  }, [pago, gerar]);

  const pendente = cobranca?.status === PAGAMENTO_PENDENTE;

  useEffect(() => {
    if (pago || !pendente) return;

    // Confere já ao abrir — o pagamento pode ter caído com a tela fechada — e depois a cada 10s.
    verificar();
    const intervalo = setInterval(verificar, INTERVALO_CONSULTA_PAGAMENTO);
    return () => clearInterval(intervalo);
  }, [pago, pendente, verificar]);

  // A confirmação vista aqui vira a etapa inteira da linha do tempo, sem recarregar a página.
  useEffect(() => {
    if (cobranca?.status === PAGAMENTO_PAGO) onConfirmado?.(true);
  }, [cobranca?.status, onConfirmado]);

  async function verificarAgora() {
    setVerificando(true);
    const r = await verificar();
    if (!montado.current) return;
    setVerificando(false);

    if (!r)
      toast.error("Não foi possível verificar o pagamento agora. Tente novamente em instantes.");
    else if (r.status === PAGAMENTO_PENDENTE)
      toast("Ainda não recebemos a confirmação do pagamento. Ela pode levar alguns minutos.");
  }

  // A cobrança confirmada pela consulta vale tanto quanto a que veio na inscrição.
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
        <p>
          Pagamento da taxa de inscrição confirmado
          {cobranca?.paidAt && ` em ${converterDataUTCParaLocalSemMudarDia(cobranca.paidAt)}`}.
        </p>
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

  if (falhou || !cobranca?.copyPasteCode) {
    return (
      <div className="conteudo pagamento">
        <p>Não foi possível gerar a cobrança da taxa de inscrição agora.</p>
        <div className="verificacao">
          <button type="button" className="btn-verificar" onClick={gerar}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="conteudo pagamento">
      <p>
        Pague a taxa de inscrição
        {cobranca.amount > 0 && ` de ${cobranca.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
        {' '}via PIX, lendo o QR Code ou usando o código copia e cola. Assim que o pagamento for
        confirmado, esta etapa é concluída automaticamente.
      </p>

      {cobranca.qrCodeImageUrl && !qrIndisponivel &&
        <img
          className="qrcode"
          src={cobranca.qrCodeImageUrl}
          alt="QR Code para pagamento via PIX"
          onError={() => setQrIndisponivel(true)}
        />
      }

      <div className="codigo-pix">
        <code>{cobranca.copyPasteCode}</code>
        <button type="button" onClick={copiar}>{copiado ? "Copiado!" : "Copiar código"}</button>
      </div>

      {cobranca.expiresAt &&
        <p className="expiracao">Cobrança válida até {converterDataUTCParaLocalSemMudarDia(cobranca.expiresAt)}.</p>
      }

      <div className="verificacao">
        <button type="button" className="btn-verificar" onClick={verificarAgora} disabled={verificando}>
          {verificando ? "Verificando…" : "Já paguei — verificar pagamento"}
        </button>
        <span>A situação também é verificada automaticamente a cada 10 segundos.</span>
      </div>
    </div>
  );
}

export function EtapaBloqueada() {
  return (
    <div className="conteudo">
      <p>Esta etapa é liberada depois da confirmação do pagamento da taxa de inscrição.</p>
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
