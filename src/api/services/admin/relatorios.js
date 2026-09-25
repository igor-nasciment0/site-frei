import adminApi from "../../adminBase";

// Inscrições pagas da edição ativa, com data de pagamento entre "de" e "ate" (AAAA-MM-DD).
export async function getRelatorioFinanceiro({ nome, de, ate }) {
    const r = await adminApi().get('/admin/reports/financial', {
        params: { name: nome || undefined, from: de, to: ate }
    });
    return r.data;
}
