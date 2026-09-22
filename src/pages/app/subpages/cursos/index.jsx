import { Outlet, useNavigate, useParams } from "react-router";
import "./index.scss";
import { useEffect, useState } from "react";
import callApi from "../../../../api/callAPI";
import { getCursoImagem, getCursos } from "../../../../api/services/cursos";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const URL_EDITAL_BOLSAS = 'https://www.acaonsfatima.org.br/bolsa-educacional';

// Só os cursos técnicos concorrem a bolsa educacional.
function ehTecnico(curso) {
  return curso?.type?.trim().toLowerCase() === 'técnico';
}

async function carregarImagem(imageId) {
  if (!imageId) return null;

  try {
    const blob = await callApi(getCursoImagem, false, imageId);
    const url = URL.createObjectURL(blob);

    // só considera a imagem "pronta" depois que ela de fato decodificou no navegador
    return await new Promise(resolve => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error("Erro ao buscar a imagem do curso:", error);
    return null;
  }
}

export default function Cursos() {

  const [cursos, setCursos] = useState([]);
  const [imagens, setImagens] = useState({});
  const [filtro, setFiltro] = useState('');
  const [cursosFiltrados, setCursosFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const tiposCurso = [...new Set(["Todos", ...cursos.map(c => c.type.trim()), "Inglês"])];

  useEffect(() => {
    (async () => {
      const lista = (await callApi(getCursos)) ?? [];
      setCursos(lista);

      // só mostra os cartões quando todas as imagens já estiverem carregadas
      const entradas = await Promise.all(
        lista.map(async curso => [curso.imageId, await carregarImagem(curso.imageId)])
      );

      setImagens(Object.fromEntries(entradas.filter(([, url]) => url)));
      setCarregando(false);
    })();
  }, [])

  useEffect(() => {
    if (filtro === "Inglês")
      return setCursosFiltrados(cursos.filter(c => c.name.toLowerCase().normalize().trim().includes('inglês')));

    if (filtro && filtro !== "Todos") {
      setCursosFiltrados(cursos.filter(c => c.type.trim() === filtro.trim() && !c.name.toLowerCase().trim().includes('inglês')));
    } else {
      setCursosFiltrados(cursos);
    }
  }, [filtro, cursos])

  const { id: idCurso } = useParams();

  if (idCurso)
    return (<Outlet context={idCurso} />)

  return (
    <section className="cursos">
      <div className="cabecalho">
        <div>
          <p className="eyebrow">Turmas 2027</p>
          <h1>Nossos cursos</h1>
        </div>

        <div className="filtro">
          {carregando ?
            Array.from({ length: 4 }).map((_, i) =>
              <Skeleton key={i} width={i === 0 ? 70 : 100} height={35} />
            )
            :
            tiposCurso.map((tipo, index) => (
              <button
                key={index}
                className={(filtro === tipo || (tipo === "Todos" && !filtro)) ? 'ativo' : ''}
                onClick={() => setFiltro(tipo === "Todos" ? '' : (filtro === tipo ? '' : tipo))}
              >
                {tipo}
              </button>
            ))
          }
        </div>
      </div>

      <div className="grid">
        {carregando ?
          Array.from({ length: 6 }).map((_, i) => <CardCursoEsqueleto key={i} />)
          :
          cursosFiltrados.map((curso, index) => (
            <CardCurso infoCurso={curso} imageUrl={imagens[curso.imageId]} key={'curso' + index} />
          ))
        }
      </div>
    </section>
  );
}

function CardCurso({ infoCurso, imageUrl }) {

  const navigate = useNavigate();

  return (
    <div className="card" onClick={() => navigate('/cursos/' + infoCurso.id)}>
      {imageUrl ?
        <div className="card-imagem" style={{ backgroundImage: `url(${imageUrl})` }} />
        :
        <div className="card-imagem placeholder">
          <span>foto do curso</span>
        </div>
      }

      <div className="card-conteudo">
        <h3 className="card-titulo">{infoCurso.name}</h3>

        <div className="tags">
          <span className="tag categoria">{infoCurso.type}</span>
          <span className="tag">{infoCurso.workload}</span>
        </div>

        {ehTecnico(infoCurso) &&
          <a
            className="selo-edital"
            href={URL_EDITAL_BOLSAS}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            Edital de Bolsas
          </a>
        }

        <div className="divisor" />

        <div className="rodape">
          <button className="btn-detalhes" onClick={(e) => { e.stopPropagation(); navigate('/cursos/' + infoCurso.id) }}>
            Detalhes
          </button>
        </div>
      </div>
    </div>
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

        <div className="tags">
          <span className="tag"><Skeleton width={60} height={20} /></span>
          <span className="tag"><Skeleton width={50} height={20} /></span>
        </div>

        <div className="divisor" />

        <div className="rodape">
          <Skeleton width={60} />
        </div>
      </div>
    </div>
  )
}
