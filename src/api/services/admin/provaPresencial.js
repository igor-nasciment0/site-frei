import adminApi from "../../adminBase";

// Prova presencial (só Admin): tipos de prova, salas e períodos — cadastros globais — e a alocação
// dos inscritos da edição ativa.

// -------- Tipos de prova --------

export async function listarTiposProva() {
    const r = await adminApi().get('/admin/exam-types');
    return r.data;
}

export async function getTipoProva(id) {
    const r = await adminApi().get('/admin/exam-types/' + id);
    return r.data;
}

export async function criarTipoProva(dados) {
    const r = await adminApi().post('/admin/exam-types', dados);
    return r.data;
}

export async function atualizarTipoProva(id, dados) {
    const r = await adminApi().put('/admin/exam-types/' + id, dados);
    return r.data;
}

export async function desativarTipoProva(id) {
    const r = await adminApi().delete('/admin/exam-types/' + id);
    return r.data;
}

// -------- Salas --------

export async function listarSalasProva() {
    const r = await adminApi().get('/admin/exam-rooms');
    return r.data;
}

export async function getSalaProva(id) {
    const r = await adminApi().get('/admin/exam-rooms/' + id);
    return r.data;
}

export async function criarSalaProva(dados) {
    const r = await adminApi().post('/admin/exam-rooms', dados);
    return r.data;
}

export async function atualizarSalaProva(id, dados) {
    const r = await adminApi().put('/admin/exam-rooms/' + id, dados);
    return r.data;
}

export async function desativarSalaProva(id) {
    const r = await adminApi().delete('/admin/exam-rooms/' + id);
    return r.data;
}

// -------- Períodos --------

export async function listarPeriodosProva() {
    const r = await adminApi().get('/admin/exam-periods');
    return r.data;
}

export async function getPeriodoProva(id) {
    const r = await adminApi().get('/admin/exam-periods/' + id);
    return r.data;
}

export async function criarPeriodoProva(dados) {
    const r = await adminApi().post('/admin/exam-periods', dados);
    return r.data;
}

export async function atualizarPeriodoProva(id, dados) {
    const r = await adminApi().put('/admin/exam-periods/' + id, dados);
    return r.data;
}

export async function desativarPeriodoProva(id) {
    const r = await adminApi().delete('/admin/exam-periods/' + id);
    return r.data;
}

// -------- Alocação --------

// Situação gravada + prévia de uma rodada "Refazer tudo" agora (sem gravar).
export async function getAlocacaoProva() {
    const r = await adminApi().get('/admin/exam-allocation');
    return r.data;
}

// modo: "all" (refazer tudo) ou "pending" (só quem ainda não tem alocação que valha).
export async function rodarAlocacaoProva(modo) {
    const r = await adminApi().post('/admin/exam-allocation/run', { mode: modo });
    return r.data;
}

// Copia sala e horário para o que o candidato vê (testRoom/testTime).
export async function publicarAlocacaoProva() {
    const r = await adminApi().post('/admin/exam-allocation/publish');
    return r.data;
}
