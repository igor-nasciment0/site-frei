import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Só a formatação que as telas do candidato sabem exibir (mixin texto-rico): negrito, itálico,
// sublinhado, listas e links. Títulos, citações, código etc. ficam desligados.
const EXTENSOES = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    },
  }),
];

// Editor vazio devolve "<p></p>": para o formulário (e para o "campo obrigatório") isso é vazio.
function htmlOuVazio(editor) {
  return editor.isEmpty ? "" : editor.getHTML();
}

export default function Editor({ id, value, onChange, onBlur, alturaMinima = 140, ariaLabel }) {
  // Último HTML que este editor emitiu — para distinguir "o formulário mudou por fora" (ex.: reset
  // ao carregar o registro) de "eco do que acabei de digitar".
  const ultimoEmitido = useRef(value ?? "");

  const editor = useEditor({
    extensions: EXTENSOES,
    content: value ?? "",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        style: `min-height:${alturaMinima}px`,
      },
    },
    // Só escreve no formulário quando a pessoa edita: abrir e salvar sem mexer no campo mantém o
    // HTML original intacto, mesmo que ele tenha marcações que o editor não conhece.
    onUpdate: ({ editor }) => {
      const html = htmlOuVazio(editor);
      ultimoEmitido.current = html;
      onChange?.(html);
    },
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (!editor) return;

    const novo = value ?? "";
    if (novo === ultimoEmitido.current) return;

    ultimoEmitido.current = novo;
    editor.commands.setContent(novo, { emitUpdate: false });
  }, [editor, value]);

  const ativo = useEditorState({
    editor,
    selector: ({ editor }) => ({
      negrito: editor?.isActive("bold") ?? false,
      italico: editor?.isActive("italic") ?? false,
      sublinhado: editor?.isActive("underline") ?? false,
      lista: editor?.isActive("bulletList") ?? false,
      numerada: editor?.isActive("orderedList") ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  });

  if (!editor)
    return <div className="editor-texto carregando" style={{ minHeight: alturaMinima }} />;

  function editarLink() {
    const atual = editor.getAttributes("link").href ?? "";
    const informado = window.prompt("Endereço do link (deixe em branco para remover):", atual);
    if (informado === null) return; // cancelou

    const url = informado.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    const href = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const cmd = () => editor.chain().focus();

  return (
    <div className="editor-texto">
      <div className="barra" role="toolbar" aria-label="Formatação do texto">
        <Botao titulo="Negrito (Ctrl+B)" ativo={ativo.negrito} onClick={() => cmd().toggleBold().run()}><b>N</b></Botao>
        <Botao titulo="Itálico (Ctrl+I)" ativo={ativo.italico} onClick={() => cmd().toggleItalic().run()}><i>I</i></Botao>
        <Botao titulo="Sublinhado (Ctrl+U)" ativo={ativo.sublinhado} onClick={() => cmd().toggleUnderline().run()}><u>S</u></Botao>
        <span className="separador" />
        <Botao titulo="Lista com marcadores" ativo={ativo.lista} onClick={() => cmd().toggleBulletList().run()}>• Lista</Botao>
        <Botao titulo="Lista numerada" ativo={ativo.numerada} onClick={() => cmd().toggleOrderedList().run()}>1. Lista</Botao>
        <span className="separador" />
        <Botao titulo="Inserir ou editar link" ativo={ativo.link} onClick={editarLink}>Link</Botao>
        <Botao titulo="Remover a formatação do trecho selecionado" onClick={() => cmd().unsetAllMarks().clearNodes().run()}>Limpar</Botao>
      </div>

      <EditorContent editor={editor} className="area" />
    </div>
  );
}

// onMouseDown com preventDefault: o clique no botão não tira o foco (nem a seleção) do texto.
function Botao({ titulo, ativo, onClick, children }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo ?? undefined}
      className={ativo ? "ativo" : ""}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
