import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { useLoadingBar } from "react-top-loading-bar";
import callApi from "../../../../api/callAPI";
import { criarEdicao, atualizarEdicao, getEdicao, ativarEdicao } from "../../../../api/services/admin/vestibular";
import { formatarParaInputDate } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import padroesEdicao from "./padroes";
import "./index.scss";

// Inputs <type="date"> trabalham em "AAAA-MM-DD"; a API usa data-time UTC.
function paraISODataSimples(valorInputDate) {
  return valorInputDate ? valorInputDate + "T00:00:00.000Z" : null;
}

const CAMPOS_DATA = ["startDate", "endDate", "extensionDate", "resultPublicationDate",
  "resultPublicationDateExternal", "roomNoticeEmailDate", "testDate"];

export default function AdminVestibularForm() {
  const { id } = useParams();
  const editando = !!id;

  const [carregando, setCarregando] = useState(editando);
  const [edicaoAtual, setEdicaoAtual] = useState(null);
  const navigate = useNavigate();
  const { start, complete } = useLoadingBar({ color: "#C2A46A", height: 3 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: padroesEdicao,
  });

  const testers = useFieldArray({ control, name: "testerEmails" });

  useEffect(() => {
    if (!editando) return;

    (async () => {
      const edicao = await callApi(getEdicao, true, id);

      if (!edicao) {
        navigate("/admin/vestibular");
        return;
      }

      const camposConvertidos = Object.fromEntries(CAMPOS_DATA.map(campo => [campo, formatarParaInputDate(edicao[campo])]));
      setEdicaoAtual(edicao);
      reset({
        ...padroesEdicao, ...edicao, ...camposConvertidos,
        // Edições criadas antes destes campos vêm com 0: mostra vazio para o admin preencher.
        year: edicao.year || "",
        enrollmentFee: edicao.enrollmentFee || "",
        // useFieldArray exige itens objeto — a API trabalha com string[] puro.
        testerEmails: (edicao.testerEmails || []).map(email => ({ email })),
      });
      setCarregando(false);
    })();
  }, [id]);

  async function submit(dados) {
    const payload = { ...dados };
    CAMPOS_DATA.forEach(campo => { payload[campo] = paraISODataSimples(dados[campo]); });
    payload.year = Number(dados.year);
    payload.enrollmentFee = Number(dados.enrollmentFee);
    payload.testerEmails = (dados.testerEmails || [])
      .map(t => t.email?.trim())
      .filter(Boolean);

    if (editando) {
      // nextEnrollmentNumber não é editável via PUT (só no POST de criação).
      delete payload.nextEnrollmentNumber;
    } else {
      payload.nextEnrollmentNumber = Number(dados.nextEnrollmentNumber) || 1001;
    }

    const r = editando
      ? await callApi(atualizarEdicao, true, id, payload)
      : await callApi(criarEdicao, true, payload);

    if (r?.id) {
      start("continuous", 0, 100);
      toast.success(editando ? "Edição atualizada!" : "Edição criada! Ative-a quando estiver pronta.");
      setTimeout(complete, 750);
      setTimeout(() => navigate("/admin/vestibular"), 1000);
    }
  }

  async function ativar() {
    if (!confirm("Tornar esta a edição ativa do vestibular? As demais serão desativadas.")) return;

    const r = await callApi(ativarEdicao, true, id);
    if (r?.id) {
      toast.success("Edição ativada!");
      setEdicaoAtual(r);
    }
  }

  if (carregando)
    return <Carregamento />

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>{editando ? "Editar edição do vestibular" : "Nova edição do vestibular"}</h1>
      </div>

      {editando &&
        <div className="faixa-status">
          <span className={"admin-badge " + (edicaoAtual?.isActive ? "ativo" : "inativo")}>
            {edicaoAtual?.isActive ? "Edição ativa" : "Edição inativa"}
          </span>
          {!edicaoAtual?.isActive &&
            <button type="button" className="btn-fantasma" onClick={ativar}>Tornar esta a edição ativa</button>
          }
        </div>
      }

      <div className="admin-form-card">
        <form onSubmit={handleSubmit(submit)}>
          <div className="grade">
            <div className={"campo " + (errors.year ? "erro" : "")}>
              <label htmlFor="year">Ano da edição</label>
              <input
                {...register("year", {
                  required: "Campo obrigatório",
                  min: { value: 2000, message: "Informe um ano válido" },
                  max: { value: 2100, message: "Informe um ano válido" },
                })}
                type="number"
                placeholder="2027"
              />
              {errors.year && <span className="mensagem-erro">{errors.year.message}</span>}
              <span className="ajuda">Compõe o código da cobrança PIX: insfvest_ + ano + protocolo.</span>
            </div>

            <div className={"campo " + (errors.enrollmentFee ? "erro" : "")}>
              <label htmlFor="enrollmentFee">Taxa de inscrição (R$)</label>
              <input
                {...register("enrollmentFee", {
                  required: "Campo obrigatório",
                  min: { value: 0.01, message: "Informe um valor maior que zero" },
                })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="40,00"
              />
              {errors.enrollmentFee && <span className="mensagem-erro">{errors.enrollmentFee.message}</span>}
              <span className="ajuda">Vale para as cobranças emitidas daqui em diante.</span>
            </div>

            <div className={"campo " + (errors.startDate ? "erro" : "")}>
              <label htmlFor="startDate">Início das inscrições</label>
              <input {...register("startDate", { required: "Campo obrigatório" })} type="date" />
              {errors.startDate && <span className="mensagem-erro">{errors.startDate.message}</span>}
            </div>

            <div className={"campo " + (errors.endDate ? "erro" : "")}>
              <label htmlFor="endDate">Fim das inscrições</label>
              <input {...register("endDate", { required: "Campo obrigatório" })} type="date" />
              {errors.endDate && <span className="mensagem-erro">{errors.endDate.message}</span>}
            </div>

            <div className="campo">
              <label htmlFor="extensionDate">Prorrogação (opcional)</label>
              <input {...register("extensionDate")} type="date" />
            </div>

            <div className="campo">
              <label htmlFor="testDate">Data da prova</label>
              <input {...register("testDate")} type="date" />
            </div>

            <div className="campo">
              <label htmlFor="resultPublicationDate">Divulgação do resultado</label>
              <input {...register("resultPublicationDate")} type="date" />
              <span className="ajuda">Data padrão, usada para a maioria dos candidatos.</span>
            </div>

            <div className="campo">
              <label htmlFor="resultPublicationDateExternal">Resultado — externo em curso de continuidade</label>
              <input {...register("resultPublicationDateExternal")} type="date" />
              <span className="ajuda">
                Vale para quem escolheu Inglês Avançado, Intermediário, Pré-Intermediário Noturno ou
                Teens II <strong>sem</strong> já ser aluno do curso anterior. Em branco, usa a data padrão.
              </span>
            </div>

            <div className="campo">
              <label htmlFor="roomNoticeEmailDate">E-mail com horário e sala</label>
              <input {...register("roomNoticeEmailDate")} type="date" />
              <span className="ajuda">Data informada ao candidato no acompanhamento.</span>
            </div>

            <div className="campo">
              <label htmlFor="resultUrl">Link do resultado</label>
              <input {...register("resultUrl")} type="text" />
            </div>

            <div className="campo">
              <label htmlFor="presentationVideoUrl">Vídeo de apresentação (URL)</label>
              <input {...register("presentationVideoUrl")} type="text" />
            </div>

            {!editando &&
              <div className="campo">
                <label htmlFor="nextEnrollmentNumber">Início do contador de protocolo</label>
                <input {...register("nextEnrollmentNumber")} type="number" min={1} />
              </div>
            }

            <div className="campo checkbox">
              <input {...register("allowRegistration")} type="checkbox" id="allowRegistration" />
              <label htmlFor="allowRegistration">Permitir novas inscrições nesta edição</label>
            </div>
          </div>

          <div className="divisor" />

          <div className="subsecao">
            <div className="titulo-subsecao">
              <h3>E-mails de teste</h3>
              <button type="button" className="btn-fantasma" onClick={() => testers.append({ email: "" })}>
                + Adicionar e-mail
              </button>
            </div>

            <p className="aviso">
              Esses e-mails podem logar e usar o sistema normalmente mesmo com "Permitir novas
              inscrições" desligado — para testar o fluxo antes da abertura oficial.
            </p>

            {testers.fields.length === 0 && <p className="aviso">Nenhum e-mail de teste cadastrado ainda.</p>}

            {testers.fields.map((campo, index) => (
              <div className="linha-repetivel linha-testers" key={campo.id}>
                <div className="campo">
                  <label>E-mail</label>
                  <input
                    {...register(`testerEmails.${index}.email`, { required: true })}
                    type="email"
                    placeholder="pessoa@email.com"
                  />
                </div>
                <button type="button" className="admin-btn-perigo" onClick={() => testers.remove(index)}>Remover</button>
              </div>
            ))}
          </div>

          <div className="divisor" />

          <div className="campo largo">
            <label htmlFor="description">Descrição/instruções (aceita HTML)</label>
            <textarea {...register("description")} rows={5} />
          </div>

          <div className="rodape-form">
            <Link to="/admin/vestibular" className="btn-fantasma">Cancelar</Link>
            <button disabled={isSubmitting} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar edição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
