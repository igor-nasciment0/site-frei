import { Link, useLocation, useNavigate } from 'react-router';
import './index.scss';
import { useEffect, useState } from 'react';
import { remove } from 'local-storage';

const LINKS = [
  { para: '/admin', titulo: 'Painel' },
  { para: '/admin/inscricoes', titulo: 'Inscrições' },
  { para: '/admin/contas', titulo: 'Contas' },
  { para: '/admin/cursos', titulo: 'Cursos' },
  { para: '/admin/compatibilidades', titulo: 'Compatibilidades' },
  { para: '/admin/faq', titulo: 'Dúvidas frequentes' },
  { para: '/admin/vestibular', titulo: 'Vestibular' },
  { para: '/admin/importacoes', titulo: 'Importações' },
  { para: '/admin/administradores', titulo: 'Administradores' },
];

// Grupos expansíveis no próprio menu; o grupo abre sozinho quando a rota atual é de um dos filhos.
const GRUPOS = [
  {
    titulo: 'Relatórios',
    base: '/admin/relatorios',
    links: [
      { para: '/admin/relatorios/financeiro', titulo: 'Financeiro' },
    ],
  },
];

export default function AdminSidebar({ admin }) {
  const [aberta, setAberta] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const financeiro = admin?.role === 'Financeiro';

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
        {!financeiro && LINKS.map(link => (
          <LinkLateral key={link.para} {...link} pathname={location.pathname} />
        ))}

        {GRUPOS.map(grupo => (
          <GrupoLateral key={grupo.base} {...grupo} pathname={location.pathname} />
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

function GrupoLateral({ titulo, base, links, pathname }) {
  const ativo = pathname.startsWith(base);
  const [aberto, setAberto] = useState(ativo);

  useEffect(() => { if (ativo) setAberto(true); }, [ativo]);

  return (
    <div className="grupo-nav">
      <button
        type="button"
        className={'grupo-titulo' + (ativo ? ' ativo' : '')}
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
      >
        <span className="titulo">{titulo}</span>
        <span className={'seta' + (aberto ? ' aberta' : '')} aria-hidden="true" />
      </button>

      {aberto && (
        <div className="grupo-links">
          {links.map(link => (
            <LinkLateral key={link.para} {...link} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}
