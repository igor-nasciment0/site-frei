import { get, set } from 'local-storage';
import { useEffect, useState } from 'react';
import callApi from '../api/callAPI';
import { atualizaUsuario } from '../api/services/user';

// Bloquear a navegação pra "Minha inscrição" enquanto o vídeo institucional (YouTube,
// statusVestibular.presentationVideoUrl, mostrado na Início) não é assistido até o fim é só
// validação de front (ver Inicio, BarraLateral e Inscricao). Mas o fato de já ter assistido
// (User.watchInstitutionVideo) é persistido no backend — senão a pessoa teria que assistir de
// novo em cada aparelho/navegador. Aqui só lemos/gravamos o campo no objeto "user" já cacheado
// no localStorage (mesmo padrão usado para o resto do perfil, ex.: mustChangePassword).
const EVENTO_ASSISTIU = 'institution-video-watched';

export function assistiuVideoInstitucional() {
  return !!get('user')?.watchInstitutionVideo;
}

// Grava no backend (PUT /users/profile, parcial) e só então atualiza o cache local — se a
// chamada falhar, fica como não assistido e tenta de novo na próxima vez que o vídeo terminar.
export async function marcarVideoInstitucionalAssistido() {
  if (assistiuVideoInstitucional()) return true;

  const r = await callApi(atualizaUsuario, false, { watchInstitutionVideo: true });
  if (!r?.data) return false;

  set('user', r.data);
  window.dispatchEvent(new Event(EVENTO_ASSISTIU));
  return true;
}

// true quando não há vídeo cadastrado (nada pra assistir, então nada bloqueia) ou quando ele já
// foi assistido.
export function podeEntrarNaInscricao(statusVestibular) {
  return !statusVestibular?.presentationVideoUrl || assistiuVideoInstitucional();
}

/** Reage em tempo real ao vídeo ser marcado como assistido na mesma aba (ex.: BarraLateral). */
export function useAssistiuVideoInstitucional() {
  const [assistiu, setAssistiu] = useState(assistiuVideoInstitucional());

  useEffect(() => {
    function aoAssistir() { setAssistiu(true); }
    window.addEventListener(EVENTO_ASSISTIU, aoAssistir);
    return () => window.removeEventListener(EVENTO_ASSISTIU, aoAssistir);
  }, []);

  return assistiu;
}
