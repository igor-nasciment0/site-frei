import './index.scss';

import { Outlet, useNavigate } from "react-router";
import get from 'local-storage';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin_sidebar';
import Carregamento from '../../components/carregamento';
import ToasterContainer from '../../components/toaster_container';

// Layout raiz das telas autenticadas do painel administrativo — paralelo a
// src/pages/app/index.jsx, mas com sessão própria (chave "adminToken",
// nunca "token") para não se misturar com a sessão do candidato.
export default function AdminApp() {
  const [admin, setAdmin] = useState(null);
  const [mostraApp, setMostraApp] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = get('adminToken');
    const adminSalvo = get('admin');

    if (!token || !adminSalvo) {
      navigate('/admin/login');
      return;
    }

    setAdmin(adminSalvo);
    setMostraApp(true);
  }, []);

  if (!mostraApp)
    return <Carregamento style={{ height: "100dvh" }} />

  return (
    <div className="admin-shell">
      <AdminSidebar admin={admin} />

      <main>
        <div className="pad">
          {/* "Outlet" é o conteúdo das subpáginas do painel */}
          <Outlet context={admin} />
        </div>
      </main>

      {/* Uma única vez aqui pro painel inteiro — sem isso, toast.error/success
          disparado por qualquer subpágina (via callApi) não aparece na tela. */}
      <ToasterContainer />
    </div>
  )
}
