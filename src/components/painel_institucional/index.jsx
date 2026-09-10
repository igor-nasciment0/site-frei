import './index.scss';

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
  return (
    <div className="painel-institucional">
      <div className="topo">
        <img className="logo" src="/assets/images/logo.svg" alt="Instituto Social Nossa Senhora de Fátima" />
        <div>
          <p className="eyebrow">Ação Social</p>
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
          <div>
            <span className="numero">12</span>
            <span className="rotulo">Cursos</span>
          </div>
          <div>
            <span className="numero">64</span>
            <span className="rotulo">Anos de história</span>
          </div>
        </div>
      }
    </div>
  );
}
