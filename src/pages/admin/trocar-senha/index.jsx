import { get, remove, set } from "local-storage";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import { trocarSenhaAdmin } from "../../../api/services/admin/auth";
import ToasterContainer from "../../../components/toaster_container";
import PainelInstitucional from "../../../components/painel_institucional";
import "./index.scss";

// Aberta automaticamente quando o administrador entra com uma senha resetada por outro
// admin (admin.mustChangePassword) — ver pages/admin/index.jsx.
export default function AdminTrocarSenha() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  useEffect(() => {
    if (!get("adminToken")) navigate("/admin/login");
  }, [navigate]);

  function sair() {
    remove("adminToken");
    remove("admin");
    navigate("/admin/login");
  }

  async function submit(dados) {
    if (dados.newPassword !== dados.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    const r = await callApi(trocarSenhaAdmin, true, {
      currentPassword: dados.currentPassword,
      newPassword: dados.newPassword,
    });

    if (!r?.success) return;

    const admin = get("admin");
    if (admin) set("admin", { ...admin, mustChangePassword: false });

    toast.success("Senha alterada com sucesso!");
    setTimeout(() => navigate("/admin"), 1200);
  }

  return (
    <div className="auth-page admin-auth-page">
      <ToasterContainer />

      <PainelInstitucional />

      <div className="painel-form">
        <div className="card">
          <div>
            <p className="eyebrow">Painel administrativo</p>
            <h2>Defina uma nova senha</h2>
            <p className="intro">
              Sua senha foi redefinida por outro administrador. Por segurança, crie uma nova senha antes de continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit(submit)}>
            <div className={"campo " + (errors.currentPassword ? "erro" : "")}>
              <label htmlFor="currentPassword">Senha atual (a que você acabou de usar para entrar)</label>
              <input {...register("currentPassword", { required: "Campo obrigatório" })} id="currentPassword" type="password" />
              {errors.currentPassword && <span className="mensagem-erro">{errors.currentPassword.message}</span>}
            </div>

            <div className={"campo " + (errors.newPassword ? "erro" : "")}>
              <label htmlFor="newPassword">Nova senha</label>
              <input
                {...register("newPassword", {
                  required: "Campo obrigatório",
                  minLength: { value: 8, message: "Mínimo de 8 caracteres" },
                })}
                id="newPassword"
                type="password"
              />
              {errors.newPassword && <span className="mensagem-erro">{errors.newPassword.message}</span>}
            </div>

            <div className={"campo " + (errors.confirmPassword ? "erro" : "")}>
              <label htmlFor="confirmPassword">Confirmar nova senha</label>
              <input {...register("confirmPassword", { required: "Campo obrigatório" })} id="confirmPassword" type="password" />
              {errors.confirmPassword && <span className="mensagem-erro">{errors.confirmPassword.message}</span>}
            </div>

            <button disabled={isSubmitting} className="btn-primario" type="submit">Salvar nova senha</button>

            <p className="link-secundario">
              <button type="button" onClick={sair}>Sair</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
