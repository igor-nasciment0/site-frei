import { set } from "local-storage";
import callApi from "../../api/callAPI";
import { login } from "../../api/services/user";
import "./index.scss";

import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router";
import ToasterContainer from "../../components/toaster_container";
import PainelInstitucional from "../../components/painel_institucional";
import { generateFormData } from "../../util/form";
import { useLoadingBar } from "react-top-loading-bar";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const navigate = useNavigate();

  const { start, complete } = useLoadingBar({
    color: "#C2A46A",
    height: 3,
  });

  async function submit(loginData) {
    const r = await callApi(login, true, generateFormData(loginData));

    if (r?.token) {
      start("continuous", 0, 100);
      set("token", r.token);
      set("user", r.user);
      setTimeout(complete, 750);
      setTimeout(() => navigate("/"), 1000);
    }
  }

  return (
    <div className="auth-page">
      <ToasterContainer />

      <PainelInstitucional />

      <div className="painel-form">
        <div className="card">
          <div>
            <p className="eyebrow">Área do candidato</p>
            <h2>Acessar minha conta</h2>
          </div>

          <form onSubmit={handleSubmit(submit)}>
            <div className={"campo " + (errors.Email ? "erro" : "")}>
              <label htmlFor="email">E-mail</label>
              <input
                {...register("Email", { required: "Campo obrigatório" })}
                type="email"
                placeholder="usuario@email.com"
              />
              {errors.Email && <span className="mensagem-erro">{errors.Email.message}</span>}
            </div>

            <div className={"campo " + (errors.Password ? "erro" : "")}>
              <label htmlFor="password">Senha</label>
              <input
                {...register("Password", { required: "Campo obrigatório" })}
                type="password"
              />
              {errors.Password && <span className="mensagem-erro">{errors.Password.message}</span>}
            </div>

            <div className="esqueci-senha">
              <Link to="/recuperar-senha">Esqueci minha senha</Link>
            </div>

            <button disabled={isSubmitting} className="btn-primario" type="submit">Entrar</button>

            <p className="link-secundario">
              Não possui conta? <Link to="/cadastro">Criar cadastro</Link>
            </p>

            <div className="divisor" />

            <p className="nota">
              Dúvidas sobre o processo? Consulte nosso <Link to="/faq">FAQ</Link> ou ligue para (11) 96398-6252.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
