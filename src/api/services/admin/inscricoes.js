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

// Altera a data de nascimento ("AAAA-MM-DD") e a série atual do candidato dono da inscrição. Com
// curso escolhido, a API só grava se as opções de curso continuarem passando em todas as
// validações da inscrição. cancelarOpcoesSeInvalidas só vale para inscrição aberta e não paga:
// grava mesmo assim e cancela as opções de curso, como na alteração feita pelo candidato.
export async function atualizarNascimentoEscolaridade(id, { dataNascimento, serieAtual, cancelarOpcoesSeInvalidas = false }) {
    const r = await adminApi().put('/admin/enrollments/' + id + '/birth-school', {
        birthDate: dataNascimento,
        currentGrade: serieAtual,
        cancelChoicesIfInvalid: cancelarOpcoesSeInvalidas
    });
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

// Inicia no backend a verificação em lote de todos os pagamentos pendentes da edição ativa
// (todas as páginas da lista). Roda em segundo plano, com 0,5s entre as consultas ao provedor;
// com outro lote em andamento, não inicia um novo e devolve a situação do atual.
export async function iniciarVerificacaoPendentes() {
    const r = await adminApi().post('/admin/enrollments/pending-payments/check');
    return r.data;
}

// Situação do lote em andamento ou do último concluído. O 204 (nenhum lote desde que a API
// subiu) vira { running: false, nenhum: true } — o callApi trocaria um retorno vazio por
// { success: true }.
export async function getVerificacaoPendentes() {
    const r = await adminApi().get('/admin/enrollments/pending-payments/check');
    return r.status === 204 ? { running: false, nenhum: true } : r.data;
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

// Reenvia o e-mail de confirmação de inscrição ao candidato e aos responsáveis com e-mail (só
// com pagamento confirmado). Devolve { success, sentTo, failedTo }; se ninguém recebeu, erro 400.
export async function reenviarEmailConfirmacao(id) {
    const r = await adminApi().post('/admin/enrollments/' + id + '/confirmation-email/resend');
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
