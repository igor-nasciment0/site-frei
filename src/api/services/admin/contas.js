import adminApi from "../../adminBase";

// Contas de candidatos (coleção users) — somente leitura no painel.
export async function listarContas({ search, page = 1, pageSize = 20 } = {}) {
    const r = await adminApi().get('/admin/accounts', {
        params: { search, page, pageSize }
    });
    return r.data;
}

export async function getConta(id) {
    const r = await adminApi().get('/admin/accounts/' + id);
    return r.data;
}
