import { Link, useLocation, useNavigate } from 'react-router';
import './index.scss';
import { useEffect, useState } from 'react';
import { remove } from 'local-storage';

const LINKS = [
  { para: '/admin', titulo: 'Painel' },
  { para: '/admin/inscricoes', titulo: 'Inscrições' },
  { para: '/admin/cursos', titulo: 'Cursos' },
  { para: '/admin/faq', titulo: 'Dúvidas frequentes' },
  { para: '/admin/vestibular', titulo: 'Vestibular' },
  { para: '/admin/importacoes', titulo: 'Importações' },
  { para: '/admin/administradores', titulo: 'Administradores' },
];

export default function AdminSidebar({ admin }) {
  const [aberta, setAberta] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setAberta(false), [location.pathname]);

  function sair() {
    remove('adminToken');
    remove('admin');
    navigate('/admin/login');
  }

  return (
    <aside className="barra-lateral admin-sidebar" data-open={aberta}>
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
            <p className="eyebrow">Painel Administrativo</p>
            <p className="sub">Nossa Senhora de Fátima</p>
          </div>
        </div>
      </div>

      <p className="rotulo-nav">Gestão</p>

      <nav>
        {LINKS.map(link => (
          <LinkLateral key={link.para} {...link} pathname={location.pathname} />
        ))}
      </nav>

      <div className="rodape">
        <div className="divisor" />
        <p className="atendimento">Logado como<br /><strong>{admin?.name || admin?.username}</strong></p>
        <button className="sair" onClick={sair}>Sair do painel</button>
      </div>
    </aside>
  );
}

function LinkLateral({ para, titulo, pathname }) {
  // "/admin" só fica ativo na raiz exata; os demais também destacam subrotas
  // (ex.: /admin/cursos/novo mantém "Cursos" ativo).
  const selecionado = para === '/admin' ? pathname === para : pathname.startsWith(para);

  return (
    <Link to={para} className={selecionado ? 'ativo' : ''}>
      {selecionado && <span className="marcador-ativo" />}
      <span className="titulo">{titulo}</span>
    </Link>
  );
}
