import adminApi from "../../adminBase";

export async function listarCupons() {
    const r = await adminApi().get('/admin/coupons');
    return r.data;
}

export async function getCupom(id) {
    const r = await adminApi().get('/admin/coupons/' + id);
    return r.data;
}

export async function criarCupom(dadosCupom) {
    const r = await adminApi().post('/admin/coupons', dadosCupom);
    return r.data;
}

export async function atualizarCupom(id, dadosCupom) {
    const r = await adminApi().put('/admin/coupons/' + id, dadosCupom);
    return r.data;
}

export async function desativarCupom(id) {
    const r = await adminApi().delete('/admin/coupons/' + id);
    return r.data;
}
