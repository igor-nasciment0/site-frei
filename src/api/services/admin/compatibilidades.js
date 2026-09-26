import adminApi from "../../adminBase";

// Matriz de compatibilidade: linhas = 1ª opção, colunas = 2ª opção.
export async function getCompatibilidades() {
    const r = await adminApi().get('/admin/compatibilities');
    return r.data;
}

// Grava só as linhas enviadas; devolve a matriz inteira atualizada.
export async function salvarCompatibilidades(linhas) {
    const r = await adminApi().put('/admin/compatibilities', { rows: linhas });
    return r.data;
}
