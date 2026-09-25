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

// Sem novaSenha, o backend gera uma senha aleatória e a devolve (só nesta resposta).
export async function resetarSenhaConta(id, novaSenha) {
    const r = await adminApi().post('/admin/accounts/' + id + '/reset-password', {
        newPassword: novaSenha || null
    });
    return r.data;
}
