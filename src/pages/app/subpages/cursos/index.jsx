import { Outlet, useNavigate, useParams } from "react-router";
import "./index.scss";
import { useEffect, useMemo, useState } from "react";
import callApi from "../../../../api/callAPI";
import { getCursos, urlImagemCurso } from "../../../../api/services/cursos";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const URL_EDITAL_BOLSAS = 'https://www.acaonsfatima.org.br/bolsa-educacional';
const FILTRO_TODOS = "Todos";
const FILTRO_INGLES = "Inglês";

// Só os cursos técnicos concorrem a bolsa educacional.
function ehTecnico(curso) {
  return curso?.type?.trim().toLowerCase() === 'técnico';
}

function ehIngles(curso) {
  return curso.name.toLowerCase().normalize().trim().includes('inglês');
}

// "Inglês" é um filtro pelo nome do curso; os demais são pelo tipo — e, para não repetir,
// os cursos de inglês ficam fora dos filtros de tipo.
function filtrarCursos(cursos, filtro) {
  if (!filtro || filtro === FILTRO_TODOS) return cursos;
  // Vale também quando "Inglês" é um tipo de curso: entram os do tipo e os que têm inglês no nome.
  if (filtro === FILTRO_INGLES) return cursos.filter(c => ehIngles(c) || c.type.trim() === FILTRO_INGLES);
  return cursos.filter(c => c.type.trim() === filtro && !ehIngles(c));
}

export default function Cursos() {

  const [cursos, setCursos] = useState([]);
  const [filtro, setFiltro] = useState(FILTRO_TODOS);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      setCursos((await callApi(getCursos)) ?? []);
      setCarregando(false);
    })();
  }, [])

  // Chips de filtro com a quantidade de cursos em cada um; filtro que ficaria vazio não aparece.
  const filtros = useMemo(() => {
    const tipos = [...new Set(cursos.map(c => c.type.trim()))];

    // Set: se já existe um tipo de curso chamado "Inglês", o filtro especial não se repete.
    return [...new Set([FILTRO_TODOS, ...tipos, FILTRO_INGLES])]
      .map(nome => ({ nome, total: filtrarCursos(cursos, nome).length }))
      .filter(f => f.nome === FILTRO_TODOS || f.total > 0);
  }, [cursos]);

  const cursosFiltrados = useMemo(() => filtrarCursos(cursos, filtro), [cursos, filtro]);

  const { id: idCurso } = useParams();

  if (idCurso)
    return (<Outlet context={idCurso} />)

  return (
    <section className="cursos">
      <header className="vitrine">
        <div className="vitrine-texto">
          <p className="eyebrow">Turmas 2027</p>
          <h1>Nossos cursos</h1>
          <p className="chamada">Escolha uma área, compare as opções e veja os detalhes de cada curso antes de se inscrever.</p>
        </div>

        <div className="vitrine-numero" aria-hidden={carregando}>
          <span className="numero">{carregando ? "—" : cursos.length}</span>
          <span className="rotulo">{cursos.length === 1 ? "curso disponível" : "cursos disponíveis"}</span>
        </div>
      </header>

      <div className="barra-filtro">
        <div className="filtro" role="group" aria-label="Filtrar cursos por área">
          {carregando ?
            Array.from({ length: 4 }).map((_, i) =>
              <Skeleton key={i} width={i === 0 ? 84 : 116} height={42} />
            )
            :
            filtros.map(f => (
              <button
                key={f.nome}
                type="button"
                aria-pressed={filtro === f.nome}
                className={filtro === f.nome ? 'ativo' : ''}
                onClick={() => setFiltro(filtro === f.nome ? FILTRO_TODOS : f.nome)}
              >
                {f.nome}
                <span className="contagem">{f.total}</span>
              </button>
            ))
          }
        </div>

        {!carregando &&
          <p className="resultado" aria-live="polite">
            {cursosFiltrados.length} {cursosFiltrados.length === 1 ? "curso" : "cursos"}
            {filtro !== FILTRO_TODOS && <> em <strong>{filtro}</strong></>}
          </p>
        }
      </div>

      {/* A key refaz a animação de entrada dos cartões a cada troca de filtro. */}
      <div className="grid" key={filtro}>
        {carregando ?
          Array.from({ length: 6 }).map((_, i) => <CardCursoEsqueleto key={i} />)
          :
          cursosFiltrados.map((curso, index) => (
            <CardCurso infoCurso={curso} ordem={index} key={curso.id} />
          ))
        }
      </div>

      {!carregando && cursosFiltrados.length === 0 &&
        <div className="vazio">
          <p>Nenhum curso nesta área no momento.</p>
          <button type="button" onClick={() => setFiltro(FILTRO_TODOS)}>Ver todos os cursos</button>
        </div>
      }
    </section>
  );
}

function CardCurso({ infoCurso, ordem }) {

  const navigate = useNavigate();
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const [imagemPronta, setImagemPronta] = useState(false);

  const urlImagem = urlImagemCurso(infoCurso.imageId);
  const abrir = () => navigate('/cursos/' + infoCurso.id);

  return (
    <article
      className="card"
      style={{ '--ordem': Math.min(ordem, 8) }}
      role="link"
      tabIndex={0}
      aria-label={`${infoCurso.name} — ver detalhes do curso`}
      onClick={abrir}
      onKeyDown={e => { if (e.key === 'Enter') abrir(); }}
    >
      <div className={"card-imagem" + (!urlImagem || imagemFalhou ? " placeholder" : "")}>
        {urlImagem && !imagemFalhou &&
          <img
            src={urlImagem}
            alt=""
            loading="lazy"
            className={imagemPronta ? "pronta" : ""}
            onLoad={() => setImagemPronta(true)}
            onError={() => setImagemFalhou(true)}
          />
        }

        <span className="tag-categoria">{infoCurso.type}</span>
      </div>

      <div className="card-conteudo">
        <h3 className="card-titulo">{infoCurso.name}</h3>
        {infoCurso.formalName && <p className="card-nome-formal">{infoCurso.formalName}</p>}

        <p className="carga">
          <IconeRelogio />
          {infoCurso.workload}
        </p>

        {ehTecnico(infoCurso) &&
          <a
            className="selo-edital"
            href={URL_EDITAL_BOLSAS}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            Edital de Bolsas
          </a>
        }

        <div className="rodape">
          <span className="btn-detalhes">
            Detalhes
            <IconeSeta />
          </span>
        </div>
      </div>
    </article>
  )
}

function CardCursoEsqueleto() {
  return (
    <div className="card esqueleto">
      <div className="card-imagem">
        <Skeleton height="100%" style={{ display: 'block' }} />
      </div>

      <div className="card-conteudo">
        <h3 className="card-titulo"><Skeleton width="70%" /></h3>
        <p className="carga"><Skeleton width={90} /></p>

        <div className="rodape">
          <Skeleton width={70} />
        </div>
      </div>
    </div>
  )
}

function IconeRelogio() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V8l2.25 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconeSeta() {
  return (
    <svg className="seta" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
