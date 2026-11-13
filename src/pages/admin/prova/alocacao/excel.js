import toast from "react-hot-toast";
import { formatarCpf } from "../../relatorios/util";
import { horario, rotuloOpcao, rotuloSituacao } from "./rotulos";

const texto = valor => ({ type: String, value: String(valor ?? "") });
const cabecalho = titulos => titulos.map(t => ({ value: t, fontWeight: "bold" }));

// Nome de aba do Excel: até 31 caracteres, sem : \ / ? * [ ] e sem repetir.
function nomeAba(nome, usados) {
  let base = nome.replace(/[:\\/?*[\]]/g, "-").slice(0, 31).trim();
  let candidato = base;
  for (let n = 2; usados.has(candidato.toLowerCase()); n++) {
    const sufixo = ` (${n})`;
    candidato = base.slice(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

/**
 * Uma aba "Geral" com todas as inscrições e uma aba por sala de cada período (lista de porta:
 * nº, nome, protocolo, RG e prova), na ordem dos períodos e das salas.
 */
export async function exportarAlocacao(visao, nomeArquivo) {
  try {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const usados = new Set();

    const geral = [
      cabecalho(["Nome", "Protocolo", "CPF", "RG", "1ª opção", "2ª opção", "Situação", "Prova", "Prova pela",
        "Período", "Horário", "Sala", "Publicada"]),
      ...visao.items.map(i => [
        texto(i.name), texto(i.protocol), texto(formatarCpf(i.cpf)), texto(i.rg),
        texto(i.firstChoiceCourseName), texto(i.secondChoiceCourseName),
        texto(rotuloSituacao(i.status) + (i.noLongerValid ? " (não é mais válida)" : i.outdated ? " (desatualizada)" : "")),
        texto(i.examTypeName), texto(rotuloOpcao(i)), texto(i.periodName), texto(horario(i)), texto(i.roomName),
        texto(i.publishedAt ? "Sim" : "Não"),
      ]),
    ];

    const abas = [{ data: geral, sheet: nomeAba("Geral", usados), stickyRowsCount: 1 }];

    for (const vaga of visao.slots) {
      const nomes = visao.items
        .filter(i => i.status === "Allocated" && i.periodId === vaga.periodId && i.roomId === vaga.roomId);
      if (nomes.length === 0) continue;

      const titulo = `${vaga.periodName} · ${vaga.roomName} · ${vaga.startTime} às ${vaga.endTime}`;
      abas.push({
        sheet: nomeAba(`${vaga.periodName} - ${vaga.roomName}`, usados),
        data: [
          [{ value: titulo, fontWeight: "bold" }],
          cabecalho(["Nº", "Nome", "Protocolo", "RG", "Prova"]),
          ...nomes.map((i, n) => [texto(n + 1), texto(i.name), texto(i.protocol), texto(i.rg), texto(i.examTypeName)]),
        ],
        stickyRowsCount: 2,
      });
    }

    await writeXlsxFile(abas).toFile(nomeArquivo);
  } catch {
    toast.error("Não foi possível gerar o arquivo Excel.");
  }
}
