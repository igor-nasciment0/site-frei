import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import {
  getAlocacaoProva, rodarAlocacaoProva, publicarAlocacaoProva,
} from "../../../../api/services/admin/provaPresencial";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import { dataDeHoje, formatarDataHora } from "../../relatorios/util";
import { exportarAlocacao } from "./excel";
import { SITUACAO, horario, rotuloOpcao, rotuloSituacao } from "./rotulos";
import "./index.scss";

export default function AdminAlocacaoProva() {
  const [visao, setVisao] = useState(null);
  const [erro, setErro] = useState(false);
  const [ocupado, setOcupado] = useState(""); // "", "all", "pending", "publicar", "exportar"
  const [aba, setAba] = useState("salas");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(getAlocacaoProva, true);
    if (r?.editionId) setVisao(r);
    else setErro(true);
  }

  async function rodar(modo) {
    const texto = modo === "all"
      ? "Refazer tudo? Todas as inscrições válidas são redistribuídas do zero — quem já tinha sala pode mudar de sala. " +
        "O candidato só vê a mudança depois de publicar."
      : "Alocar pendentes? Quem já tem sala continua onde está; só quem ainda não tem alocação (ou está sem sala, " +
        "desatualizado) é distribuído nas carteiras que sobraram.";
    if (!confirm(texto)) return;

    setOcupado(modo);
    const r = await callApi(rodarAlocacaoProva, true, modo);
    setOcupado("");
    if (r?.editionId) {
      setVisao(r);
      toast.success(`Alocação feita: ${r.summary.allocated} com sala, ${r.summary.noRoom} sem sala.`);
    }
  }

  async function publicar() {
    if (!confirm("Publicar? Sala e horário passam a aparecer no Acompanhamento de cada candidato alocado. " +
      "Quem ficou sem sala, ou não faz prova, fica sem sala e horário. Nenhum e-mail é enviado.")) return;

    setOcupado("publicar");
    const r = await callApi(publicarAlocacaoProva, true);
    setOcupado("");
    if (r?.editionId) {
      setVisao(r);
      toast.success("Alocação publicada.");
    }
  }

  async function exportar() {
    setOcupado("exportar");
    await exportarAlocacao(visao, `alocacao-prova-${visao.year}_${dataDeHoje()}.xlsx`);
    setOcupado("");
  }

  if (erro)
    return (
      <div className="admin-alocacao-prova">
        <Cabecalho />
        <p className="aviso">Não foi possível carregar a alocação. Confira se há uma edição do vestibular ativa.</p>
      </div>
    );

  if (!visao) return <Carregamento />;

  const s = visao.summary;
  const precisaRodar = s.pending + s.outdated + s.noLongerValid;

  return (
    <div className="admin-alocacao-prova">
      <Cabecalho visao={visao} />

      <div className="situacao">
        <p>
          {visao.allocatedAt
            ? <>Última rodada em <strong>{formatarDataHora(visao.allocatedAt)}</strong>. </>
            : <>A alocação desta edição ainda não foi feita. </>}
          {visao.publishedAt
            ? <>Publicada em <strong>{formatarDataHora(visao.publishedAt)}</strong>.</>
            : <>Ainda não publicada — o candidato não vê sala nem horário.</>}
        </p>
        {visao.hasUnpublishedChanges && visao.publishedAt &&
          <p className="alerta">Há uma rodada mais nova que a publicação: o candidato ainda vê a sala anterior. Publique de novo.</p>
        }
        {visao.allocatedAt && precisaRodar > 0 &&
          <p className="alerta">
            {s.pending > 0 && `${s.pending} inscrição(ões) válida(s) sem alocação. `}
            {s.outdated > 0 && `${s.outdated} alocação(ões) desatualizada(s) (curso, cadastro ou tipo de prova mudou). `}
            {s.noLongerValid > 0 && `${s.noLongerValid} alocação(ões) de inscrição que deixou de ser válida. `}
            Use &quot;Alocar pendentes&quot; para acertar sem mexer em quem já está alocado.
          </p>
        }

        <div className="acoes">
          <button type="button" className="btn-primario" disabled={!!ocupado} onClick={() => rodar("pending")}>
            {ocupado === "pending" ? "Alocando…" : "Alocar pendentes"}
          </button>
          <button type="button" className="btn-fantasma" disabled={!!ocupado} onClick={() => rodar("all")}>
            {ocupado === "all" ? "Alocando…" : "Refazer tudo"}
          </button>
          <button type="button" className="btn-fantasma" disabled={!!ocupado || !visao.allocatedAt} onClick={publicar}>
            {ocupado === "publicar" ? "Publicando…" : "Publicar"}
          </button>
          <button type="button" className="btn-fantasma" disabled={!!ocupado || visao.items.length === 0} onClick={exportar}>
            {ocupado === "exportar" ? "Gerando…" : "Exportar para Excel"}
          </button>
        </div>
      </div>

      <div className="resumo">
        <Numero rotulo="Inscrições válidas" valor={s.validEnrollments} />
        <Numero rotulo="Alocadas" valor={s.allocated} />
        <Numero rotulo="Não fazem prova" valor={s.noExam} />
        <Numero rotulo="Sem sala" valor={s.noRoom} alerta />
        <Numero rotulo="Sem tipo de prova" valor={s.noExamType} alerta />
        <Numero rotulo="Pendentes" valor={s.pending} alerta />
      </div>

      <TabelaTipos tipos={visao.examTypes} />

      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === "salas"} className={aba === "salas" ? "ativa" : ""} onClick={() => setAba("salas")}>Por sala</button>
        <button role="tab" aria-selected={aba === "lista"} className={aba === "lista" ? "ativa" : ""} onClick={() => setAba("lista")}>Lista</button>
      </div>

      {aba === "salas" ? <PorSala visao={visao} /> : <Lista visao={visao} />}
    </div>
  );
}

