import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import { criarAdmin } from "../../../api/services/admin/auth";
import "./index.scss";

// A API (specs/openapi.yaml) só expõe POST /api/admin/users — não existe
// endpoint de listagem de administradores, então esta tela é só o formulário
// de criação (sem tabela). O próprio administrador logado confirma a
// criação lendo a resposta do POST.
export default function AdminUsuarios() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { username: "", email: "", name: "", password: "", role: "Admin" },
  });

  async function submit(dados) {
    const r = await callApi(criarAdmin, true, dados);

    if (r?.id) {
      toast.success(`Administrador "${r.name}" criado com sucesso!`);
      reset();
    }
  }

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Administradores</h1>
      </div>

      <p className="aviso">
        Conceda acesso ao painel para uma nova pessoa. A API atual não expõe uma lista de administradores existentes —
        apenas a criação de novos.
      </p>

      <div className="admin-form-card">
        <form onSubmit={handleSubmit(submit)}>
          <div className="grade">
            <div className={"campo " + (errors.name ? "erro" : "")}>
              <label htmlFor="name">Nome completo</label>
              <input {...register("name", { required: "Campo obrigatório" })} type="text" />
              {errors.name && <span className="mensagem-erro">{errors.name.message}</span>}
            </div>

            <div className={"campo " + (errors.username ? "erro" : "")}>
              <label htmlFor="username">Usuário</label>
              <input
                {...register("username", {
                  required: "Campo obrigatório",
                  minLength: { value: 3, message: "Mínimo de 3 caracteres" },
                })}
                type="text"
              />
              {errors.username && <span className="mensagem-erro">{errors.username.message}</span>}
            </div>

            <div className={"campo " + (errors.email ? "erro" : "")}>
              <label htmlFor="email">E-mail</label>
              <input {...register("email", { required: "Campo obrigatório" })} type="email" />
              {errors.email && <span className="mensagem-erro">{errors.email.message}</span>}
            </div>

            <div className="campo">
              <label htmlFor="role">Perfil</label>
              <select {...register("role")} id="role">
                <option value="Admin">Admin — acesso total</option>
                <option value="Financeiro">Financeiro — somente relatório financeiro</option>
              </select>
            </div>

            <div className={"campo " + (errors.password ? "erro" : "")}>
              <label htmlFor="password">Senha inicial</label>
              <input
                {...register("password", {
                  required: "Campo obrigatório",
                  minLength: { value: 8, message: "Mínimo de 8 caracteres" },
                })}
                type="password"
              />
              {errors.password && <span className="mensagem-erro">{errors.password.message}</span>}
            </div>
          </div>

          <div className="rodape-form">
            <button disabled={isSubmitting} className="btn-primario" type="submit">Criar administrador</button>
          </div>
        </form>
      </div>
    </div>
  );
}
