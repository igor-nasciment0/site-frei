import adminApi from "../../adminBase";

export async function login(dadosLogin) {
    const r = await adminApi().post('/admin/auth/login', dadosLogin);
    return r.data;
}

export async function bootstrap(dadosBootstrap) {
    const r = await adminApi().post('/admin/auth/bootstrap', dadosBootstrap);
    return r.data;
}

export async function listarAdmins() {
    const r = await adminApi().get('/admin/users');
    return r.data;
}

// Gera uma senha aleatória (devolvida só nesta resposta) e obriga a troca no próximo login.
export async function resetarSenhaAdmin(id) {
    const r = await adminApi().post('/admin/users/' + id + '/reset-password');
    return r.data;
}

export async function trocarSenhaAdmin(dados) {
    const r = await adminApi().post('/admin/auth/change-password', dados);
    return r.data;
}

export async function criarAdmin(novoAdmin) {
    const r = await adminApi().post('/admin/users', novoAdmin);
    return r.data;
}
