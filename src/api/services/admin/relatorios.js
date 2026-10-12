import adminApi from "../../adminBase";

// Inscrições pagas da edição ativa, com data de pagamento entre "de" e "ate" (AAAA-MM-DD).
export async function getRelatorioFinanceiro({ nome, de, ate }) {
    const r = await adminApi().get('/admin/reports/financial', {
        params: { name: nome || undefined, from: de, to: ate }
    });
    return r.data;
}

// Candidatos que informaram quem os indicou, com a inscrição dos dois na edição ativa.
export async function getRelatorioIndicacoes({ busca } = {}) {
    const r = await adminApi().get('/admin/reports/referrals', {
        params: { search: busca || undefined }
    });
    return r.data;
}

// Inscrições da edição ativa com cupom de desconto: valor cheio, desconto e quanto foi pago.
export async function getRelatorioCupons({ busca, cupom } = {}) {
    const r = await adminApi().get('/admin/reports/coupons', {
        params: { search: busca || undefined, code: cupom || undefined }
    });
    return r.data;
}
