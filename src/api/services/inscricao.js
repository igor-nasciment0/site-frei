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
