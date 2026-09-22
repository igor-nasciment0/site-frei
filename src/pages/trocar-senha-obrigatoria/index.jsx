import { get, remove, set } from "local-storage";
import callApi from "../../api/callAPI";
import { trocaSenhaLogado } from "../../api/services/user";
import "./index.scss";

import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import ToasterContainer from "../../components/toaster_container";
import PainelInstitucional from "../../components/painel_institucional";
import toast from "react-hot-toast";

// Aberta automaticamente quando o candidato loga com uma senha que o admin resetou
// (user.mustChangePassword) — ver pages/app/index.jsx e pages/login/index.jsx.
export default function TrocarSenhaObrigatoria() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const navigate = useNavigate();

  useEffect(() => {
    if (!get("token")) navigate("/login");
  }, [navigate]);

  function sair() {
    remove("token");
    remove("user");
    navigate("/login");
  }

  async function submit(dados) {
    if (dados.newPassword !== dados.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    const r = await callApi(trocaSenhaLogado, true, {
      currentPassword: dados.currentPassword,
      newPassword: dados.newPassword,
    });

    if (!r?.success) {
      toast.error(
        r?.message || "Não foi possível alterar a senha. Tente novamente mais tarde."
      );
      return;
    }

    // Limpa a flag localmente para não ficar preso na tela se o usuário voltar por aqui.
    const usuario = get("user");
    if (usuario) set("user", { ...usuario, mustChangePassword: false });

    toast.success("Senha alterada com sucesso!");
    setTimeout(() => navigate("/"), 1500);
  }

  return (
    <div className="auth-page">
      <ToasterContainer />

      <PainelInstitucional />

      <div className="painel-form">
        <div className="card">
          <div>
            <p className="eyebrow">Área do candidato</p>
            <h2>Defina uma nova senha</h2>
            <p className="intro">
              Sua senha foi redefinida pela nossa equipe. Por segurança, crie uma nova senha
              antes de continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit(submit)}>
            <div className={"campo " + (errors.currentPassword ? "erro" : "")}>
              <label htmlFor="currentPassword">Senha atual (a que você acabou de usar para entrar)</label>
              <input
                {...register("currentPassword", { required: "Campo obrigatório" })}
                type="password"
              />
              {errors.currentPassword && <span className="mensagem-erro">{errors.currentPassword.message}</span>}
            </div>

            <div className={"campo " + (errors.newPassword ? "erro" : "")}>
              <label htmlFor="newPassword">Nova senha</label>
              <input
                {...register("newPassword", { required: "Campo obrigatório" })}
                type="password"
              />
              {errors.newPassword && <span className="mensagem-erro">{errors.newPassword.message}</span>}
            </div>

            <div className={"campo " + (errors.confirmPassword ? "erro" : "")}>
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input
                {...register("confirmPassword", { required: "Campo obrigatório" })}
                type="password"
              />
              {errors.confirmPassword && <span className="mensagem-erro">{errors.confirmPassword.message}</span>}
            </div>

            <button disabled={isSubmitting} className="btn-primario" type="submit">Salvar nova senha</button>

            <p className="link-secundario">
              <button type="button" onClick={sair}>Sair da conta</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
