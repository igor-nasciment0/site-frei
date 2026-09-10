import api from "../base";

export async function criaInscricao(dadosInscricao) {
  const r = await api().post("/enrollments", dadosInscricao)
  return r.data;
}

export async function getInscricao() {
  const r = await api().get("/enrollments/my-enrollment", {
    validateStatus: status => (status >= 200 && status < 300) || status === 404
  });
  
  return r;
}
export async function getPagamentoInscricao() {
  const r = await api().get("/enrollments/my-enrollment/payment", {
    validateStatus: status => (status >= 200 && status < 300) || status === 404
  });

  return r;
}
