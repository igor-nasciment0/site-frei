import api from "../base";

export async function getCursos() {
    const r = await api().get("/courses");
    return r.data;
}

// Endpoint anônimo: o painel institucional das telas públicas (login, cadastro, recuperar
// senha) precisa do número e ali não há token.
export async function getTotalCursos() {
    const r = await api().get("/courses/count");
    return r.data?.total;
}

export async function getCursoId(idCurso) {
    const r = await api().get("/courses/" + idCurso);
    return r.data;
}

export async function getCursoImagem(idImagem) {
    const r = await api().get("/courses/" + idImagem + "/image", { responseType: "blob" });
    return r.data;
}

export async function getCursoHorarios(idCurso) {
    const r = await api().get("/courses/" + idCurso + "/periods");
    return r.data;
}

// URL direta da imagem do curso — o endpoint é anônimo, então dá para usar num <img> comum
// (com loading="lazy" e cache do navegador), sem baixar como blob.
export function urlImagemCurso(idImagem) {
    return idImagem ? `${import.meta.env.VITE_API_URL}/courses/${encodeURIComponent(idImagem)}/image` : null;
}
