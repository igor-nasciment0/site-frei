import React from "react";

export function formatarData(stringData) {
  return new Date(stringData).toLocaleDateString()
}

// Casa URLs soltas no meio do texto (com http(s):// ou começando por www.), parando antes
// de pontuação de fim de frase que normalmente vem colada (. , ; : ! ? ) ' ").
const REGEX_URL = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)'"])/gi;

export function formatarComoHTML(texto) {
  const html = new DOMParser().parseFromString(texto ?? "", "text/html");
  linkificar(html.body);
  return <span dangerouslySetInnerHTML={{ __html: html.body.innerHTML }} />;
}

// Percorre os nós de texto (sem entrar em links já existentes) e transforma URLs soltas em
// <a target="_blank">, para o caso comum de colarem um link cru no meio do texto do FAQ,
// da descrição do curso etc.
function linkificar(elemento) {
  for (const no of Array.from(elemento.childNodes)) {
    if (no.nodeType === Node.TEXT_NODE)
      substituirUrlsNoTexto(no);
    else if (no.nodeType === Node.ELEMENT_NODE && no.tagName !== "A")
      linkificar(no);
  }
}

function substituirUrlsNoTexto(noTexto) {
  const partes = noTexto.textContent.split(REGEX_URL);
  if (partes.length === 1) return; // nenhuma URL encontrada

  const fragmento = document.createDocumentFragment();

  partes.forEach((parte, i) => {
    if (!parte) return;

    // REGEX_URL tem um único grupo de captura: o split sempre devolve o trecho
    // casado nos índices ímpares, alternado com texto comum nos pares.
    if (i % 2 === 1) {
      const link = document.createElement("a");
      link.href = /^https?:\/\//i.test(parte) ? parte : `https://${parte}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = parte;
      fragmento.appendChild(link);
    } else {
      fragmento.appendChild(document.createTextNode(parte));
    }
  });

  noTexto.replaceWith(fragmento);
}

export function corrigeURLVideo(url) {
  try {
    const u = new URL(url);

    let videoId = "";
    let params = "";

    if (u.hostname.includes("youtu.be")) {
      // Caso short link: https://youtu.be/VIDEOID
      videoId = u.pathname.slice(1); // remove a primeira "/"
    } else if (u.hostname.includes("youtube.com")) {
      // Caso normal: https://www.youtube.com/watch?v=VIDEOID
      videoId = u.searchParams.get("v");
    }

    // Se existir uma playlist ou outros parâmetros (ex: ?list=...)
    const listParam = u.searchParams.get("list");
    if (listParam) {
      params += `?list=${listParam}`;
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}${params}` : null;
  } catch {
    return null; // URL inválida
  }
}