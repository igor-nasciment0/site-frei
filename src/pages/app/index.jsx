import './index.scss';

import { Outlet, useNavigate } from "react-router";
import BarraLateral from "../../components/barra_lateral";
import Cabecalho from "../../components/cabecalho";
import callApi from '../../api/callAPI';
import { getStatusVestibular } from '../../api/services/vestibular';
import { useEffect, useState } from 'react';
import { getInfoUsuario } from '../../api/services/user';
import { set } from 'local-storage';
import Carregamento from '../../components/carregamento';
import useMinhaInscricao from '../../util/useMinhaInscricao';

export default function App() {

  const [mostraAPP, setMostraAPP] = useState(false);
  const [statusVestibular, setStatusVestibular] = useState(null);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const { inscricao } = useMinhaInscricao();

  useEffect(() => {
    (async () => {
      const usuario = await callApi(getInfoUsuario, false);

      if (!usuario) {
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
