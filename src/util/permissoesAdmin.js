// O que cada perfil do painel pode fazer nas telas de inscrição — espelho dos
// [Authorize(Roles = ...)] do AdminController (nsf-app-v3). O backend é quem protege os
// endpoints; aqui é só para não mostrar ações que dariam 403.
// Sessões antigas (sem "role" salvo) são de Admin.
export function permissoesAdmin(admin) {
  const perfil = admin?.role || "Admin";
  const ehAdmin = perfil === "Admin";
  const ehSecretaria = perfil === "Secretaria";
  const ehFinanceiro = perfil === "Financeiro";

  return {
    gerarRelatorioInscricoes: ehAdmin,
    verAnexoRg: ehAdmin || ehSecretaria,
    verificarPagamento: ehAdmin || ehSecretaria,
    resetarSenha: ehAdmin || ehSecretaria,
    inserirPagamentoManual: ehAdmin || ehFinanceiro,
    resetarPagamento: ehAdmin,
    editarCursos: ehAdmin,
    removerInscricao: ehAdmin,
  };
}
