import adminApi from "../../adminBase";

export async function getDashboard(vestibularParametersId) {
    const r = await adminApi().get('/admin/enrollments/dashboard', {
        params: vestibularParametersId ? { vestibularParametersId } : {}
    });
    return r.data;
}

export async function listarInscricoes({ search, status, vestibularParametersId, page = 1, pageSize = 20 } = {}) {
    const r = await adminApi().get('/admin/enrollments', {
        params: { search, status, vestibularParametersId, page, pageSize }
    });
    return r.data;
}

export async function getInscricao(id) {
    const r = await adminApi().get('/admin/enrollments/' + id);
    return r.data;
}

export async function resetarSenha(id, novaSenha) {
    const r = await adminApi().post('/admin/enrollments/' + id + '/reset-password', {
        newPassword: novaSenha || null
    });
    return r.data;
}

// Cancela a cobrança PIX vigente — o candidato recebe uma cobrança (e QR code) novos
// na próxima vez que abrir a tela de Acompanhamento.
export async function resetarPagamento(id) {
    const r = await adminApi().post('/admin/enrollments/' + id + '/payment/reset');
    return r.data;
}

// Marca a inscrição como paga manualmente (pagamento recebido fora do PIX), sem gerar QR code.
export async function inserirPagamentoManual(id, { valor, pagoEm, forma } = {}) {
    const r = await adminApi().post('/admin/enrollments/' + id + '/payment/manual', {
        amount: valor || null,
        paidAt: pagoEm || null,
        method: forma
    });
    return r.data;
}

// Remove definitivamente a inscrição (curso escolhido, status, dados de prova e todos os
// campos de pagamento — não há coleção separada de pagamento por inscrição). A conta do
// candidato não é afetada. Irreversível.
export async function removerInscricao(id) {
    const r = await adminApi().delete('/admin/enrollments/' + id);
    return r.data;
}

// O endpoint exige o Bearer de admin, então não dá para usar um <a href> direto —
// o arquivo vem como blob e é aberto a partir de uma URL de objeto.
export async function getDocumentoRGCandidato(userId) {
    const r = await adminApi().get(`/admin/users/${userId}/rg-document`, { responseType: 'blob' });
    return r.data;
}
