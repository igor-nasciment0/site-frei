import './index.scss';
import { Link } from 'react-router';

// Topo das páginas públicas que usam o layout do portal sem sessão (hoje, o catálogo de cursos):
// no lugar da sidebar e do cabeçalho do candidato, só a marca e os atalhos para entrar.
export default function CabecalhoPublico() {
  return (
    <header className="cabecalho-publico">
      <Link className="marca" to="/cursos">
        <img className="logo" src="/assets/images/logo.svg" alt="Instituto Social Nossa Senhora de Fátima" />
        <div>
          <p className="eyebrow">Instituto Social</p>
          <p className="sub">Nossa Senhora de Fátima</p>
        </div>
      </Link>

      <nav>
        <Link className="entrar" to="/login">Entrar</Link>
        <Link className="cadastro" to="/cadastro">Criar cadastro</Link>
      </nav>
    </header>
  );
}
