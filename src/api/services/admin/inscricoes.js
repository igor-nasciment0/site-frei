import adminApi from "../../adminBase";

export async function getDashboard(vestibularParametersId) {
    const r = await adminApi().get('/admin/enrollments/dashboard', {
        params: vestibularParametersId ? { vestibularParametersId } : {}
    });
    return r.data;
}

// pendingPayment: só inscrições não canceladas com pagamento ainda não confirmado.
export async function listarInscricoes({ search, status, pendingPayment, vestibularParametersId, page = 1, pageSize = 20 } = {}) {
    const r = await adminApi().get('/admin/enrollments', {
        params: { search, status, pendingPayment, vestibularParametersId, page, pageSize }
    });
    return r.data;
}

// Mesmos filtros de listarInscricoes, sem paginação — traz todas as páginas de uma vez
// para o relatório Excel da tela de inscrições.
export async function getRelatorioInscricoes({ search, status, pendingPayment, vestibularParametersId } = {}) {
    const r = await adminApi().get('/admin/enrollments/report', {
        params: { search, status, pendingPayment, vestibularParametersId }
    });
    return r.data;
}

export async function getInscricao(id) {
    const r = await adminApi().get('/admin/enrollments/' + id);
    return r.data;
}

// Cursos e períodos que o candidato dono da inscrição consegue usar como 1ª opção — mesmo
// filtro do formulário dele (matriz de compatibilidade + nascimento do cadastro).
export async function getOpcoesPrimeiraOpcaoAdmin(id) {
    const r = await adminApi().get('/admin/enrollments/' + id + '/first-choice-options');
    return r.data;
}

// O que a 1ª opção (curso e período) permite como 2ª, já filtrado pelo perfil do candidato
// dono da inscrição (aluno interno/externo, nascimento, escolaridade).
export async function getOpcoesSegundaOpcaoAdmin(id, firstChoiceCourseCode, firstChoicePeriodCode) {
    const r = await adminApi().get('/admin/enrollments/' + id + '/second-choice-options', {
        params: { firstChoiceCourseCode, firstChoicePeriodCode }
    });
    return r.data;
}

// Troca a 1ª/2ª opção de curso e período da inscrição. Roda as mesmas validações do formulário
// do candidato (matriz de compatibilidade, idade, RG, mensalidades em aberto, cadastro completo)
// — a diferença é que aqui funciona mesmo com a inscrição já validada ou com o pagamento
// confirmado, travas que só existem para impedir o candidato de mexer sozinho depois disso.
export async function atualizarEscolhasCurso(id, escolhas) {
    const r = await adminApi().put('/admin/enrollments/' + id + '/choices', escolhas);
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

// Força a consulta da cobrança PIX no provedor (o mesmo que a tela de Acompanhamento do
// candidato faz a cada 5s) e grava a situação. Se confirmar o pagamento, o backend envia o
// e-mail de confirmação de inscrição.
export async function verificarPagamento(id) {
    const r = await adminApi().post('/admin/enrollments/' + id + '/payment/refresh');
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
