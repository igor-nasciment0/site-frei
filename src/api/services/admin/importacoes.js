import adminApi from "../../adminBase";

// Upload multipart: o axios monta o Content-Type com o boundary sozinho a partir do
// FormData — por isso o header não é definido à mão aqui.
async function enviarCsv(rota, arquivo) {
  const form = new FormData();
  form.append('file', arquivo);

  const r = await adminApi().post(rota, form);
  return r.data;
}

export async function importarMatriculados(arquivo) {
  return enviarCsv('/admin/imports/enrolled-students', arquivo);
}

export async function importarInadimplentes(arquivo) {
  return enviarCsv('/admin/imports/delinquent-students', arquivo);
}

export async function getStatusImportacoes() {
  const r = await adminApi().get('/admin/imports/status');
  return r.data;
}
