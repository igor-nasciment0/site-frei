import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import callApi from "../../../api/callAPI";
import { getDashboard } from "../../../api/services/admin/inscricoes";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

const ATALHOS = [
  { para: "/admin/inscricoes", titulo: "Inscrições", descricao: "Ver dados completos de cada candidato e resetar senha." },
  { para: "/admin/cursos", titulo: "Cursos", descricao: "Criar, editar e desativar cursos, períodos e disciplinas." },
  { para: "/admin/faq", titulo: "Dúvidas frequentes", descricao: "Gerenciar as perguntas exibidas na Home e no FAQ." },
  { para: "/admin/vestibular", titulo: "Vestibular", descricao: "Editar datas, textos e ativar a edição corrente do processo seletivo." },
  { para: "/admin/administradores", titulo: "Administradores", descricao: "Conceder acesso ao painel para novos administradores." },
];

const STATUS_LABEL = { Open: "Abertas", Validated: "Validadas", Canceled: "Canceladas" };
const STATUS_ORDEM = ["Open", "Validated", "Canceled"];

// Cores fixas por posição (nunca por rank/valor) — mesma paleta de marca usada
// no resto do painel, reaproveitada como categórica para as séries do gráfico
// empilhado de curso x período.
const CORES_SERIE = ["serie-0", "serie-1", "serie-2", "serie-3"];
const COR_OUTROS = "serie-outros";

export default function AdminDashboard() {
  const admin = useOutletContext();
  const [dados, setDados] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(getDashboard, true);

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setDados(r);
  }

  return (
    <div className="admin-dashboard">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Olá, {admin?.name || admin?.username}</h1>
        <p className="subtitulo">Visão geral das inscrições da edição ativa do vestibular.</p>
      </div>

      {!dados && <Carregamento />}

      {dados && <EstatisticasInscricoes dados={dados} />}

      <div className="grade-atalhos">
        {ATALHOS.map(atalho => (
          <Link key={atalho.para} to={atalho.para} className="card-atalho">
            <h2>{atalho.titulo}</h2>
            <p>{atalho.descricao}</p>
            <span className="seta">Gerenciar →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EstatisticasInscricoes({ dados }) {
  const porStatus = STATUS_ORDEM.map(status => ({
    status,
    count: dados.byStatus?.find(s => s.status === status)?.count || 0,
  }));

  return (
    <div className="stats-inscricoes">
      <div className="tile-total">
        <p className="rotulo">Total de inscrições</p>
        <p className="valor">{dados.total ?? 0}</p>
      </div>

      <div className="tiles-status">
        {porStatus.map(s => (
          <div key={s.status} className={"tile-status " + s.status.toLowerCase()}>
            <span className="ponto" />
            <p className="rotulo">{STATUS_LABEL[s.status]}</p>
            <p className="valor">{s.count}</p>
          </div>
        ))}
        <div className="tile-status paga">
          <span className="ponto" />
          <p className="rotulo">Pagas</p>
          <p className="valor">{dados.paidCount ?? 0}</p>
        </div>
      </div>

      <GraficoPorDia linhas={dados.byDay || []} />
      <GraficoPorCursoPeriodo linhas={dados.byCoursePeriod || []} />
    </div>
  );
}

function GraficoPorDia({ linhas }) {
  if (linhas.length === 0) {
    return (
      <div className="card-grafico">
        <h3>Inscrições por dia</h3>
        <p className="vazio">Nenhuma inscrição registrada ainda.</p>
      </div>
    );
  }

  const max = Math.max(...linhas.map(l => l.count), 1);

  return (
    <div className="card-grafico">
      <h3>Inscrições por dia</h3>
      <div className="grafico-barras" role="img" aria-label="Inscrições por dia">
        {linhas.map(l => (
          <div key={l.date} className="coluna" title={`${formatarDataCurta(l.date)}: ${l.count} inscrição(ões)`}>
            <div className="barra" style={{ height: `${Math.max((l.count / max) * 100, l.count > 0 ? 4 : 0)}%` }} />
            <span className="rotulo-x">{formatarDataCurta(l.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraficoPorCursoPeriodo({ linhas }) {
  if (linhas.length === 0) {
    return (
      <div className="card-grafico">
        <h3>Inscrições por curso e período</h3>
        <p className="vazio">Nenhuma inscrição registrada ainda.</p>
      </div>
    );
  }

  const periodosUnicos = [...new Set(linhas.map(l => l.periodName))];
  const corDoPeriodo = (nome) => {
    const i = periodosUnicos.indexOf(nome);
    return i < CORES_SERIE.length ? CORES_SERIE[i] : COR_OUTROS;
  };

  const porCurso = new Map();
  for (const l of linhas) {
    if (!porCurso.has(l.courseName)) porCurso.set(l.courseName, []);
    porCurso.get(l.courseName).push(l);
  }

  const cursos = Array.from(porCurso, ([courseName, periodos]) => ({
    courseName,
    periodos,
    total: periodos.reduce((s, p) => s + p.count, 0),
  })).sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(...cursos.map(c => c.total), 1);

  return (
    <div className="card-grafico">
      <h3>Inscrições por curso e período</h3>

      <div className="legenda">
        {periodosUnicos.map(nome => (
          <span key={nome} className="item-legenda">
            <span className={"chip " + corDoPeriodo(nome)} />
            {nome}
          </span>
        ))}
      </div>

      <div className="grafico-barras-h">
        {cursos.map(curso => (
          <div key={curso.courseName} className="linha-barra-h">
            <span className="rotulo-y">{curso.courseName}</span>
            <div className="trilha">
              <div className="barra-empilhada" style={{ width: `${(curso.total / maxTotal) * 100}%` }}>
                {curso.periodos.map(p => (
                  <span
                    key={p.periodName}
                    className={"segmento " + corDoPeriodo(p.periodName)}
                    style={{ flex: p.count }}
                    title={`${p.periodName}: ${p.count}`}
                  />
                ))}
              </div>
              <span className="total-linha">{curso.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatarDataCurta(dataISOCurta) {
  // "byDay[].date" vem como "AAAA-MM-DD" (sem horário) — monta a data como
  // horário local para não sofrer o salto de dia de interpretar como UTC.
  const [, mes, dia] = dataISOCurta.split("-");
  return `${dia}/${mes}`;
}
