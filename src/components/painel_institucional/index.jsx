import { useEffect, useState } from 'react';
import './index.scss';
import callApi from '../../api/callAPI';
import { getTotalCursos } from '../../api/services/cursos';

// Painel de marca institucional compartilhado pelas telas públicas (Login, Cadastro,
// Recuperar/Trocar Senha, e as equivalentes do painel admin) — só o Login do candidato
// tem protótipo próprio (Login.dc.html); as demais estendem o mesmo padrão visual, por
// decisão de produto. Props opcionais permitem reaproveitar o mesmo painel no contexto
// administrativo sem duplicar o layout.

export default function PainelInstitucional({
  titulo = "Inscrições",
  destaque = "2026",
  descricao = "Preencha sua ficha, escolha o curso e acompanhe todo o processo seletivo em um só lugar.",
  mostrarStats = true,
}) {
  const [totalCursos, setTotalCursos] = useState(null);

  useEffect(() => {
    if (!mostrarStats) return;

    (async () => {
      // toastIt=false: é número decorativo — se a API não responder, o indicador só não aparece,
      // sem incomodar quem está tentando entrar.
      const total = await callApi(getTotalCursos, false);

      if (typeof total === 'number') {
        setTotalCursos(total);
        return;
      }

      // GET /courses/count é anônimo, então falha aqui nunca é sessão expirada: ou a API está
      // fora, ou está numa versão anterior à que expôs o endpoint. Sem este aviso a falha fica
      // invisível — o indicador simplesmente some e parece número fixo que sumiu.
      console.warn(
        '[PainelInstitucional] não foi possível obter a quantidade de cursos em GET /courses/count. ' +
        'Verifique se a API publicada já inclui esse endpoint.'
      );
    })();
  }, [mostrarStats]);

  return (
    <div className="painel-institucional">
      <div className="topo">
        <img className="logo" src="/assets/images/logo.svg" alt="Instituto Social Nossa Senhora de Fátima" />
        <div>
          <p className="eyebrow">Instituto Social</p>
          <p className="sub">Nossa Senhora de Fátima</p>
        </div>
      </div>

      <div className="meio">
        <div className="filete" />
        <h1>{titulo}<br /><span>{destaque}</span></h1>
        <p>{descricao}</p>
      </div>

      {mostrarStats &&
        <div className="stats">
          {totalCursos !== null &&
            <div>
              <span className="numero">{totalCursos}</span>
              <span className="rotulo">{totalCursos === 1 ? 'Curso' : 'Cursos'}</span>
            </div>
          }
          <div>
            <span className="numero">64</span>
            <span className="rotulo">Anos de história</span>
          </div>
        </div>
      }
    </div>
  );
}
