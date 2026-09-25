import { get } from 'local-storage';
import AcordeaoPerguntas from '../../../../components/acordeao_perguntas';
import './index.scss';
import { Link, useNavigate, useOutletContext } from 'react-router';
import { useEffect, useState } from 'react';
import callApi from '../../../../api/callAPI';
import { getTotalCursos } from '../../../../api/services/cursos';
import Skeleton from 'react-loading-skeleton';
import { format, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useMinhaInscricao, { temOpcoesDeCurso } from '../../../../util/useMinhaInscricao';
import { calcularProgresso } from '../../../../util/progresso';
import { corrigeURLVideo } from '../../../../util/string';
import { carregarYoutubeIframeApi } from '../../../../util/youtubeApi';
import { assistiuVideoInstitucional, marcarVideoInstitucionalAssistido } from '../../../../util/institutionVideo';

const ID_IFRAME_VIDEO = 'video-institucional';

// Cada item aponta para a `key` de uma pergunta cadastrada no FAQ pelo admin. Itens cuja
// pergunta ainda não existe simplesmente não abrem nada — por isso o link é sempre válido.
const INFORMACOES_GERAIS = [
  { key: 'edital-bolsa', titulo: 'Edital de Bolsa', legenda: 'Quem pode concorrer e como solicitar' },
  { key: 'uso-uniforme', titulo: 'Uso de Uniforme', legenda: 'Regras e onde adquirir' },
  { key: 'material-didatico', titulo: 'Material Didático', legenda: 'O que está incluso na mensalidade' },
  { key: 'resultado-prova', titulo: 'Resultado da prova', legenda: 'Quando e onde consultar' },
];

function formatarDataCurta(dataStringUTC) {
  if (!dataStringUTC) return null;
  const dataObj = parseISO(dataStringUTC);
  const dataAjustada = addMinutes(dataObj, dataObj.getTimezoneOffset());
  return format(dataAjustada, 'dd MMM', { locale: ptBR }).toUpperCase().replace('.', '');
}

export default function Inicio() {

  const statusVestibular = useOutletContext();

  const user = get("user");
  const navigate = useNavigate();

  const { inscricao } = useMinhaInscricao();
  const [totalCursos, setTotalCursos] = useState(null);
  const [assistiuVideo, setAssistiuVideo] = useState(assistiuVideoInstitucional());

  // Só de sessão, de propósito (não é persistido nem deriva do backend): ao terminar o vídeo
  // agora, o espaço dele vira um convite pra conhecer os cursos. Se a pessoa atualizar a
  // página, o vídeo volta a aparecer — quem quiser assistir de novo, consegue.
  const [videoTerminouAgora, setVideoTerminouAgora] = useState(false);

  useEffect(() => {
    (async () => {
      const total = await callApi(getTotalCursos);
      setTotalCursos(typeof total === 'number' ? total : null);
    })()
  }, [])

  // Instancia o player via IFrame API só quando há vídeo cadastrado e ele ainda não foi
  // assistido — pra detectar o fim (ENDED) e liberar "Minha inscrição" (watchInstitutionVideo).
  useEffect(() => {
    if (!statusVestibular?.presentationVideoUrl || assistiuVideo) return;

    let player;
    let cancelado = false;

    carregarYoutubeIframeApi().then(YT => {
      if (cancelado || !document.getElementById(ID_IFRAME_VIDEO)) return;

      player = new YT.Player(ID_IFRAME_VIDEO, {
        events: {
          onStateChange: async (evento) => {
            if (evento.data !== YT.PlayerState.ENDED) return;

            setVideoTerminouAgora(true);
            if (await marcarVideoInstitucionalAssistido())
              setAssistiuVideo(true);
          },
        },
      });
    });

    return () => {
      cancelado = true;
      // O iframe pode já ter sumido do DOM se o efeito estiver limpando por causa do próprio
      // vídeo ter terminado (troca pelo quadro "Conheça nossos cursos") — destroy() não precisa
      // funcionar nesse caso, só não pode estourar erro.
      try { player?.destroy?.(); } catch { /* iframe já removido do DOM */ }
    };
  }, [statusVestibular?.presentationVideoUrl, assistiuVideo])

  const inscricaoConcluida = temOpcoesDeCurso(inscricao);
  const progresso = calcularProgresso(user, inscricaoConcluida);
  const precisaAssistirVideo = !inscricaoConcluida && !!statusVestibular?.presentationVideoUrl && !assistiuVideo;

  return (
    <section className='inicio'>
      <p className="eyebrow">Olá, seja bem-vindo</p>
      <h1>{user?.name}</h1>

      {!inscricaoConcluida &&
        <div className="alerta">
          <span className="ponto" />
          <div>
            <p className="titulo">Falta escolher seu curso</p>
            <p className="texto">Depois de concluir sua inscrição e escolher o curso, a convocação para a prova aparece em Acompanhamento.</p>
          </div>
        </div>
      }

      <div className="destaques">
        <div className="card-vestibular">
          <p className="eyebrow">Vestibular {statusVestibular?.year ?? <Skeleton width={30} />}</p>

          {inscricaoConcluida ?
            <>
              <h2>Sua inscrição está concluída</h2>
              <p className="etapa">Etapa {progresso.total} de {progresso.total} · Inscrição concluída</p>
            </>
            :
            <>
              <h2>Sua inscrição está em andamento</h2>
              <p className="etapa">Etapa {progresso.concluidas} de {progresso.total} · {progresso.concluidas === 0 ? "Informações pessoais" : "Escolha do curso"}</p>
            </>
          }

          <div className="barra-progresso">
            <div style={{ width: `${(progresso.concluidas / progresso.total) * 100}%` }} />
          </div>

          <button
            disabled={precisaAssistirVideo}
            title={precisaAssistirVideo ? "Assista ao vídeo de apresentação até o fim para continuar" : undefined}
            onClick={() => navigate(inscricaoConcluida ? "/acompanhamento" : "/inscricao")}
          >
            {inscricaoConcluida ? "Ver acompanhamento" : "Continuar inscrição"}
          </button>

          {precisaAssistirVideo &&
            <p className="aviso-video">Assista ao vídeo de apresentação abaixo até o fim para liberar a inscrição.</p>
          }
        </div>

        <div className="card-datas">
          <p className="titulo-card">Datas</p>

          <div className="marco">
            <span className="data">{formatarDataCurta(statusVestibular?.startDate) ?? <Skeleton width={40} />}</span>
            <span className="rotulo">Abertura das inscrições</span>
          </div>
          <div className="marco">
            <span className="data">{formatarDataCurta(statusVestibular?.endDate) ?? <Skeleton width={40} />}</span>
            <span className="rotulo">Fim das inscrições</span>
          </div>
        </div>
      </div>

      {statusVestibular?.presentationVideoUrl &&
        <div className='video-apresentacao'>
          <h3>
            Assista à apresentação
            {assistiuVideo
              ? <span className="selo-assistido">✓ Assistido</span>
              : <span className="selo-pendente">Assista até o fim para liberar a inscrição</span>
            }
          </h3>

          <div className='moldura'>
            {videoTerminouAgora ?
              <div className="cta-cursos" onClick={() => navigate("/cursos")}>
                <p className="titulo">Conheça nossos cursos</p>
                <p className="legenda">Veja todas as opções disponíveis e escolha a sua</p>
              </div>
              :
              <iframe
                id={ID_IFRAME_VIDEO}
                src={corrigeURLVideo(statusVestibular.presentationVideoUrl)}
                title="Vídeo de apresentação do vestibular"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            }
          </div>
        </div>
      }

      <div className='informacoes-gerais'>
        <h3>Informações gerais</h3>

        <div className='container'>
          {INFORMACOES_GERAIS.map(info =>
            <Link key={info.key} to={`/faq?q=${info.key}`}>
              <p className="titulo">{info.titulo}</p>
              <p className="legenda">{info.legenda}</p>
            </Link>
          )}
        </div>
      </div>

      <div className='acoes'>
        <h3>Ações rápidas</h3>

        <div className='container'>
          <div onClick={() => navigate("/acompanhamento")}>
            <span className="numeral">01</span>
            <p className="titulo">Ver convocação da prova</p>
            <p className="legenda">Data, local e sala</p>
          </div>
          <div onClick={() => navigate("/cursos")}>
            <span className="numeral">02</span>
            <p className="titulo">Conhecer os cursos</p>
            <p className="legenda">{totalCursos != null ? `${totalCursos} opções disponíveis` : <Skeleton width={100} />}</p>
          </div>
          <div onClick={() => window.open("mailto:secretaria@acaonsfatima.org.br")}>
            <span className="numeral">03</span>
            <p className="titulo">Falar com a secretaria</p>
            <p className="legenda">(11) 96398-6252</p>
          </div>
        </div>
      </div>

      <div className='perguntas'>
        <div className='titulo'>
          <h3>Dúvidas frequentes</h3>

          <Link to="/faq">Ver todas</Link>
        </div>

        <AcordeaoPerguntas
          max={3}
          numbered={false}
          onSelecionar={(pergunta, index) => navigate(`/faq?q=${pergunta?.key ?? index}`)}
        />
      </div>
    </section>
  )
}
