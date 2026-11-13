import './index.scss'
import './init'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router";
import App from './pages/app';
import Inicio from './pages/app/subpages/inicio';
import Cursos from './pages/app/subpages/cursos';
import DetalhesCurso from './pages/app/subpages/cursos/detalhes';
import FAQ from './pages/app/subpages/faq';
import Inscricao from './pages/app/subpages/inscricao';
import Login from './pages/login';
import RecuperarSenha from './pages/recuperar-senha';
import Acompanhamento from './pages/app/subpages/acompanhamento';
import { LoadingBarContainer } from 'react-top-loading-bar';
import TrocarSenha from './pages/trocar-senha';
import TrocarSenhaObrigatoria from './pages/trocar-senha-obrigatoria';
import Cadastro from './pages/cadastro';
import ModalProvider from './components/modal';
import AdminApp from './pages/admin';
import AdminLogin from './pages/admin/login';
import AdminBootstrap from './pages/admin/bootstrap';
import AdminDashboard from './pages/admin/dashboard';
import AdminInscricoes from './pages/admin/inscricoes';
import AdminInscricaoDetalhes from './pages/admin/inscricoes/detalhes';
import AdminContas from './pages/admin/contas';
import AdminCursos from './pages/admin/cursos';
import AdminCursoForm from './pages/admin/cursos/form';
import AdminFAQs from './pages/admin/faq';
import AdminFAQForm from './pages/admin/faq/form';
import AdminCompatibilidades from './pages/admin/compatibilidades';
import AdminVestibular from './pages/admin/vestibular';
import AdminVestibularForm from './pages/admin/vestibular/form';
import AdminUsuarios from './pages/admin/administradores';
import AdminTrocarSenha from './pages/admin/trocar-senha';
import AdminImportacoes from './pages/admin/importacoes';
import AdminCupons from './pages/admin/cupons';
import AdminCupomForm from './pages/admin/cupons/form';
import AdminRelatorioFinanceiro from './pages/admin/relatorios/financeiro';
import AdminRelatorioIndicacoes from './pages/admin/relatorios/indicacoes';
import AdminRelatorioCupons from './pages/admin/relatorios/cupons';
import AdminRelatorioInscricoes from './pages/admin/relatorios/inscricoes';
import AdminRelatorioCursosPorPeriodo from './pages/admin/relatorios/cursosPorPeriodo';
import AdminErros from './pages/admin/erros';
import AdminErroDetalhes from './pages/admin/erros/detalhes';
import AdminAlocacaoProva from './pages/admin/prova/alocacao';
import AdminTiposProva from './pages/admin/prova/tipos';
import AdminTipoProvaForm from './pages/admin/prova/tipos/form';
import AdminSalasProva from './pages/admin/prova/salas';
import AdminSalaProvaForm from './pages/admin/prova/salas/form';
import AdminPeriodosProva from './pages/admin/prova/periodos';
import AdminPeriodoProvaForm from './pages/admin/prova/periodos/form';

createRoot(document.getElementById('root')).render(
  <LoadingBarContainer>
    <ModalProvider>
      <BrowserRouter>
        <StrictMode>
          <Routes>
            <Route path='' element={<App />}>
              <Route index element={<Inicio />} />
              <Route path='inscricao' element={<Inscricao />} />
              <Route path='acompanhamento' element={<Acompanhamento />} />
              <Route path='cursos' element={<Cursos />}>
                <Route path=':id' element={<DetalhesCurso />} />
              </Route>
              <Route path='faq' element={<FAQ />} />
            </Route>
            <Route path='/cadastro' element={<Cadastro />} />
            <Route path='/login' element={<Login />} />
            <Route path='/recuperar-senha' element={<RecuperarSenha />} />
            <Route path='/trocar-senha' element={<TrocarSenha />} />
            <Route path='/trocar-senha-obrigatoria' element={<TrocarSenhaObrigatoria />} />

            <Route path='/admin' element={<AdminApp />}>
              <Route index element={<AdminDashboard />} />
              <Route path='inscricoes' element={<AdminInscricoes />} />
              <Route path='inscricoes/:id' element={<AdminInscricaoDetalhes />} />
              <Route path='contas' element={<AdminContas />} />
              <Route path='cursos' element={<AdminCursos />} />
              <Route path='cursos/novo' element={<AdminCursoForm />} />
              <Route path='cursos/:id' element={<AdminCursoForm />} />
              <Route path='faq' element={<AdminFAQs />} />
              <Route path='faq/novo' element={<AdminFAQForm />} />
              <Route path='faq/:id' element={<AdminFAQForm />} />
              <Route path='compatibilidades' element={<AdminCompatibilidades />} />
              <Route path='vestibular' element={<AdminVestibular />} />
              <Route path='vestibular/novo' element={<AdminVestibularForm />} />
              <Route path='vestibular/:id' element={<AdminVestibularForm />} />
              <Route path='cupons' element={<AdminCupons />} />
              <Route path='cupons/novo' element={<AdminCupomForm />} />
              <Route path='cupons/:id' element={<AdminCupomForm />} />
              <Route path='importacoes' element={<AdminImportacoes />} />
              <Route path='relatorios/financeiro' element={<AdminRelatorioFinanceiro />} />
              <Route path='relatorios/indicacoes' element={<AdminRelatorioIndicacoes />} />
              <Route path='relatorios/cupons' element={<AdminRelatorioCupons />} />
              <Route path='relatorios/inscricoes-validas' element={<AdminRelatorioInscricoes key='validas' tipo='validas' />} />
              <Route path='relatorios/inscricoes-externas' element={<AdminRelatorioInscricoes key='externas' tipo='externas' />} />
              <Route path='relatorios/cursos-por-periodo' element={<AdminRelatorioCursosPorPeriodo />} />
              <Route path='administradores' element={<AdminUsuarios />} />
              <Route path='erros' element={<AdminErros />} />
              <Route path='erros/:id' element={<AdminErroDetalhes />} />
              <Route path='prova/alocacao' element={<AdminAlocacaoProva />} />
              <Route path='prova/tipos' element={<AdminTiposProva />} />
              <Route path='prova/tipos/novo' element={<AdminTipoProvaForm />} />
              <Route path='prova/tipos/:id' element={<AdminTipoProvaForm />} />
              <Route path='prova/salas' element={<AdminSalasProva />} />
              <Route path='prova/salas/nova' element={<AdminSalaProvaForm />} />
              <Route path='prova/salas/:id' element={<AdminSalaProvaForm />} />
              <Route path='prova/periodos' element={<AdminPeriodosProva />} />
              <Route path='prova/periodos/novo' element={<AdminPeriodoProvaForm />} />
              <Route path='prova/periodos/:id' element={<AdminPeriodoProvaForm />} />
            </Route>
            <Route path='/admin/trocar-senha' element={<AdminTrocarSenha />} />
            <Route path='/admin/login' element={<AdminLogin />} />
            <Route path='/admin/bootstrap' element={<AdminBootstrap />} />
          </Routes>
        </StrictMode>
      </BrowserRouter>
    </ModalProvider>
  </LoadingBarContainer >
)
