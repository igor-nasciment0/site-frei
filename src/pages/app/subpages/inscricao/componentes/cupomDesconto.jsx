import { useEffect, useState } from 'react';
import { get, set } from 'local-storage';
import toast from 'react-hot-toast';
import callApi from '../../../../../api/callAPI';
import { aplicaCupom, getCupomAplicado, removeCupom } from '../../../../../api/services/user';

const TIPO_PERCENTUAL = 1; // enum CouponDiscountType da API (2 = valor fixo)

/**
 * Seção "Cupom de desconto" da etapa 8 (linhas de uma `tabela-form`). O cupom não faz parte do
 * `PUT /users/profile`: é validado e aplicado na hora pelo backend (`POST /users/coupon`) e fica
 * gravado no usuário — por isso o estado daqui é próprio, fora do react-hook-form. O desconto
 * só vira valor na cobrança da taxa, na tela de Acompanhamento.
 */
export default function CupomDesconto({ somenteLeitura = false }) {
  const [codigo, setCodigo] = useState("");
  const [aplicado, setAplicado] = useState(null);   // resultado válido do cupom em vigor
  const [recusa, setRecusa] = useState("");         // motivo da última recusa
  const [ocupado, setOcupado] = useState(false);

  // Recarrega o cupom já aplicado (a API revalida: ele pode ter vencido ou sido desativado).
  useEffect(() => {
    const codigoSalvo = get('user')?.coupon?.code;
    if (!codigoSalvo) return;

    let ativo = true;
    setCodigo(codigoSalvo);

    (async () => {
      const r = await callApi(getCupomAplicado, false);
      if (!ativo || !r?.code) return;

      if (r.valid) setAplicado(r);
      else setRecusa(`O cupom ${r.code} não está mais valendo: ${r.message}`);
    })();

    return () => { ativo = false; };
  }, []);

  function gravaCupomLocal(cupom) {
    const usuario = get('user');
    if (usuario) set('user', { ...usuario, coupon: cupom });
  }

  async function aplicar() {
    if (!codigo.trim()) {
      setRecusa("Informe o código do cupom.");
      return;
    }

    setOcupado(true);
    // Com toast: o único erro HTTP esperado aqui é "pagamento já confirmado" (400).
    const r = await callApi(aplicaCupom, true, codigo);
    setOcupado(false);
    if (!r || r.valid === undefined) return;

    if (r.valid) {
      setAplicado(r);
      setRecusa("");
      setCodigo(r.code);
      gravaCupomLocal({ code: r.code });
      toast.success("Cupom aplicado!");
    } else {
      // Cupom recusado não troca o que estava aplicado — a API não altera nada.
      setRecusa(r.message);
    }
  }

  async function remover() {
    setOcupado(true);
    const r = await callApi(removeCupom, true);
    setOcupado(false);
    if (r === undefined) return;

    setAplicado(null);
    setRecusa("");
    setCodigo("");
    gravaCupomLocal(null);
    toast("Cupom removido.");
  }

  // Havia cupom gravado, mas ele deixou de valer: ainda dá para tirá-lo do cadastro.
  const temCupomGravado = !!aplicado || !!get('user')?.coupon?.code;

  return (
    <>
      <tr className="group-label"><td colSpan={2}>Cupom de desconto</td></tr>
      <tr className="texto-secao">
        <td colSpan={2}>
          Tem um cupom de desconto para a taxa de inscrição? Informe o código e clique em Aplicar.
          {' '}<strong>O cupom vale apenas para quem nunca foi aluno do Instituto.</strong> O preenchimento é opcional.
        </td>
      </tr>
      <tr>
        <td className="label">Código do cupom</td>
        <td className="input">
          <div className="campo-cupom">
            <input
              type="text"
              name="cupom"
              placeholder="Informe o código do cupom"
              autoComplete="off"
              value={codigo}
              disabled={somenteLeitura || ocupado || !!aplicado}
              onChange={e => { setCodigo(e.target.value.toUpperCase()); setRecusa(""); }}
              onKeyDown={e => {
                // Enter aqui aplicaria o cupom, não enviaria o formulário inteiro.
                if (e.key === 'Enter') { e.preventDefault(); aplicar(); }
              }}
            />
            {!aplicado &&
              <button type="button" className="btn-cupom" disabled={somenteLeitura || ocupado} onClick={aplicar}>
                {ocupado ? "Validando…" : "Aplicar"}
              </button>
            }
            {temCupomGravado &&
              <button type="button" className="btn-cupom remover" disabled={somenteLeitura || ocupado} onClick={remover}>
                Remover cupom
              </button>
            }
          </div>

          {aplicado &&
            <div className="cupom-resultado valido" role="status">
              <p>
                <strong>Cupom {aplicado.code} aplicado</strong> — desconto de{' '}
                {aplicado.discountType === TIPO_PERCENTUAL
                  ? `${formatarNumero(aplicado.discountValue)}% (${formatarMoeda(aplicado.discountAmount)})`
                  : formatarMoeda(aplicado.discountAmount)}.
              </p>
              <p>
                Taxa de inscrição: <s>{formatarMoeda(aplicado.originalFee)}</s>{' '}
                <strong>{formatarMoeda(aplicado.finalFee)}</strong>
                {aplicado.finalFee <= 0 && " — você não precisará fazer o pagamento."}
              </p>
            </div>
          }

          {recusa && <div className="cupom-resultado recusado" role="alert"><p>{recusa}</p></div>}
        </td>
      </tr>
    </>
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumero(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
