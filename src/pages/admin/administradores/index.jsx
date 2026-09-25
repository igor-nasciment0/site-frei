import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import callApi from "../../../api/callAPI";
import { criarAdmin, listarAdmins, resetarSenhaAdmin } from "../../../api/services/admin/auth";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

const PERFIL_LABEL = { Admin: "Admin", Financeiro: "Financeiro" };

export default function AdminUsuarios() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { username: "", email: "", name: "", password: "", role: "Admin" },
  });

  const [admins, setAdmins] = useState(null);
  const [resetando, setResetando] = useState(null); // id do admin com reset em andamento
  const [senhaGerada, setSenhaGerada] = useState(null); // { nome, senha }

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(listarAdmins, true);
    if (r) setAdmins(r);
  }

  async function submit(dados) {
    const r = await callApi(criarAdmin, true, dados);

    if (r?.id) {
      toast.success(`Administrador "${r.name}" criado com sucesso!`);
      reset();
      carregar();
    }
  }

  async function resetar(admin) {
    if (!confirm(`Resetar a senha de "${admin.name}"? A senha atual deixa de funcionar e uma nova será exigida no próximo login.`)) return;

    setResetando(admin.id);
    const r = await callApi(resetarSenhaAdmin, true, admin.id);
    setResetando(null);

    if (r?.success) {
      setSenhaGerada({ nome: admin.name, senha: r.newPassword });
      toast.success("Senha resetada com sucesso!");
      carregar();
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(senhaGerada.senha);
    toast.success("Senha copiada!");
  }

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Administradores</h1>
      </div>

      <p className="aviso">
        Veja quem tem acesso ao painel, resete senhas e conceda acesso a novas pessoas.
        Após um reset, a pessoa precisa definir uma nova senha no próximo login.
      </p>

      {senhaGerada &&
        <div className="senha-gerada">
          <span>Nova senha de {senhaGerada.nome}: <strong>{senhaGerada.senha}</strong> — exibida só desta vez, repasse à pessoa.</span>
          <button type="button" className="btn-fantasma" onClick={copiar}>Copiar</button>
        </div>
      }

      {!admins && <Carregamento />}

      {admins &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Situação</th>
              <th>Último acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 &&
              <tr className="vazio"><td colSpan={6}>Nenhum administrador cadastrado.</td></tr>
            }

            {admins.map(a => (
              <tr key={a.id}>
                <td>
                  <span className="nome">{a.name}</span>
                  <span className="email">{a.email}</span>
                </td>
                <td>{a.username}</td>
                <td>{PERFIL_LABEL[a.role] || a.role}</td>
                <td>
                  <span className={"admin-badge " + (a.isActive ? "ativo" : "inativo")}>{a.isActive ? "Ativo" : "Inativo"}</span>
                  {a.mustChangePassword && <span className="admin-badge pendente">Troca de senha pendente</span>}
                </td>
                <td>{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("pt-BR") : "—"}</td>
                <td className="acoes">
                  <button type="button" disabled={resetando === a.id} onClick={() => resetar(a)}>
                    {resetando === a.id ? "Resetando…" : "Resetar senha"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }

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
