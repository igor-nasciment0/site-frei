import api from "../base";

export async function criaInscricao(dadosInscricao) {
  const r = await api().post("/enrollments", dadosInscricao)
  return r.data;
}

// Roda no backend a mesma validação de POST /enrollments, sem persistir nada — usado pra avisar
// o candidato de incompatibilidade entre 1ª/2ª opção (ou outro requisito da inscrição) antes de
// ele clicar em "Concluir Inscrição". Fonte única de verdade: nenhuma regra duplicada em JS.
export async function validaEscolhasCurso(dadosEscolhas) {
  const r = await api().post("/enrollments/validate-choices", dadosEscolhas);
  return r.data;
}

// Cursos e períodos que o candidato consegue usar como 1ª opção — matriz de compatibilidade e
// faixa de nascimento do cadastro, já filtrados pelo perfil dele (nascimento, escolaridade,
// aluno interno/externo).
export async function getOpcoesPrimeiraOpcao() {
  const r = await api().get("/enrollments/first-choice-options");
  return r.data;
}

// Obrigatoriedade da 2ª opção e cursos/períodos permitidos nela, dada a 1ª (curso e período) —
// segundo a matriz de compatibilidade do painel admin, já filtrados pelo perfil do candidato
// (aluno interno/externo, nascimento, escolaridade).
export async function getOpcoesSegundaOpcao(codigoPrimeiroCurso, codigoPrimeiroHorario) {
  const r = await api().get("/enrollments/second-choice-options", {
    params: { firstChoiceCourseCode: codigoPrimeiroCurso, firstChoicePeriodCode: codigoPrimeiroHorario }
  });
  return r.data;
}

export async function getInscricao() {
  const r = await api().get("/enrollments/my-enrollment", {
    validateStatus: status => (status >= 200 && status < 300) || status === 404
  });

  return r;
}

// Gera a cobrança PIX da taxa de inscrição — ou devolve a vigente, se ainda for válida.
export async function geraCobrancaInscricao() {
  const r = await api().post("/enrollments/my-enrollment/payment");
  return r.data;
}

// Nossa API consulta o provedor PIX e devolve a situação atualizada da cobrança.
export async function getStatusPagamentoInscricao() {
  const r = await api().get("/enrollments/my-enrollment/payment/status");
  return r.data;
}
