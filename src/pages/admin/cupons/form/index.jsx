import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { useLoadingBar } from "react-top-loading-bar";
import callApi from "../../../../api/callAPI";
import { criarCupom, atualizarCupom, getCupom } from "../../../../api/services/admin/cupons";
import { formatarParaInputDate } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import padroesCupom from "./padroes";
import "./index.scss";

const TIPO_PERCENTUAL = "1"; // enum CouponDiscountType da API (2 = valor fixo) — string no <select>

// Inputs <type="date"> trabalham em "AAAA-MM-DD"; a API usa data-time UTC.
function paraISODataSimples(valorInputDate) {
  return valorInputDate ? valorInputDate + "T00:00:00.000Z" : null;
}

export default function AdminCupomForm() {
  const { id } = useParams();
  const editando = !!id;

  const [carregando, setCarregando] = useState(editando);
  const [usos, setUsos] = useState(0);
  const navigate = useNavigate();
  const { start, complete } = useLoadingBar({ color: "#C2A46A", height: 3 });

  const { register, handleSubmit, reset, watch, getValues, formState: { errors, isSubmitting } } = useForm({
    defaultValues: padroesCupom,
  });

  const percentual = watch("discountType") === TIPO_PERCENTUAL;

  useEffect(() => {
    if (!editando) return;

    (async () => {
      const cupom = await callApi(getCupom, true, id);

      if (!cupom) {
        navigate("/admin/cupons");
        return;
      }

      setUsos(cupom.usedCount || 0);
      reset({
        ...padroesCupom,
        ...cupom,
        discountType: String(cupom.discountType),
        validFrom: cupom.validFrom ? formatarParaInputDate(cupom.validFrom) : "",
        validUntil: cupom.validUntil ? formatarParaInputDate(cupom.validUntil) : "",
        maxUses: cupom.maxUses ?? "",
      });
      setCarregando(false);
    })();
  }, [id]);

  async function submit(dados) {
    const payload = {
      code: dados.code,
      description: dados.description?.trim() || "",
      discountType: Number(dados.discountType),
      discountValue: Number(dados.discountValue),
      validFrom: paraISODataSimples(dados.validFrom),
      validUntil: paraISODataSimples(dados.validUntil),
      maxUses: dados.maxUses === "" || dados.maxUses == null ? null : Number(dados.maxUses),
      isActive: !!dados.isActive,
    };

    const r = editando
      ? await callApi(atualizarCupom, true, id, payload)
      : await callApi(criarCupom, true, payload);

    if (r?.id) {
      start("continuous", 0, 100);
      toast.success(editando ? "Cupom atualizado!" : "Cupom criado!");
      setTimeout(complete, 750);
      setTimeout(() => navigate("/admin/cupons"), 1000);
    }
  }

  if (carregando)
    return <Carregamento />

  return (
    <div className="admin-form-page">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>{editando ? "Editar cupom" : "Novo cupom"}</h1>
      </div>

      <div className="admin-form-card">
        <form onSubmit={handleSubmit(submit)}>
          <div className="grade">
            <div className={"campo " + (errors.code ? "erro" : "")}>
              <label htmlFor="code">Código</label>
              <input
                {...register("code", {
                  required: "Campo obrigatório",
                  maxLength: { value: 40, message: "Use no máximo 40 caracteres" },
                })}
                type="text"
                placeholder="ex.: BEMVINDO10"
                disabled={editando && usos > 0}
              />
              {errors.code && <span className="mensagem-erro">{errors.code.message}</span>}
              <span className="ajuda">
                {editando && usos > 0
                  ? "O código não pode ser alterado depois que o cupom já foi usado."
                  : "É gravado em maiúsculas e sem espaços; o candidato pode digitar de qualquer jeito."}
              </span>
            </div>

            <div className="campo">
              <label htmlFor="description">Descrição</label>
              <input {...register("description")} type="text" placeholder="Para que serve este cupom" />
            </div>

            <div className="campo">
              <label htmlFor="discountType">Tipo de desconto</label>
              <select {...register("discountType")} id="discountType">
                <option value="1">Percentual (%)</option>
                <option value="2">Valor fixo (R$)</option>
              </select>
            </div>

            <div className={"campo " + (errors.discountValue ? "erro" : "")}>
              <label htmlFor="discountValue">{percentual ? "Desconto (%)" : "Desconto (R$)"}</label>
              <input
                {...register("discountValue", {
                  required: "Campo obrigatório",
                  validate: valor => {
                    const n = Number(valor);
                    if (!(n > 0)) return "Informe um valor maior que zero";
                    if (getValues("discountType") === TIPO_PERCENTUAL && n > 100) return "O percentual vai até 100";
                    return true;
                  },
                })}
                type="number"
                step="0.01"
                min="0.01"
                placeholder={percentual ? "10" : "20,00"}
              />
              {errors.discountValue && <span className="mensagem-erro">{errors.discountValue.message}</span>}
              <span className="ajuda">
                {percentual
                  ? "Percentual sobre a taxa de inscrição da edição. 100% dispensa o pagamento."
                  : "Em reais. Valor igual ou maior que a taxa dispensa o pagamento."}
              </span>
            </div>

            <div className="campo">
              <label htmlFor="validFrom">Válido a partir de (opcional)</label>
              <input {...register("validFrom")} type="date" />
            </div>

            <div className={"campo " + (errors.validUntil ? "erro" : "")}>
              <label htmlFor="validUntil">Válido até (opcional)</label>
              <input
                {...register("validUntil", {
                  validate: valor => !valor || !getValues("validFrom") || valor >= getValues("validFrom")
                    || "A data final não pode ser anterior à inicial",
                })}
                type="date"
              />
              {errors.validUntil && <span className="mensagem-erro">{errors.validUntil.message}</span>}
            </div>

            <div className={"campo " + (errors.maxUses ? "erro" : "")}>
              <label htmlFor="maxUses">Limite de usos (opcional)</label>
              <input
                {...register("maxUses", {
                  validate: valor => valor === "" || valor == null || (Number.isInteger(Number(valor)) && Number(valor) > 0)
                    || "Informe um número inteiro maior que zero",
                })}
                type="number"
                step="1"
                min="1"
                placeholder="Sem limite"
              />
              {errors.maxUses && <span className="mensagem-erro">{errors.maxUses.message}</span>}
              <span className="ajuda">
                Conta uma vez por inscrição, quando a cobrança com desconto é emitida.
                {editando && ` Usos até agora: ${usos}.`}
              </span>
            </div>

            <div className="campo checkbox">
              <input {...register("isActive")} type="checkbox" id="isActive" />
              <label htmlFor="isActive">Cupom ativo</label>
            </div>
          </div>

          <div className="rodape-form">
            <Link to="/admin/cupons" className="btn-fantasma">Cancelar</Link>
            <button disabled={isSubmitting} className="btn-primario" type="submit">
              {editando ? "Salvar alterações" : "Criar cupom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
