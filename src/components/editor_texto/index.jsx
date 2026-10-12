import { lazy, Suspense } from "react";
import "./index.scss";

// O editor (TipTap) só é usado no painel admin: carregado sob demanda para não pesar no
// bundle do portal do candidato.
const Editor = lazy(() => import("./editor"));

// Campo de texto formatado para os formulários do admin — quem edita não precisa saber HTML.
// Recebe e devolve HTML (value/onChange), no mesmo formato que os campos "aceita HTML" já gravavam.
export default function EditorTexto(props) {
  return (
    <Suspense fallback={<div className="editor-texto carregando" style={{ minHeight: props.alturaMinima ?? 140 }} />}>
      <Editor {...props} />
    </Suspense>
  );
}
