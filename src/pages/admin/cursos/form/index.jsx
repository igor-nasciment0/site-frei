import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { useLoadingBar } from "react-top-loading-bar";
import callApi from "../../../../api/callAPI";
import { criarCurso, atualizarCurso, getCurso } from "../../../../api/services/admin/cursos";
import Carregamento from "../../../../components/carregamento";
import { formatarParaInputDate } from "../../../../util/date";
import padroesCurso from "./padroes";
import CapaCurso from "./capaCurso";
import "./index.scss";

// Os inputs <type="date"> exigem "AAAA-MM-DD"; a API trabalha com data-time
// UTC — mesma conversão usada em Inscrição (src/util/date.js).
function paraISODataSimples(valorInputDate) {
  return valorInputDate ? valorInputDate + "T00:00:00.000Z" : null;
}

export default function AdminCursoForm() {
  const { id } = useParams();
  const editando = !!id;

  const [carregando, setCarregando] = useState(editando);
  const navigate = useNavigate();
  const { start, complete } = useLoadingBar({ color: "#C2A46A", height: 3 });

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: padroesCurso,
  });

  const periodos = useFieldArray({ control, name: "availablePeriods" });
  const disciplinas = useFieldArray({ control, name: "subjects" });

  useEffect(() => {
    if (!editando) return;

    (async () => {
      const curso = await callApi(getCurso, true, id);

      if (!curso) {
        navigate("/admin/cursos");
        return;
      }

      reset({
        ...padroesCurso,
        ...curso,
        maxBirtDate: formatarParaInputDate(curso.maxBirtDate),
        minBirthDate: formatarParaInputDate(curso.minBirthDate),
      });
      setCarregando(false);
    })();
  }, [id]);

  async function submit(dados) {
    const payload = {
      ...dados,
      code: Number(dados.code),
      maxBirtDate: paraISODataSimples(dados.maxBirtDate),
      minBirthDate: paraISODataSimples(dados.minBirthDate),
      availablePeriods: dados.availablePeriods.map(p => ({ ...p, code: Number(p.code) })),
      subjects: dados.subjects.map(s => ({ ...s, code: Number(s.code) })),
      installmentsCount: Number(dados.installmentsCount) || 0,
      installmentValue: Number(dados.installmentValue) || 0,
    };

    const r = editando
      ? await callApi(atualizarCurso, true, id, payload)
      : await callApi(criarCurso, true, payload);

    if (r?.id) {
      start("continuous", 0, 100);
      setTimeout(complete, 750);

      if (editando) {
        toast.success("Curso atualizado!");
        setTimeout(() => navigate("/admin/cursos"), 1000);
      } else {
        // Fica na edição do curso recém-criado: o envio da capa só é possível
        // depois que o curso existe (precisa do id).
        toast.success("Curso criado! Agora você já pode enviar a capa.");
        setTimeout(() => navigate("/admin/cursos/" + r.id, { replace: true }), 1000);
      }
    }
  }

  if (carregando)
    return <Carregamento />

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>{editando ? "Editar curso" : "Novo curso"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={handleSubmit(submit)}>
          <div className="grade">
            <div className={"campo " + (errors.name ? "erro" : "")}>
              <label htmlFor="name">Nome</label>
              <input {...register("name", { required: "Campo obrigatório" })} type="text" />
              {errors.name && <span className="mensagem-erro">{errors.name.message}</span>}
            </div>

            <div className={"campo " + (errors.code ? "erro" : "")}>
              <label htmlFor="code">Código</label>
              <input {...register("code", { required: "Campo obrigatório" })} type="number" />
              {errors.code && <span className="mensagem-erro">{errors.code.message}</span>}
            </div>

            <div className="campo">
              <label htmlFor="type">Tipo</label>
              <input {...register("type")} type="text" placeholder="Ex.: Técnico, Livre, Teens" />
            </div>

            <div className="campo">
              <label htmlFor="workload">Carga horária</label>
              <input {...register("workload")} type="text" placeholder="Ex.: 120 horas" />
            </div>

            <div className="campo">
              <label htmlFor="minAge">Idade mínima</label>
              <input {...register("minAge")} type="text" placeholder="Ex.: 14 anos completos" />
            </div>

            <div className="campo">
              <label htmlFor="maxAge">Idade máxima</label>
              <input {...register("maxAge")} type="text" placeholder="Ex.: 17 anos" />
            </div>

            <div className="campo">
              <label htmlFor="minSchoolLevel">Escolaridade mínima</label>
              <input {...register("minSchoolLevel")} type="text" />
            </div>

            <div className="campo">
              <label htmlFor="contribution">Mensalidade</label>
              <input {...register("contribution")} type="text" placeholder="Ex.: R$ 40,00" />
            </div>

            <div className="campo">
              <label htmlFor="installmentsCount">Número de parcelas</label>
              <input {...register("installmentsCount")} type="number" min="0" placeholder="Ex.: 12" />
            </div>

            <div className="campo">
              <label htmlFor="installmentValue">Valor da parcela (R$)</label>
              <input {...register("installmentValue")} type="number" min="0" step="0.01" placeholder="Ex.: 160.00" />
            </div>

            <div className="campo">
              <label htmlFor="minBirthDate">Data de nascimento mínima permitida</label>
              <input {...register("maxBirtDate")} type="date" />
            </div>

            <div className="campo">
              <label htmlFor="maxBirthDate">Data de nascimento máxima permitida</label>
              <input {...register("minBirthDate")} type="date" />
            </div>

            <div className="campo">
              <label htmlFor="apresentationVideoUrl">Vídeo de apresentação (URL)</label>
              <input {...register("apresentationVideoUrl")} type="text" placeholder="Link do YouTube" />
            </div>

            <input type="hidden" {...register("image")} />

            <div className="campo checkbox">
              <input {...register("isActive")} type="checkbox" id="isActive" />
              <label htmlFor="isActive">Curso ativo (visível para candidatos)</label>
            </div>
          </div>

          <p className="aviso">
            ⚠️ Os rótulos acima já corrigem uma inversão de nomes existente na API — ver <code>specs/modeling.md</code>:
            o campo <code>maxBirtDate</code> guarda a data mínima e <code>minBirthDate</code> guarda a data máxima permitida.
          </p>

          <CapaCurso
            cursoId={editando ? id : null}
            imagem={watch("image")}
            onAlterado={(novaImagem) => setValue("image", novaImagem, { shouldDirty: true })}
          />

          <div className="campo largo">
            <label htmlFor="description">Descrição (aceita HTML)</label>
            <textarea {...register("description")} rows={5} />
          </div>

          <div className="campo largo">
            <label htmlFor="jobMarket">Mercado de trabalho (aceita HTML, opcional)</label>
            <textarea {...register("jobMarket")} rows={4} />
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao">
              <h3>E-mail de confirmação de inscrição</h3>
            </div>
            <p className="aviso">
              Usados no e-mail automático enviado quando o pagamento da taxa de inscrição é confirmado
              (um texto por curso, já que matrícula e início das aulas variam entre eles).
            </p>

            <div className="campo largo">
              <label htmlFor="enrollmentPeriodDescription">Período de matrícula (aceita HTML)</label>
              <textarea
                {...register("enrollmentPeriodDescription")}
                rows={2}
                placeholder="Ex.: entre 07 a 11/12/2026, de segunda a sexta-feira"
              />
            </div>

            <div className="campo largo">
              <label htmlFor="classesStartDescription">Reunião de pais e início das aulas (aceita HTML)</label>
              <textarea
                {...register("classesStartDescription")}
                rows={3}
                placeholder="Ex.: Reunião de Pais: 16/01/2027 (sábado)... Início das aulas: 26/01/2027 (terça-feira)."
              />
            </div>
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao">
              <h3>Períodos/horários disponíveis</h3>
              <button type="button" className="btn-fantasma" onClick={() => periodos.append({ code: "", name: "", entryTime: "", exitTime: "", isActive: true })}>
                + Adicionar período
              </button>
            </div>

            {periodos.fields.length === 0 && <p className="aviso">Nenhum período cadastrado ainda.</p>}

            {periodos.fields.map((campo, index) => (
              <div className="linha-repetivel" key={campo.id}>
                <div className="campo">
                  <label>Código</label>
                  <input {...register(`availablePeriods.${index}.code`, { required: true })} type="number" />
                </div>
                <div className="campo">
                  <label>Nome</label>
                  <input {...register(`availablePeriods.${index}.name`, { required: true })} type="text" placeholder="Ex.: Manhã" />
                </div>
                <div className="campo">
                  <label>Entrada</label>
                  <input {...register(`availablePeriods.${index}.entryTime`)} type="text" placeholder="08:00" />
                </div>
                <div className="campo">
                  <label>Saída</label>
                  <input {...register(`availablePeriods.${index}.exitTime`)} type="text" placeholder="17:30" />
                </div>
                <div className="campo checkbox">
                  <input {...register(`availablePeriods.${index}.isActive`)} type="checkbox" id={`periodo-ativo-${index}`} />
                  <label htmlFor={`periodo-ativo-${index}`}>Ativo</label>
                </div>
                <button type="button" className="admin-btn-perigo" onClick={() => periodos.remove(index)}>Remover</button>
              </div>
            ))}
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao">
              <h3>Disciplinas</h3>
              <button type="button" className="btn-fantasma" onClick={() => disciplinas.append({ code: "", name: "" })}>
                + Adicionar disciplina
              </button>
            </div>

            {disciplinas.fields.length === 0 && <p className="aviso">Nenhuma disciplina cadastrada ainda.</p>}

            {disciplinas.fields.map((campo, index) => (
              <div className="linha-repetivel disciplina" key={campo.id}>
                <div className="campo">
                  <label>Código</label>
                  <input {...register(`subjects.${index}.code`, { required: true })} type="number" />
                </div>
                <div className="campo">
                  <label>Nome</label>
                  <input {...register(`subjects.${index}.name`, { required: true })} type="text" />
                </div>
                <button type="button" className="admin-btn-perigo" onClick={() => disciplinas.remove(index)}>Remover</button>
              </div>
            ))}
          </div>

          <div className="rodape-form">
            <Link to="/admin/cursos" className="btn-fantasma">Cancelar</Link>
            <button disabled={isSubmitting} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar curso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
