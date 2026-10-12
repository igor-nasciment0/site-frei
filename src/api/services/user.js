import api from "../base";

export async function cadastro(dadosCadastro) {
    const r = await api().post('/users', dadosCadastro);
    return r.data;
}

export async function login(dadosLogin) {
    const r = await api().post('/users/login', dadosLogin);
    return r.data;
}

export async function atualizaUsuario(novosDados) {
    const r = await api().put('/users/profile', novosDados);
    return r;
}

export async function recuperacaoSenha(dados) {
    const r = await api().post('/users/forgot-password', dados);
    return r.data;
}

export async function trocaSenha(dados) {
    const r = await api().post('/users/reset-password', dados);
    return r.data;
}

// Troca de senha do candidato já logado (exige a senha atual) — usado tanto para
// troca voluntária quanto para a troca obrigatória após um reset feito pelo admin.
export async function trocaSenhaLogado(dados) {
    const r = await api().post('/users/change-password', dados);
    return r.data;
}

export async function getInfoUsuario() {
    const r = await api().get('/users/profile');

    return r.data;
}

// O anexo do RG não cabe no PUT /users/profile (JSON) — sobe em requisição própria,
// multipart, assim que o candidato escolhe o arquivo.
export async function enviaDocumentoRG(arquivo) {
    const form = new FormData();
    form.append('file', arquivo);

    const r = await api().post('/users/rg-document', form);
    return r.data;
}

export async function getDocumentoRG() {
    const r = await api().get('/users/rg-document', { responseType: 'blob' });
    return r.data;
}

// Cupom de desconto da taxa de inscrição (etapa 8). A validação é toda do backend: cupom
// recusado volta 200 com { valid: false, message } — o motivo aparece na tela, não em toast.
export async function aplicaCupom(codigo) {
    const r = await api().post('/users/coupon', { code: codigo });
    return r.data;
}

// Situação do cupom já aplicado, revalidado agora. 204 (sem cupom) chega como string vazia.
export async function getCupomAplicado() {
    const r = await api().get('/users/coupon');
    return r.data || { valid: false, code: null, message: "" };
}

export async function removeCupom() {
    const r = await api().delete('/users/coupon');
    return r.data;
}
