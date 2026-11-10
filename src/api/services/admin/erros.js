import adminApi from "../../adminBase";

// Log de erros da API (só Admin). tipo: "server" (falhas internas), "client" (recusas 4xx) ou vazio.
// de/ate: AAAA-MM-DD, dias de Brasília, inclusivos.
export async function listarErros({ busca, tipo, de, ate, pagina, tamanhoPagina }) {
    const r = await adminApi().get('/admin/error-logs', {
        params: {
            search: busca || undefined,
            kind: tipo || undefined,
            from: de || undefined,
            to: ate || undefined,
            page: pagina,
            pageSize: tamanhoPagina,
        }
    });
    return r.data;
}

// Um erro completo, com os outros registros da mesma requisição (related).
export async function getErro(id) {
    const r = await adminApi().get('/admin/error-logs/' + id);
    return r.data;
}
