import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";

// Só a formatação que as telas do candidato sabem exibir (mixin texto-rico): negrito, itálico,
// sublinhado, listas, links e tabelas. Títulos, citações, código etc. ficam desligados.
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
  // Tabelas (ex.: valores de material didático na descrição do curso). Sem redimensionar coluna:
  // a largura é do CSS, igual para o editor e para a tela do candidato.
  TableKit.configure({ table: { resizable: false } }),
];

// O editor guarda só a estrutura (linhas, colunas, cabeçalho) — cores e bordas vêm do CSS. Textos
// antigos montavam "R$ … 123,00" com dois <span> lado a lado dentro da célula; sem este espaço
// eles colariam ("R$123,00") quando o editor descartasse os <span>.
function prepararHtml(html) {
  return (html ?? "").replace(/<\/span>\s*<span/gi, "</span> <span");
}

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
    content: prepararHtml(value),
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
    editor.commands.setContent(prepararHtml(novo), { emitUpdate: false });
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
      tabela: editor?.isActive("table") ?? false,
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
        <Botao titulo="Inserir tabela (3 colunas, com linha de cabeçalho)" onClick={() => cmd().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Tabela</Botao>
        <Botao titulo="Remover a formatação do trecho selecionado" onClick={() => cmd().unsetAllMarks().clearNodes().run()}>Limpar</Botao>
      </div>

      {/* Ferramentas da tabela: só aparecem com o cursor dentro de uma. */}
      {ativo.tabela &&
        <div className="barra barra-tabela" role="toolbar" aria-label="Edição da tabela">
          <span className="rotulo">Tabela</span>
          <Botao titulo="Inserir linha abaixo" onClick={() => cmd().addRowAfter().run()}>+ Linha</Botao>
          <Botao titulo="Remover a linha atual" onClick={() => cmd().deleteRow().run()}>− Linha</Botao>
          <span className="separador" />
          <Botao titulo="Inserir coluna à direita" onClick={() => cmd().addColumnAfter().run()}>+ Coluna</Botao>
          <Botao titulo="Remover a coluna atual" onClick={() => cmd().deleteColumn().run()}>− Coluna</Botao>
          <span className="separador" />
          <Botao titulo="Transformar a primeira linha em cabeçalho (ou desfazer)" onClick={() => cmd().toggleHeaderRow().run()}>Cabeçalho</Botao>
          <Botao titulo="Excluir a tabela inteira" onClick={() => cmd().deleteTable().run()}>Excluir tabela</Botao>
        </div>
      }

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
