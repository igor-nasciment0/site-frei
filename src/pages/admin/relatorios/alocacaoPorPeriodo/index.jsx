import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import callApi from "../../../../api/callAPI";
import { getAlocacaoProva } from "../../../../api/services/admin/provaPresencial";
import Carregamento from "../../../../components/carregamento";
import { horario } from "../../prova/alocacao/rotulos";
import { dataDeHoje, exportarExcel } from "../util";
import "./index.scss";

// Monta o relatório a partir da alocação gravada (última rodada), sem endpoint próprio:
// GET /admin/exam-allocation já traz as vagas (sala × período, com carteiras e ocupação) e as
// inscrições com tipo, período e sala. Uma seção por período, uma linha por sala, uma coluna por
// tipo de prova. "—" = a sala não recebe aquele tipo no período; 0 = recebe, mas ninguém caiu ali.
function montarRelatorio(visao) {
  const alocados = visao.items.filter(i => i.status === "Allocated");

  // Tipos ativos na ordem de prioridade (a API já devolve assim). Uma alocação gravada com um tipo
  // que ficou inativo depois ganha coluna própria no fim, para a soma das colunas fechar com "Alocados".
  const tipos = visao.examTypes.map(t => ({ chave: t.id, nome: t.name }));
  for (const i of alocados) {
    const chave = i.examTypeId || i.examTypeName || "";
    if (!tipos.some(t => t.chave === chave))
      tipos.push({ chave, nome: i.examTypeName || "Sem tipo" });
  }
  const tipoDe = i => i.examTypeId || i.examTypeName || "";

  const zerado = () => Object.fromEntries(tipos.map(t => [t.chave, 0]));
  const periodos = [];

  for (const vaga of visao.slots) {
    let p = periodos.find(x => x.id === vaga.periodId);
    if (!p) periodos.push(p = {
      id: vaga.periodId, nome: vaga.periodName, horario: horario(vaga), salas: [],
      total: { capacidade: 0, alocados: 0, porTipo: zerado() },
    });

    const daSala = alocados.filter(i => i.periodId === vaga.periodId && i.roomId === vaga.roomId);
    const porTipo = {};
    for (const t of tipos) {
      const quantidade = daSala.filter(i => tipoDe(i) === t.chave).length;
      const aceita = vaga.examTypeNames.includes(t.nome);
      // Sala que deixou de aceitar o tipo mas ainda tem alguém dele gravado mostra o número.
      porTipo[t.chave] = aceita || quantidade > 0 ? quantidade : null;
      p.total.porTipo[t.chave] += quantidade;
    }

    p.salas.push({ id: vaga.roomId, nome: vaga.roomName, capacidade: vaga.seats, alocados: vaga.occupied, porTipo });
    p.total.capacidade += vaga.seats;
    p.total.alocados += vaga.occupied;
  }

  const geral = { capacidade: 0, alocados: 0, porTipo: zerado() };
  for (const p of periodos) {
    geral.capacidade += p.total.capacidade;
    geral.alocados += p.total.alocados;
    for (const t of tipos) geral.porTipo[t.chave] += p.total.porTipo[t.chave];
  }

  const semSala = visao.items.filter(i => i.status === "NoRoom" && !i.noLongerValid).length;

  return { tipos, periodos, geral, semSala };
}

const celula = valor => (valor === null || valor === undefined ? "—" : valor);

