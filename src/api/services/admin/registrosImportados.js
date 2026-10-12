import adminApi from "../../adminBase";

export async function listarMatriculados(params) {
  const r = await adminApi().get('/admin/enrolled-students', { params });
  return r.data;
}

export async function criarMatriculado(dados) {
  const r = await adminApi().post('/admin/enrolled-students', dados);
  return r.data;
}

export async function atualizarMatriculado(id, dados) {
  const r = await adminApi().put('/admin/enrolled-students/' + id, dados);
  return r.data;
}

export async function removerMatriculado(id) {
  const r = await adminApi().delete('/admin/enrolled-students/' + id);
  return r.data;
}

export async function listarInadimplentes(params) {
  const r = await adminApi().get('/admin/delinquent-students', { params });
  return r.data;
}

export async function criarInadimplente(dados) {
  const r = await adminApi().post('/admin/delinquent-students', dados);
  return r.data;
}

export async function atualizarInadimplente(id, dados) {
  const r = await adminApi().put('/admin/delinquent-students/' + id, dados);
  return r.data;
}

export async function removerInadimplente(id) {
  const r = await adminApi().delete('/admin/delinquent-students/' + id);
  return r.data;
}


export async function listarExAlunos(params) {
  const r = await adminApi().get('/admin/former-students', { params });
  return r.data;
}

export async function criarExAluno(dados) {
  const r = await adminApi().post('/admin/former-students', dados);
  return r.data;
}

export async function atualizarExAluno(id, dados) {
  const r = await adminApi().put('/admin/former-students/' + id, dados);
  return r.data;
}

export async function removerExAluno(id) {
  const r = await adminApi().delete('/admin/former-students/' + id);
  return r.data;
}
