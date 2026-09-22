import adminApi from "../../adminBase";

export async function listarCursos() {
    const r = await adminApi().get('/admin/courses');
    return r.data;
}

export async function getCurso(id) {
    const r = await adminApi().get('/admin/courses/' + id);
    return r.data;
}

export async function criarCurso(dadosCurso) {
    const r = await adminApi().post('/admin/courses', dadosCurso);
    return r.data;
}

export async function atualizarCurso(id, dadosCurso) {
    const r = await adminApi().put('/admin/courses/' + id, dadosCurso);
    return r.data;
}

export async function desativarCurso(id) {
    const r = await adminApi().delete('/admin/courses/' + id);
    return r.data;
}

export async function enviarImagemCurso(id, arquivo) {
    const formData = new FormData();
    formData.append('file', arquivo);
    const r = await adminApi().post('/admin/courses/' + id + '/image', formData);
    return r.data;
}
