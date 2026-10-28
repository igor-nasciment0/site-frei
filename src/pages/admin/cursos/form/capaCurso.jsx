import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import { getCursoImagem } from "../../../../api/services/cursos";

const TIPOS_ACEITOS = "image/jpeg,image/jpg,image/png,image/webp";
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/**
 * Imagem do curso (capa ou miniatura): prévia + upload. O arquivo sobe assim que é
 * escolhido, em requisição própria (`enviar`: `POST /admin/courses/{id}/image` ou
 * `/thumbnail`) — mesmo padrão do anexo do RG (`inscricao/componentes/anexoRG.jsx`).
 * Só é possível enviar depois que o curso existe (precisa do `id`), então em "Novo curso"
 * o campo fica desabilitado até o primeiro "Criar curso".
 *
 * `campo` é a propriedade do AdminCourseDto devolvido que guarda o novo identificador.
 */
export default function CapaCurso({ cursoId, imagem, onAlterado, enviar, campo, rotulo, recomendacao, textoVazio, mensagemSucesso, className = "" }) {
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
    const resposta = await callApi(enviar, true, cursoId, arquivo);
    setEnviando(false);
    evento.target.value = "";

    if (!resposta) return;

    setPrevia(URL.createObjectURL(arquivo));
    onAlterado?.(resposta[campo]);
    toast.success(mensagemSucesso);
  }

  return (
    <div className={"campo largo capa-curso " + className}>
      <label>{rotulo}</label>

      <div className="capa-curso-corpo">
        {previa
          ? <img className="previa" src={previa} alt={"Prévia — " + rotulo.toLowerCase()} />
          : <div className="previa vazia">
              <span>{textoVazio}</span>
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
              ? "JPG, PNG ou WEBP, até 4MB. " + recomendacao
              : "Salve o curso primeiro — a imagem é enviada depois que ele existe."}
          </p>
        </div>
      </div>
    </div>
  );
}