function Cabecalho({ visao }) {
  return (
    <div className="cabecalho-pagina">
      <div>
        <p className="eyebrow">Prova presencial</p>
        <h1>Alocação</h1>
        {visao &&
          <p className="subtitulo">
            Vestibular {visao.year} · prova em {converterDataUTCParaLocalSemMudarDia(visao.testDate)} ·
            inscrições válidas (pagas e não canceladas) da edição ativa.
          </p>
        }
      </div>
    </div>
  );
}

function Numero({ rotulo, valor, alerta }) {
  return (
    <div className={alerta && valor > 0 ? "com-alerta" : ""}>
      <span className="rotulo">{rotulo}</span>
      <span className="valor">{valor}</span>
    </div>
  );
}

function TabelaTipos({ tipos }) {
  return (
    <div className="tabela-rolavel">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tipo de prova</th>
            <th className="numero">Prioridade</th>
            <th className="numero">Fazem a prova</th>
            <th className="numero">Pela 2ª opção</th>
            <th className="numero" title="Carteiras das salas que aceitam o tipo, somadas nos períodos (divididas com os outros tipos da sala)">Carteiras</th>
            <th className="numero" title="Se rodar &quot;Refazer tudo&quot; agora">Prévia: cabem</th>
            <th className="numero" title="Se rodar &quot;Refazer tudo&quot; agora">Prévia: sem sala</th>
            <th className="numero">Alocados</th>
            <th className="numero">Sem sala</th>
          </tr>
        </thead>
        <tbody>
          {tipos.length === 0 &&
            <tr className="vazio"><td colSpan={9}>Nenhum tipo de prova ativo. <Link to="/admin/prova/tipos">Cadastrar</Link></td></tr>
          }
          {tipos.map(t => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong></td>
              <td className="numero">{t.priority}</td>
              <td className="numero">{t.demand}</td>
              <td className="numero">{t.fromSecondChoice}</td>
              <td className="numero">{t.seats}</td>
              <td className="numero">{t.previewAllocated}</td>
              <td className={"numero" + (t.previewNoRoom > 0 ? " alerta" : "")}>{t.previewNoRoom}</td>
              <td className="numero">{t.allocated}</td>
              <td className={"numero" + (t.noRoom > 0 ? " alerta" : "")}>{t.noRoom}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PorSala({ visao }) {
  const [aberta, setAberta] = useState(null);

  const periodos = useMemo(() => {
    const grupos = [];
    for (const vaga of visao.slots) {
      let g = grupos.find(x => x.periodId === vaga.periodId);
      if (!g) grupos.push(g = {
        periodId: vaga.periodId, nome: vaga.periodName, horario: horario(vaga), vagas: [],
        limites: (visao.periodLimits || []).filter(l => l.periodId === vaga.periodId),
      });
      g.vagas.push(vaga);
    }
    return grupos;
  }, [visao]);

  if (periodos.length === 0)
    return <p className="aviso">Nenhum período ativo com salas. <Link to="/admin/prova/periodos">Configurar períodos</Link></p>;

  return (
    <div className="por-sala">
      {periodos.map(p => {
        const ocupadas = p.vagas.reduce((soma, v) => soma + v.occupied, 0);
        const total = p.vagas.reduce((soma, v) => soma + v.seats, 0);
        return (
          <section key={p.periodId} className="periodo">
            <h2>{p.nome} <span>{p.horario} · {ocupadas}/{total} carteiras</span></h2>
            {p.limites.length > 0 &&
              <ul className="limites">
                {p.limites.map((l, n) => (
                  <li key={n} className={l.occupied > l.maxAllocations ? "acima" : l.occupied === l.maxAllocations ? "cheio" : ""}>
                    <strong>{l.name || l.examTypeNames.join(" + ")}</strong>
                    {l.name && <span className="tipos-limite">{l.examTypeNames.join(" · ")}</span>}
                    <span className="uso">{l.occupied}/{l.maxAllocations}</span>
                    {l.occupied > l.maxAllocations && <span className="aviso-limite">acima do limite</span>}
                  </li>
                ))}
              </ul>
            }
            <div className="salas">
              {p.vagas.map(v => {
                const chave = `${v.periodId}|${v.roomId}`;
                const lotada = v.seats > 0 && v.occupied >= v.seats;
                const nomes = aberta === chave
                  ? visao.items.filter(i => i.status === "Allocated" && i.periodId === v.periodId && i.roomId === v.roomId)
                  : [];
                return (
                  <div key={chave} className={"sala" + (v.occupied > v.seats ? " acima" : "")}>
                    <div className="topo">
                      <strong>{v.roomName}</strong>
                      <span className={lotada ? "lotada" : ""}>{v.occupied}/{v.seats}</span>
                    </div>
                    <div className="barra" aria-hidden="true">
                      <span style={{ width: `${v.seats ? Math.min(100, (v.occupied / v.seats) * 100) : 0}%` }} />
                    </div>
                    <p className="tipos">{v.examTypeNames.join(" · ")}</p>
                    {v.occupied > 0 &&
                      <button type="button" className="ver-nomes" aria-expanded={aberta === chave}
                        onClick={() => setAberta(aberta === chave ? null : chave)}>
                        {aberta === chave ? "Ocultar nomes" : "Ver nomes"}
                      </button>
                    }
                    {nomes.length > 0 &&
                      <ol className="nomes">
                        {nomes.map(i => (
                          <li key={i.enrollmentId}>
                            <Link to={`/admin/inscricoes/${i.enrollmentId}`}>{i.name}</Link>
                            <span>{i.examTypeName}</span>
                          </li>
                        ))}
                      </ol>
                    }
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Lista({ visao }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const [tipo, setTipo] = useState("");
  const [vaga, setVaga] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const digitos = busca.replace(/\D/g, "");
    return visao.items.filter(i => {
      if (termo && !(i.name.toLocaleLowerCase("pt-BR").includes(termo) || i.protocol.includes(termo)
        || (digitos.length >= 3 && String(i.cpf).replace(/\D/g, "").includes(digitos)))) return false;
      if (situacao === "Outdated" ? !i.outdated : situacao === "NoLongerValid" ? !i.noLongerValid : situacao && i.status !== situacao) return false;
      if (tipo && i.examTypeId !== tipo) return false;
      if (vaga && `${i.periodId}|${i.roomId}` !== vaga) return false;
      return true;
    });
  }, [visao, busca, situacao, tipo, vaga]);

  return (
    <div className="lista">
      <div className="filtros">
        <label className="busca">
          <span>Buscar</span>
          <input type="search" placeholder="Nome, protocolo ou CPF" value={busca} onChange={e => setBusca(e.target.value)} />
        </label>
        <label>
          <span>Situação</span>
          <select value={situacao} onChange={e => setSituacao(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(SITUACAO).map(([valor, { rotulo }]) => <option key={valor} value={valor}>{rotulo}</option>)}
            <option value="Outdated">Desatualizada</option>
            <option value="NoLongerValid">Não é mais válida</option>
          </select>
        </label>
        <label>
          <span>Prova</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todas</option>
            {visao.examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>
          <span>Período e sala</span>
          <select value={vaga} onChange={e => setVaga(e.target.value)}>
            <option value="">Todas</option>
            {visao.slots.map(v => (
              <option key={`${v.periodId}|${v.roomId}`} value={`${v.periodId}|${v.roomId}`}>{v.periodName} · {v.roomName}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="contagem">{filtrados.length} de {visao.items.length} inscrições</p>

      <div className="tabela-rolavel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Protocolo</th>
              <th>1ª opção</th>
              <th>2ª opção</th>
              <th>Situação</th>
              <th>Prova</th>
              <th>Período</th>
              <th>Sala</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 &&
              <tr className="vazio"><td colSpan={8}>Nenhuma inscrição para este filtro.</td></tr>
            }
            {filtrados.map(i => (
              <tr key={i.enrollmentId}>
                <td>{i.name || "—"}</td>
                <td><Link to={`/admin/inscricoes/${i.enrollmentId}`}>{i.protocol}</Link></td>
                <td>{i.firstChoiceCourseName}</td>
                <td>{i.secondChoiceCourseName || "—"}</td>
                <td>
                  <span className={"admin-badge situacao-" + (SITUACAO[i.status]?.classe || "")}>{rotuloSituacao(i.status)}</span>
                  {i.outdated && <span className="admin-badge situacao-alerta">Desatualizada</span>}
                  {i.noLongerValid && <span className="admin-badge situacao-alerta">Não é mais válida</span>}
                  {i.publishedAt && <span className="publicada">publicada</span>}
                </td>
                <td>
                  {i.examTypeName || "—"}
                  {i.basedOnChoice === 2 && <small>{rotuloOpcao(i)}</small>}
                </td>
                <td>{i.periodName ? <>{i.periodName}<small>{horario(i)}</small></> : "—"}</td>
                <td>{i.roomName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
