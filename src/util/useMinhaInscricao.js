import { useEffect, useState } from "react";
import callApi from "../api/callAPI";
import { getInscricao } from "../api/services/inscricao";

// Busca a inscrição do usuário logado no vestibular ativo (tolera 404 = sem inscrição ainda).
// Vários pontos da UI (sidebar, cabeçalho, Início, Acompanhamento) precisam saber se o usuário
// já se inscreveu — este hook centraliza a chamada para não duplicar o tratamento do 404 em cada um.
// Inscrição com curso escolhido. As opções são canceladas pelo backend quando o candidato altera
// nascimento ou escolaridade — a inscrição (protocolo, pagamento) continua existindo, mas sem curso.
export function temOpcoesDeCurso(inscricao) {
  return inscricao?.firstChoice?.courseCode > 0;
}

export default function useMinhaInscricao() {
  const [inscricao, setInscricao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await callApi(getInscricao, false);
      setInscricao(r?.status === 200 ? r.data : null);
      setCarregando(false);
    })();
  }, []);

  return { inscricao, carregando };
}
