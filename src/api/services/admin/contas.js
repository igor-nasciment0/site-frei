import adminApi from "../../adminBase";

// Contas de candidatos (coleção users). A única edição é a troca de e-mail (e o reset de senha).
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

// Troca o e-mail de login da conta (o backend grava em minúsculas e recusa e-mail de outra conta).
export async function trocarEmailConta(id, novoEmail) {
    const r = await adminApi().put('/admin/accounts/' + id + '/email', { newEmail: novoEmail });
    return r.data;
}
