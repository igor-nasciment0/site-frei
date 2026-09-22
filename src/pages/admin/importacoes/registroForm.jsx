import { useForm } from "react-hook-form";
import "./registroForm.scss";

const CAMPOS = {
  matriculas: [
    { nome: "year", rotulo: "Ano", tipo: "number" },
    { nome: "studentId", rotulo: "ID do aluno", tipo: "text" },
    { nome: "cpf", rotulo: "CPF", tipo: "text" },
    { nome: "rg", rotulo: "RG", tipo: "text" },
    { nome: "courseCode", rotulo: "Código do curso", tipo: "number" },
  ],
  inadimplentes: [
    { nome: "year", rotulo: "Ano", tipo: "number" },
    { nome: "studentId", rotulo: "ID do aluno", tipo: "text" },
    { nome: "studentName", rotulo: "Nome do aluno", tipo: "text" },
    { nome: "cpf", rotulo: "CPF", tipo: "text" },
    { nome: "rg", rotulo: "RG", tipo: "text" },
    { nome: "courseCode", rotulo: "Código do curso", tipo: "number" },
    { nome: "courseName", rotulo: "Nome do curso", tipo: "text" },
    { nome: "pendingCount", rotulo: "Meses pendentes", tipo: "number" },
  ],
};

export default function RegistroForm({ tipo, registro, anoPadrao, onSalvar, fechar }) {
  const campos = CAMPOS[tipo];
  const editando = !!registro;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: registro || { year: anoPadrao },
  });

  async function submit(dados) {
    const payload = { ...dados };
    for (const campo of campos)
      if (campo.tipo === "number")
        payload[campo.nome] = Number(payload[campo.nome]);

    await onSalvar(payload);
  }

  return (
    <div className="modal-registro-importado" role="dialog" aria-modal="true" aria-labelledby="modal-registro-titulo">
      <div className="topo">
        <h2 id="modal-registro-titulo">{editando ? "Editar registro" : "Novo registro"}</h2>
        <button type="button" className="fechar" aria-label="Fechar" onClick={fechar}>×</button>
      </div>

      <form onSubmit={handleSubmit(submit)}>
        <div className="grade">
          {campos.map(campo =>
            <div className={"campo" + (errors[campo.nome] ? " erro" : "")} key={campo.nome}>
              <label htmlFor={campo.nome}>{campo.rotulo}</label>
              <input
                id={campo.nome}
                type={campo.tipo}
                step={campo.tipo === "number" ? "1" : undefined}
                {...register(campo.nome, { required: "Campo obrigatório" })}
              />
              {errors[campo.nome] && <span className="mensagem-erro">{errors[campo.nome].message}</span>}
            </div>
          )}
        </div>

        <div className="rodape-form">
          <button type="button" className="btn-fantasma" onClick={fechar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
