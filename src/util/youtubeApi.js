// Carrega a IFrame Player API do YouTube uma única vez e resolve quando window.YT está pronto.
// Usado pela Início para detectar quando o candidato termina de assistir o vídeo institucional.
let promessaCarregamento = null;

export function carregarYoutubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promessaCarregamento) return promessaCarregamento;

  promessaCarregamento = new Promise(resolve => {
    const callbackAnterior = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      callbackAnterior?.();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });

  return promessaCarregamento;
}
