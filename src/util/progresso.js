// Cálculo do progresso da inscrição (9 etapas: 8 passos de dados pessoais + escolha do curso).
// Usado pelo badge da sidebar e pelo card "Vestibular 2026" da Início — fora do wizard em si,
// que controla seu próprio progresso passo a passo via `passoAtual`.
//
// Os 8 passos de dados pessoais são preenchidos e enviados de uma vez só (PUT /users/profile ao final
// do wizard) — não há progresso parcial persistido no perfil. Por isso, fora do wizard, só existem
// 3 estados possíveis: nada preenchido (0/9), perfil completo mas sem curso escolhido (8/9) e
// inscrição concluída (9/9). A checagem de "perfil completo" reaproveita a mesma regra de negócio
// já usada em `Inscricao` (`podeSelecionarAbaCurso`).
export const TOTAL_ETAPAS = 9;

export function calcularProgresso(user, temInscricao) {
  if (temInscricao)
    return { concluidas: TOTAL_ETAPAS, total: TOTAL_ETAPAS };

  const perfilCompleto = !!user?.generalInfo?.howDidYouKnow;

  return { concluidas: perfilCompleto ? 8 : 0, total: TOTAL_ETAPAS };
}
