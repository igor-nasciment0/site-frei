import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getCursoImagem } from "../../../../api/services/cursos";
import { enviarImagemCurso } from "../../../../api/services/admin/cursos";

const TIPOS_ACEITOS = "image/jpeg,image/jpg,image/png,image/webp";
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/**
 * Capa do curso: prévia + upload. O arquivo sobe assim que é escolhido
 * (`POST /admin/courses/{id}/image`), em requisição própria — mesmo padrão
 * do anexo do RG (`inscricao/componentes/anexoRG.jsx`). Só é possível enviar
 * depois que o curso existe (precisa do `id`), então em "Novo curso" o campo
 * fica desabilitado até o primeiro "Criar curso".
 */
export default function CapaCurso({ cursoId, imagem, onAlterado }) {
  const inputRef = useRef(null);

  const [previa, setPrevia] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Carrega a imagem já cadastrada (identificador salvo no curso) para prévia,
  // enquanto nenhum arquivo novo foi escolhido nesta sessão.
  useEffect(() => {
    if (!imagem) {
      setPrevia(null);
      return;
    }

    let urlCriada;
    let cancelado = false;

    (async () => {
      const blob = await callApi(getCursoImagem, false, imagem);
      if (!blob || cancelado) return;

      urlCriada = URL.createObjectURL(blob);
      setPrevia(urlCriada);
    })();

    return () => {
      cancelado = true;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
  }, [imagem]);

  async function selecionar(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO) {
      toast.error("Arquivo muito grande. O limite é de 4MB.");
      evento.target.value = "";
      return;
    }

    setEnviando(true);
    const resposta = await callApi(enviarImagemCurso, true, cursoId, arquivo);
    setEnviando(false);
    evento.target.value = "";

    if (!resposta) return;

    setPrevia(URL.createObjectURL(arquivo));
    onAlterado?.(resposta.image);
    toast.success("Capa do curso atualizada!");
  }

  return (
    <div className="campo largo capa-curso">
      <label>Capa do curso</label>

      <div className="capa-curso-corpo">
        {previa
          ? <img className="previa" src={previa} alt="Prévia da capa do curso" />
          : <div className="previa vazia">
              <span>foto do curso</span>
            </div>
        }

        <div className="controles">
          <input
            ref={inputRef}
            type="file"
            accept={TIPOS_ACEITOS}
            onChange={selecionar}
            hidden
          />

          <button
            type="button"
            className="btn-fantasma"
            onClick={() => inputRef.current?.click()}
            disabled={enviando || !cursoId}
          >
            {enviando ? "Enviando…" : previa ? "Trocar imagem" : "Enviar imagem"}
          </button>

          <p className="ajuda">
            {cursoId
              ? "JPG, PNG ou WEBP, até 4MB. Recomendado 1600×500 (proporção 3.2:1)."
              : "Salve o curso primeiro — a capa é enviada depois que ele existe."}
          </p>
        </div>
      </div>
    </div>
  );
}