export default function AdminRelatorioAlocacaoPorPeriodo() {
  const [visao, setVisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      const r = await callApi(getAlocacaoProva, true);
      setCarregando(false);
      if (r?.editionId) setVisao(r);
      else setErro(true);
    })();
  }, []);

  const relatorio = useMemo(() => (visao ? montarRelatorio(visao) : null), [visao]);

  async function exportar() {
    const { tipos, periodos, geral } = relatorio;
    const colunas = [
      { titulo: "Período", valor: l => l.periodo },
      { titulo: "Horário", valor: l => l.horario },
      { titulo: "Sala", valor: l => l.sala },
      { titulo: "Capacidade", valor: l => l.capacidade },
      { titulo: "Alocados", valor: l => l.alocados },
      ...tipos.map(t => ({ titulo: t.nome, valor: l => celula(l.porTipo[t.chave]) })),
    ];

    const linhas = [];
    for (const p of periodos) {
      for (const s of p.salas)
        linhas.push({ periodo: p.nome, horario: p.horario, sala: s.nome, ...s });
      linhas.push({ periodo: p.nome, horario: p.horario, sala: "Total do período", ...p.total });
    }
    linhas.push({ periodo: "Total geral", horario: "", sala: "", ...geral });

    setExportando(true);
    await exportarExcel(colunas, linhas, `relatorio-alocacao-por-periodo-${visao.year}_${dataDeHoje()}.xlsx`);
    setExportando(false);
  }

  return (
    <div className="admin-lista admin-relatorio-alocacao-periodo">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Relatórios</p>
        <h1>Alocação por período</h1>
        <p className="subtitulo">
          Prova presencial da edição ativa: por período, a capacidade de cada sala, quantos candidatos
          foram alocados nela e quantos de cada tipo de prova.
        </p>
      </div>

      {carregando && <Carregamento />}

      {!carregando && erro &&
        <p className="aviso">Não foi possível carregar a alocação. Confira se há uma edição do vestibular ativa.</p>
      }

      {!carregando && relatorio && relatorio.periodos.length === 0 &&
        <p className="aviso">Nenhum período ativo com salas. <Link to="/admin/prova/periodos">Configurar períodos</Link></p>
      }

      {!carregando && relatorio && relatorio.periodos.length > 0 &&
        <>
          <div className="barra-resultado">
            <span>
              {relatorio.geral.alocados} {relatorio.geral.alocados === 1 ? "candidato alocado" : "candidatos alocados"} em{" "}
              {relatorio.periodos.length} {relatorio.periodos.length === 1 ? "período" : "períodos"}
            </span>
            <button type="button" className="btn-exportar" disabled={exportando} onClick={exportar}>
              {exportando ? "Gerando…" : "Exportar para Excel"}
            </button>
          </div>

          {!visao.allocatedAt &&
            <p className="nota">A alocação desta edição ainda não foi feita — as salas aparecem sem ninguém alocado.</p>
          }

          {relatorio.periodos.map(p => (
            <section key={p.id} className="periodo">
              <h2>{p.nome} <span>{p.horario}</span></h2>
              <TabelaPeriodo tipos={relatorio.tipos} linhas={p.salas} total={p.total} rotuloTotal="Total" />
            </section>
          ))}

          <section className="periodo">
            <h2>Total geral <span>todos os períodos</span></h2>
            <TabelaPeriodo tipos={relatorio.tipos} total={relatorio.geral} rotuloTotal="Total" />
          </section>

          <p className="nota">
            Sem sala: <strong>{relatorio.semSala}</strong> {relatorio.semSala === 1 ? "candidato" : "candidatos"} (não
            couberam em nenhum período). Quem não faz prova (aluno interno) não entra no relatório.
          </p>
        </>
      }
    </div>
  );
}

function TabelaPeriodo({ tipos, linhas = [], total, rotuloTotal }) {
  return (
    <div className="tabela-rolavel">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Sala</th>
            <th className="valor">Capacidade</th>
            <th className="valor">Alocados</th>
            {tipos.map(t => <th key={t.chave} className="valor tipo">{t.nome}</th>)}
          </tr>
        </thead>
        {linhas.length > 0 &&
          <tbody>
            {linhas.map(s => (
              <tr key={s.id}>
                <td>{s.nome}</td>
                <td className="valor">{s.capacidade}</td>
                <td className={"valor" + (s.alocados > s.capacidade ? " acima" : "")}>{s.alocados}</td>
                {tipos.map(t => (
                  <td key={t.chave} className={"valor" + (s.porTipo[t.chave] === null ? " sem-dado" : "")}>
                    {celula(s.porTipo[t.chave])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        }
        <tfoot>
          <tr>
            <td>{rotuloTotal}</td>
            <td className="valor">{total.capacidade}</td>
            <td className="valor">{total.alocados}</td>
            {tipos.map(t => <td key={t.chave} className="valor">{total.porTipo[t.chave]}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
