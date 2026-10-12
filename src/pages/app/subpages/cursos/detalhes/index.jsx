import { Link, useNavigate, useOutletContext } from "react-router";
import "./index.scss";
import { useEffect, useState } from "react";
import callApi from "../../../../../api/callAPI";
import { getCursoId, urlImagemCurso } from "../../../../../api/services/cursos";

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { get } from "local-storage";
import { formatarComoHTML } from "../../../../../util/string";


export default function DetalhesCurso() {

  const idCurso = useOutletContext();
  const navigate = useNavigate();

  const [infoCurso, setInfoCurso] = useState();
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [imagemFalhou, setImagemFalhou] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await callApi(getCursoId, false, idCurso);

      if (r?.id) setInfoCurso(r);
      else setNaoEncontrado(true);

      setLoading(false);
    })();
  }, [idCurso])

  // "16 anos completos até 31/03" → ["16 anos", " completos até 31/03"]
  function separaStringIdade(string) {
    if (!string)
      return ["", ""];

    const resultado = [];

    resultado[0] = string.slice(0, string.indexOf("anos") + 4);
    resultado[1] = string.slice(string.indexOf("anos") + 4);

    return resultado;
  }

  const [idadeMin, idadeMinSufixo] = separaStringIdade(infoCurso?.minAge);
  const [idadeMax, idadeMaxSufixo] = separaStringIdade(infoCurso?.maxAge);

  const periodosAtivos = infoCurso?.availablePeriods.filter(periodo => periodo.isActive) || [];

  function formatarHorario(horario) {
    return horario?.replace(':', 'h');
  }

  // A página é pública: quem não está logado vai para o login (e de lá segue o fluxo normal).
  function inscrever() {
    navigate(get("token") ? "/inscricao" : "/login");
  }

  if (naoEncontrado)
    return (
      <section className="curso-detalhes">
        <Link className="voltar" to="..">← Todos os cursos</Link>
        <div className="nao-encontrado">
          <h1>Curso não encontrado</h1>
          <p>Este curso não está mais disponível. Veja as outras opções.</p>
          <Link className="btn-primario" to="..">Ver todos os cursos</Link>
        </div>
      </section>
    );

  const urlImagem = urlImagemCurso(infoCurso?.image);
  const semImagem = !loading && (!urlImagem || imagemFalhou);

  return (
    <section className="curso-detalhes">
      <Link className="voltar" to="..">← Todos os cursos</Link>

      {/* Capa: a foto do curso com o nome por cima; sem foto, vira um bloco azul-tinta. */}
      <header className={"capa" + (semImagem ? " sem-imagem" : "")}>
        {urlImagem && !imagemFalhou &&
          <img src={urlImagem} alt="" onError={() => setImagemFalhou(true)} />
        }

        <div className="capa-texto">
          <p className="eyebrow">{loading ? <Skeleton width={80} baseColor="#2c3d5e" highlightColor="#3a4c70" /> : infoCurso?.type}</p>
          <h1>{loading ? <Skeleton width="60%" baseColor="#2c3d5e" highlightColor="#3a4c70" /> : infoCurso?.name}</h1>
        </div>
      </header>

      {/* Os quatro dados que decidem a escolha, lado a lado, antes do texto. */}
      <dl className="fatos">
        <div className="fato">
          <dt>Carga horária</dt>
          <dd>{loading ? <Skeleton width={90} /> : infoCurso?.workload}</dd>
        </div>
        <div className="fato">
          <dt>Idade</dt>
          <dd className="faixa-idade">
            {loading ? <Skeleton width={120} /> :
              <>
                <span className="limite">
                  <span className="prefixo">De</span>
                  <span>{idadeMin} {idadeMinSufixo && <small>{idadeMinSufixo.trim()}</small>}</span>
                </span>
                <span className="limite">
                  <span className="prefixo">Até</span>
                  <span>{idadeMax} {idadeMaxSufixo && <small>{idadeMaxSufixo.trim()}</small>}</span>
                </span>
              </>
            }
          </dd>
        </div>
        <div className="fato">
          <dt>Escolaridade mínima</dt>
          <dd>{loading ? <Skeleton width={110} /> : infoCurso?.minSchoolLevel}</dd>
        </div>
        <div className="fato">
          <dt>Mensalidade</dt>
          <dd>{loading ? <Skeleton width={90} /> : infoCurso?.contribution}</dd>
        </div>
      </dl>

      <div className="grid-principal">
        <div className="coluna-esquerda">
          <section className="bloco">
            <h2 className="rotulo-bloco">Visão geral</h2>
            <div className="texto">{loading ? <Skeleton count={5} /> : formatarComoHTML(infoCurso?.description)}</div>
          </section>

          {(infoCurso?.jobMarket || loading) &&
            <section className="bloco destaque">
              <h2 className="rotulo-bloco">Mercado de trabalho</h2>
              <div className="texto">{loading ? <Skeleton count={3} /> : formatarComoHTML(infoCurso?.jobMarket)}</div>
            </section>
          }
        </div>

        <aside className="card-inscricao">
          <p className="titulo-card">Períodos</p>

          {loading ? <Skeleton height={90} baseColor="#2c3d5e" highlightColor="#3a4c70" /> :
            <ul className="periodos">
              {periodosAtivos.length === 0 &&
                <li className="sem-periodo">Períodos a definir</li>
              }

              {periodosAtivos.map(p => (
                <li key={p.code}>
                  <span className="nome">{p.name}</span>
                  <span className="horario">{formatarHorario(p.entryTime)}–{formatarHorario(p.exitTime)}</span>
                </li>
              ))}
            </ul>
          }

          {!loading &&
            <button className="btn-inscrever" onClick={inscrever}>
              Inscrever-se neste curso
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          }
        </aside>
      </div>

      {/* No celular o cartão de inscrição fica lá embaixo: a barra fixa mantém o botão à mão. */}
      {!loading &&
        <div className="barra-inscricao">
          <div>
            <p className="nome">{infoCurso?.name}</p>
            <p className="info">{infoCurso?.contribution}</p>
          </div>
          <button onClick={inscrever}>Inscrever-se</button>
        </div>
      }
    </section>
  );
}
