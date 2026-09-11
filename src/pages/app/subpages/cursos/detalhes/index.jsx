import { Link, useNavigate, useOutletContext } from "react-router";
import "./index.scss";
import { useEffect, useState } from "react";
import callApi from "../../../../../api/callAPI";
import { getCursoId, getCursoImagem } from "../../../../../api/services/cursos";

import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { sleep } from "../../../../../util/general";
import { formatarComoHTML } from "../../../../../util/string";


export default function DetalhesCurso() {

  const idCurso = useOutletContext();
  const navigate = useNavigate();

  const [infoCurso, setInfoCurso] = useState();
  const [loading, setLoading] = useState(true);

  const [imageUrl, setImageUrl] = useState('');

  const fetchImage = async (imageId) => {
    if (imageId) {
      try {
        const blob = await callApi(getCursoImagem, false, imageId);
        let currentUrl = URL.createObjectURL(blob);
        return currentUrl;
      } catch (error) {
        console.error("Erro ao buscar a imagem do curso:", error);
      }
    }
  };

  useEffect(() => {
    (async () => {
      if (!infoCurso?.image) return;
      const url = await fetchImage(infoCurso.image);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImageUrl(url)
      };
    })()
  }, [infoCurso?.image]);

  useEffect(() => {
    (async () => {
      const r = await callApi(getCursoId, false, idCurso);

      if (r) {
        await sleep(1000);
        setInfoCurso(r);
        setLoading(false);
      }
    })();
  }, [])

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

  return (
    <section className="curso-detalhes">
      <Link className="voltar" to="..">← Todos os cursos</Link>

      {loading ?
        <Skeleton height={180} style={{ marginBottom: '30px' }} />
        :
        (imageUrl ?
          <div className="hero" style={{ backgroundImage: `url(${imageUrl})` }} />
          :
          <div className="hero placeholder">
            <span>foto do curso · 1600×500</span>
          </div>
        )
      }

      <p className="eyebrow">{loading ? <Skeleton width={80} /> : infoCurso?.type}</p>
      <h1>{loading ? <Skeleton /> : infoCurso?.name}</h1>

      <div className="grid-principal">
        <div className="coluna-esquerda">
          <section className="bloco">
            <p className="rotulo-bloco">Visão geral</p>
            <p className="texto">{loading ? <Skeleton count={4} /> : formatarComoHTML(infoCurso?.description)}</p>
          </section>

          {(infoCurso?.jobMarket || loading) &&
            <>
              <div className="divisor" />
              <section className="bloco">
                <p className="rotulo-bloco">Mercado de trabalho</p>
                <p className="texto">{loading ? <Skeleton count={3} /> : formatarComoHTML(infoCurso?.jobMarket)}</p>
              </section>
            </>
          }

          {!loading &&
            <button className="btn-primario" onClick={() => navigate("/inscricao")}>Inscrever-se neste curso</button>
          }
        </div>

        <aside className="card-info">
          <p className="titulo-card">Informações</p>

          {loading ? <Skeleton height={260} /> :
            <>
              <div className="item">
                <p className="rotulo">Carga horária</p>
                <p className="valor">{infoCurso?.workload}</p>
              </div>
              <div className="item">
                <p className="rotulo">Idade</p>
                <p className="valor">{idadeMin} <small>{idadeMinSufixo}</small> a {idadeMax} <small>{idadeMaxSufixo}</small></p>
              </div>
              <div className="item">
                <p className="rotulo">Escolaridade mínima</p>
                <p className="valor">{infoCurso?.minSchoolLevel}</p>
              </div>
              <div className="item">
                <p className="rotulo">Mensalidade</p>
                <p className="valor">{infoCurso?.contribution}</p>
              </div>
              <div className="item">
                <p className="rotulo">Períodos</p>
                <p className="valor">{periodosAtivos.map(p => p.name).join(" e ")}</p>
                <p className="complemento">
                  {periodosAtivos.map(p => `${formatarHorario(p.entryTime)}–${formatarHorario(p.exitTime)}`).join(" · ")}
                </p>
              </div>
            </>
          }
        </aside>
      </div>
    </section>
  );
}
