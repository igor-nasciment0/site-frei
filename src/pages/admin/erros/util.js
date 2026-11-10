// Compartilhado pela lista e pelo detalhe do log de erros.

// "NsfApi.Application.Services.EnrollmentConfirmationEmailService" → "EnrollmentConfirmationEmailService".
export function nomeCurto(origem) {
  if (!origem) return "";
  const partes = origem.split(".");
  return partes[partes.length - 1];
}

// Rótulo e classe do status HTTP. Sem status = erro registrado fora do middleware (ex.: falha de
// e-mail capturada pelo serviço) — tratado como falha interna, igual ao filtro "server" da API.
export function situacaoStatus(statusCode) {
  if (statusCode == null) return { rotulo: "Interno", classe: "servidor" };
  if (statusCode >= 500) return { rotulo: String(statusCode), classe: "servidor" };
  return { rotulo: String(statusCode), classe: "cliente" };
}

export function rotuloUsuario(log) {
  if (!log.userName) return "Anônimo";
  return log.userRole && log.userRole !== "User" ? `${log.userName} (${log.userRole})` : log.userName;
}
