import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import callApi from "../../../api/callAPI";
import { listarCupons, desativarCupom } from "../../../api/services/admin/cupons";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import Carregamento from "../../../components/carregamento";
import "./index.scss";

const TIPO_PERCENTUAL = 1; // enum CouponDiscountType da API (2 = valor fixo)

export default function AdminCupons() {
  const [cupons, setCupons] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const r = await callApi(listarCupons, true);

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setCupons(r);
  }

  async function excluir(cupom) {
    if (!confirm(`Desativar o cupom "${cupom.code}"? Quem já tem cobrança emitida com ele não é afetado; novas cobranças saem pelo valor cheio.`)) return;

    const r = await callApi(desativarCupom, true, cupom.id);
    if (r !== undefined) carregar();
  }

  return (
    <div className="admin-lista">
      <div className="cabecalho-pagina">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Cupons de desconto</h1>
        <Link to="/admin/cupons/novo" className="btn-primario">Novo cupom</Link>
      </div>

      <p className="aviso">
        Desconto na taxa de inscrição, informado pelo candidato na última etapa do formulário. Vale
        apenas para quem nunca foi aluno do Instituto e só aparece para o candidato quando a edição
        do vestibular está com &quot;Permite cupom&quot; ligado.
      </p>

      {!cupons && <Carregamento />}

      {cupons &&
        <table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Desconto</th>
              <th>Validade</th>
              <th>Usos</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cupons.length === 0 &&
              <tr className="vazio"><td colSpan={7}>Nenhum cupom cadastrado ainda.</td></tr>
            }

            {cupons.map(cupom => (
              <tr key={cupom.id}>
                <td><strong>{cupom.code}</strong></td>
                <td>{cupom.description || "—"}</td>
                <td>{formatarDesconto(cupom)}</td>
                <td>{formatarValidade(cupom)}</td>
                <td>{cupom.usedCount}{cupom.maxUses != null ? ` de ${cupom.maxUses}` : ""}</td>
                <td>
                  <span className={"admin-badge " + (cupom.isActive ? "ativo" : "inativo")}>
                    {cupom.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="acoes">
                  <Link to={`/admin/cupons/${cupom.id}`}>Editar</Link>
                  {cupom.isActive && <button onClick={() => excluir(cupom)}>Desativar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}

function formatarDesconto(cupom) {
  return cupom.discountType === TIPO_PERCENTUAL
    ? `${Number(cupom.discountValue).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
    : Number(cupom.discountValue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarValidade(cupom) {
  const de = cupom.validFrom ? converterDataUTCParaLocalSemMudarDia(cupom.validFrom) : null;
  const ate = cupom.validUntil ? converterDataUTCParaLocalSemMudarDia(cupom.validUntil) : null;

  if (de && ate) return `${de} a ${ate}`;
  if (de) return `A partir de ${de}`;
  if (ate) return `Até ${ate}`;
  return "Sem prazo";
}
