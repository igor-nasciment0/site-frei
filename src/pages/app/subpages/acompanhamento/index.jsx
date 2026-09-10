import { useEffect, useState } from "react";
import "./index.scss";
import callApi from "../../../../api/callAPI";
import { getInscricao } from "../../../../api/services/inscricao";
import { getCursos } from "../../../../api/services/cursos";
import { Link, useNavigate } from "react-router";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import LinhaTempo from "./components/linhaTempo/linhaTempo";
import ToasterContainer from "../../../../components/toaster_container";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";

const ENDERECO_INSTITUTO = "Av. Coronel Octaviano de Freitas Costa, 463 - Veleiros, São Paulo - SP, 04773-000";

// Horário e sala não são definidos aqui: a secretaria envia por e-mail numa data configurada
// na edição do vestibular. Sem essa data, mantém o texto genérico.
function avisoPorEmail(dadosInscricao) {
  return dadosInscricao?.roomNoticeEmailDate
    ? `Por e-mail em ${converterDataUTCParaLocalSemMudarDia(dadosInscricao.roomNoticeEmailDate)}`
    : "Enviado por e-mail";
}

export default function Acompanhamento() {

  const navigate = useNavigate();

  const [dadosInscricao, setDadosInscricao] = useState();
  const [cursos, setCursos] = useState([]);
  const [naoPossui, setNaoPossui] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await callApi(getInscricao);

      if (r.status == 404)
        setNaoPossui(true);
      else
        setDadosInscricao(r.data);

      setCursos(await callApi(getCursos) ?? []);

      setTimeout(() => setCarregando(false), 1000)
    })();
  }, [])

  function tipoDoCurso(courseCode) {
    return cursos.find(c => c.code == courseCode)?.type || "Curso";
  }

  if (naoPossui && !carregando)
    return (
      <section className="sem-inscricao">
        <p className="eyebrow">Acompanhamento</p>
        <h1>Você ainda não possui inscrição.</h1>
        <button onClick={() => navigate("/inscricao")}>Realizar inscrição</button>
      </section>
    )

  return (
    <section className="acompanhamento-page">
      <ToasterContainer />

      <p className="eyebrow">{carregando ? <Skeleton width={140} /> : `Inscrição ${dadosInscricao?.protocol ?? ""}`}</p>
      <h1>Acompanhamento</h1>

      <SkeletonTheme baseColor="#e7e5da" highlightColor="#f5f4f1">
        <section className="cursos-escolhidos">
          <p className="titulo-secao">Cursos escolhidos</p>

          <div className="opcoes">
            <CardOpcao
              carregando={carregando}
              rank="1ª opção"
              tom="sand"
              tipo={carregando ? null : tipoDoCurso(dadosInscricao?.firstChoice.courseCode)}
              nome={dadosInscricao?.firstChoice.courseName}
              periodo={dadosInscricao?.firstChoice.periodName}
              idCurso={dadosInscricao?.firstChoice.courseCode}
              cursos={cursos}
            />

            {(carregando || dadosInscricao?.secondChoice?.courseName) &&
              <CardOpcao
                carregando={carregando}
                rank="2ª opção"
                tom="slate"
                tipo={carregando ? null : tipoDoCurso(dadosInscricao?.secondChoice.courseCode)}
                nome={dadosInscricao?.secondChoice.courseName}
                periodo={dadosInscricao?.secondChoice.periodName}
                idCurso={dadosInscricao?.secondChoice.courseCode}
                cursos={cursos}
              />
            }
          </div>
        </section>
      </SkeletonTheme>

      {!carregando &&
        <div className="grid-principal">
          <section className="proximos-passos">
            <p className="titulo-secao">Próximos passos</p>
            <LinhaTempo dadosInscricao={dadosInscricao} />
          </section>

          <div className="coluna-lateral">
            {/* Aluno interno faz nivelamento na própria turma — não há prova a informar. */}
            {!dadosInscricao?.isInternalStudent &&
              <>
                <div className="card-convocacao">
                  <p className="eyebrow">Informações sobre a prova</p>
                  <p className="nota">Local, data e sala definidos pela secretaria. Chegue com 30 minutos de antecedência.</p>

                  <div className="linha">
                    <span>Data</span>
                    <strong>{dadosInscricao?.testDate ? converterDataUTCParaLocalSemMudarDia(dadosInscricao.testDate) : "A definir"}</strong>
                  </div>
                  <div className="linha">
                    <span>Horário</span>
                    <strong>{dadosInscricao?.testTime || avisoPorEmail(dadosInscricao)}</strong>
                  </div>
                  <div className="linha">
                    <span>Local</span>
                    <strong>{ENDERECO_INSTITUTO}</strong>
                  </div>
                  <div className="linha">
                    <span>Sala</span>
                    <strong>{dadosInscricao?.testRoom || avisoPorEmail(dadosInscricao)}</strong>
                  </div>
                </div>

                <div className="card-levar">
                  <p className="titulo-card">Documentos obrigatórios</p>
                  <div className="item">RG ou Documento Oficial com Foto</div>
                  <div className="item">Lápis, Borracha, 2 Canetas</div>
                  <div className="item">Água</div>
                  <div className="item">Chegar 30min com antecedência</div>
                </div>
              </>
            }
          </div>
        </div>
      }
    </section>
  );
};

function CardOpcao({ carregando, rank, tom, tipo, nome, periodo, idCurso, cursos }) {
  const curso = cursos.find(c => c.code == idCurso);

  return (
    <div className={"card-opcao tom-" + tom}>
      <div className="topo">
        <span className="rank">{carregando ? <Skeleton width={60} /> : rank}</span>
        {!carregando && tipo && <span className="tag">{tipo}</span>}
      </div>

      <h3>{carregando ? <Skeleton /> : nome}</h3>

      {!carregando &&
        <>
          <div className="divisor" />
          <div className="detalhe">
            <div>
              <span className="rotulo">Período</span>
              <span className="valor">{periodo}</span>
            </div>
          </div>

          {curso &&
            <Link to={`/cursos/${curso.id}`}>Ver o curso</Link>
          }
        </>
      }
    </div>
  );
}
