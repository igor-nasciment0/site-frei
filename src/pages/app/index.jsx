import './index.scss';

import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import BarraLateral from "../../components/barra_lateral";
import Cabecalho from "../../components/cabecalho";
import CabecalhoPublico from "../../components/cabecalho_publico";
import callApi from '../../api/callAPI';
import { getStatusVestibular } from '../../api/services/vestibular';
import { useEffect, useState } from 'react';
import { getInfoUsuario } from '../../api/services/user';
import { set } from 'local-storage';
import Carregamento from '../../components/carregamento';
import useMinhaInscricao from '../../util/useMinhaInscricao';

// Rotas do portal que abrem sem sessão: o catálogo de cursos (lista e detalhes). A API também
// libera esses dois endpoints (GET /courses e GET /courses/{id}).
function ehRotaPublica(pathname) {
  return pathname === "/cursos" || pathname.startsWith("/cursos/");
}

export default function App() {

  const [mostraAPP, setMostraAPP] = useState(false);
  const [statusVestibular, setStatusVestibular] = useState(null);
  const [user, setUser] = useState(null);
  // Sem sessão válida numa rota pública: mostra a página sem sidebar nem dados do candidato.
  const [visitante, setVisitante] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { inscricao } = useMinhaInscricao();

  useEffect(() => {
    (async () => {
      const usuario = await callApi(getInfoUsuario, false);

      if (!usuario) {
        if (ehRotaPublica(location.pathname)) {
          setVisitante(true);
          setMostraAPP(true);
          return;
        }

        navigate("/login");
        return;
      }

      // Senha resetada pelo admin: bloqueia o resto da área logada até trocar.
      if (usuario.mustChangePassword) {
        set("user", usuario);
        navigate("/trocar-senha-obrigatoria");
        return;
      }

      set("user", usuario);
      setUser(usuario);
      setStatusVestibular(await callApi(getStatusVestibular));
      setMostraAPP(true);
    })()
  }, [])

  if (!mostraAPP)
    return <Carregamento style={{ height: "100dvh" }} />

  if (visitante) {
    // O visitante só enxerga as rotas públicas; qualquer outra do portal exige login.
    if (!ehRotaPublica(location.pathname))
      return <Navigate to="/login" replace />

    return (
      <div className="shell publico">
        <main>
          <CabecalhoPublico />

          <div className="pad">
            <Outlet context={null} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="shell">
      <BarraLateral user={user} inscricao={inscricao} statusVestibular={statusVestibular} />

      <main>
        <Cabecalho user={user} inscricao={inscricao} />

        <div className="pad">
          {/* "Outlet" é o conteúdo das subpáginas do App */}
          {statusVestibular &&
            <Outlet context={statusVestibular} />
          }
        </div>
      </main>
    </div>
  )
}
