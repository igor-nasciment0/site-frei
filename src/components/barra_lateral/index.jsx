import { Link, useLocation, useMatch, useNavigate } from 'react-router';
import './index.scss';
import { useEffect, useState } from 'react';
import { remove } from 'local-storage';
import { calcularProgresso } from '../../util/progresso';

const WHATSAPP_NUMERO = '5511963986252';
const WHATSAPP_EXIBICAO = '(11) 96398-6252';

const LINKS = [
  { para: '/', titulo: 'Início' },
  { para: '/inscricao', titulo: 'Minha inscrição', badge: true },
  { para: '/acompanhamento', titulo: 'Acompanhamento' },
  { para: '/cursos', titulo: 'Cursos' },
  { para: '/faq', titulo: 'Dúvidas frequentes' },
];

export default function BarraLateral({ user, inscricao }) {
  const [aberta, setAberta] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setAberta(false), [location.pathname]);

  const progresso = calcularProgresso(user, !!inscricao?.firstChoice);
  const badgeValue = `${progresso.concluidas}/${progresso.total}`;

  function sair() {
    remove('token');
    remove('user');
    navigate('/login');
  }

  return (
    <aside className="barra-lateral" data-open={aberta}>
      <div className="topo">
        <button
          className="burger"
          aria-label={aberta ? 'Fechar navegação' : 'Abrir navegação'}
          aria-expanded={aberta}
          onClick={() => setAberta(!aberta)}
        >
          <span /><span /><span />
        </button>

        <div className="marca">
          <img className="logo" src="/assets/images/logo.svg" alt="Instituto Social Nossa Senhora de Fátima" />
          <div>
            <p className="eyebrow">Instituto Social</p>
            <p className="sub">Nossa Senhora de Fátima</p>
          </div>
        </div>
      </div>

      <p className="rotulo-nav">Navegação</p>

      <nav>
        {LINKS.map(link => (
          <LinkLateral key={link.para} {...link} badgeValue={link.badge ? badgeValue : null} />
        ))}
      </nav>

      <div className="rodape">
        <div className="divisor" />
        <p className="atendimento">Atendimento<br />Seg a sex · 8h–11h30 · 13h30–17h</p>

        <a
          className="whatsapp"
          href={`https://wa.me/${WHATSAPP_NUMERO}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {WHATSAPP_EXIBICAO}
        </a>

        <button className="sair" onClick={sair}>Sair da conta</button>
      </div>
    </aside>
  );
}

function LinkLateral({ para, titulo, badgeValue }) {
  const selecionado = useMatch(para);

  return (
    <Link to={para} className={selecionado ? 'ativo' : ''}>
      {selecionado && <span className="marcador-ativo" />}
      <span className="titulo">{titulo}</span>
      {badgeValue && <span className="badge">{badgeValue}</span>}
    </Link>
  );
}
