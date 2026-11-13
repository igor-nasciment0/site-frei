// Situação da alocação de uma inscrição (ExamAllocationStatus da API, mais "Pending" = sem alocação).
export const SITUACAO = {
  Allocated: { rotulo: "Alocado", classe: "alocado" },
  NoExam: { rotulo: "Não faz prova", classe: "dispensado" },
  NoRoom: { rotulo: "Sem sala", classe: "alerta" },
  NoExamType: { rotulo: "Sem tipo de prova", classe: "alerta" },
  Pending: { rotulo: "Pendente", classe: "pendente" },
};

export const rotuloSituacao = status => SITUACAO[status]?.rotulo || status;

export function rotuloOpcao(item) {
  if (item.basedOnChoice === 2) return "2ª opção";
  if (item.basedOnChoice === 1) return "1ª opção";
  return "";
}

export const horario = item => (item.startTime ? `${item.startTime} às ${item.endTime}` : "");
