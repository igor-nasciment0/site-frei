import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { useLoadingBar } from "react-top-loading-bar";
import callApi from "../../../../api/callAPI";
import { criarFAQ, atualizarFAQ, getFAQ } from "../../../../api/services/admin/faq";
import Carregamento from "../../../../components/carregamento";
import padroesFAQ from "./padroes";
import "./index.scss";

export default function AdminFAQForm() {
  const { id } = useParams();
  const editando = !!id;

  const [carregando, setCarregando] = useState(editando);
  const navigate = useNavigate();
  const { start, complete } = useLoadingBar({ color: "#C2A46A", height: 3 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: padroesFAQ,
  });

  useEffect(() => {
    if (!editando) return;

    (async () => {
      const faq = await callApi(getFAQ, true, id);

      if (!faq) {
        navigate("/admin/faq");
        return;
      }

      reset({ ...padroesFAQ, ...faq });
      setCarregando(false);
    })();
  }, [id]);

  async function submit(dados) {
    const payload = {
      ...dados,
      order: Number(dados.order) || 0,
      key: dados.key?.trim() || null,
    };

    const r = editando
      ? await callApi(atualizarFAQ, true, id, payload)
      : await callApi(criarFAQ, true, payload);

    if (r?.id) {
      start("continuous", 0, 100);
      toast.success(editando ? "Pergunta atualizada!" : "Pergunta criada!");
      setTimeout(complete, 750);
      setTimeout(() => navigate("/admin/faq"), 1000);
    }
  }

  if (carregando)
    return <Carregamento />

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>{editando ? "Editar pergunta" : "Nova pergunta"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={handleSubmit(submit)}>
          <div className="campo largo">
            <label htmlFor="question">Pergunta</label>
            <input {...register("question", { required: "Campo obrigatório" })} type="text" />
            {errors.question && <span className="mensagem-erro">{errors.question.message}</span>}
          </div>

          <div className="campo largo">
            <label htmlFor="key">Identificador para link direto (opcional)</label>
            <input
              {...register("key", {
                pattern: {
                  value: /^[a-z0-9-]*$/,
                  message: "Use apenas letras minúsculas, números e hífen",
                },
              })}
              type="text"
              placeholder="ex.: edital-bolsa"
            />
            <span className="ajuda">
              Permite abrir esta pergunta por link (<code>/faq?q=identificador</code>). O quadro
              &quot;Informações gerais&quot; da tela inicial usa: <code>edital-bolsa</code>,{" "}
              <code>uso-uniforme</code>, <code>material-didatico</code> e <code>resultado-prova</code>.
            </span>
            {errors.key && <span className="mensagem-erro">{errors.key.message}</span>}
          </div>

          <div className="campo largo">
            <label htmlFor="answer">Resposta (aceita HTML)</label>
            <textarea {...register("answer", { required: "Campo obrigatório" })} rows={6} />
            {errors.answer && <span className="mensagem-erro">{errors.answer.message}</span>}
          </div>

          <div className="grade">
            <div className="campo">
              <label htmlFor="order">Ordem de exibição</label>
              <input {...register("order")} type="number" />
            </div>

            <div className="campo checkbox">
              <input {...register("isActive")} type="checkbox" id="isActive" />
              <label htmlFor="isActive">Pergunta ativa (visível no FAQ e na Home)</label>
            </div>
          </div>

          <div className="rodape-form">
            <Link to="/admin/faq" className="btn-fantasma">Cancelar</Link>
            <button disabled={isSubmitting} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar pergunta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
