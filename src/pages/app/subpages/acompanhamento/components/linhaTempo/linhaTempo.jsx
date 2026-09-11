import './linhaTempo.scss';
import { CadastroCriado, EtapaBloqueada, Pagamento, InscricaoPreenchida, ProvaPresencial, ResultadoMatricula } from './dadosLinha';
import { useOutletContext } from 'react-router';

export default function Timeline({ dadosInscricao, pagamentoConfirmado, onPagamentoConfirmado }) {

  const statusVestibular = useOutletContext();

  const provaRealizada = !!dadosInscricao?.testDate && new Date(dadosInscricao.testDate) <= new Date();

  // A data de resultado é por candidato (externo em curso de continuidade sai mais tarde).
  // A data global de /parameters só entra como fallback.
  const dataResultado = dadosInscricao?.resultPublicationDate ?? statusVestibular?.resultPublicationDate;
  const resultadoDisponivel = !!dataResultado && new Date(dataResultado) <= new Date();

  const alunoInterno = !!dadosInscricao?.isInternalStudent;

  const etapasAposPagamento = [
    {
      titulo: "Prova presencial",
      // Para o aluno interno não há prova a aguardar: o nivelamento é na própria turma.
      status: alunoInterno ? "dispensado" : provaRealizada ? "concluído" : "aguardando",
      conteudo: <ProvaPresencial realizado={provaRealizada} dadosInscricao={dadosInscricao} />,
    },
    {
      titulo: "Resultado e matrícula",
      status: resultadoDisponivel ? "concluído" : "aguardando",
      conteudo: (
        <ResultadoMatricula
          realizado={resultadoDisponivel}
          dataPublicacao={dataResultado}
          mostrarUrl={statusVestibular?.canShowResultUrl}
          urlResultado={statusVestibular?.resultUrl}
        />
      ),
    },
  ];

  const etapas = [
    { titulo: "Cadastro criado", status: "concluído", conteudo: <CadastroCriado /> },
    { titulo: "Inscrição preenchida", status: "concluído", conteudo: <InscricaoPreenchida /> },
    {
      titulo: "Pagamento",
      status: pagamentoConfirmado ? "concluído" : "aguardando",
      conteudo: <Pagamento pago={pagamentoConfirmado} onConfirmado={onPagamentoConfirmado} />,
    },
    // O processo só avança depois que o pagamento é confirmado.
    ...etapasAposPagamento.map(etapa => pagamentoConfirmado
      ? etapa
      : { titulo: etapa.titulo, status: "bloqueado", conteudo: <EtapaBloqueada /> }),
  ];

  return (
    <div className="timeline-container">
      {etapas.map((etapa, i) =>
        <TimelineItem key={i} {...etapa} />
      )}
    </div>
  );
};

function TimelineItem({ titulo, status, conteudo }) {
  return (
    <div className={"timeline-item status-" + status.normalize("NFD").replace(/[̀-ͯ]/g, "")}>
      <span className="marcador" />
      <div className="timeline-item-content">
        <div className="cabecalho">
          <h3>{titulo}</h3>
          <span className="selo">{status}</span>
        </div>
        {conteudo}
      </div>
    </div>
  )
}
