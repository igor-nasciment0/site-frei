import { PAGAMENTO_LABEL, STATUS_LABEL } from "./util";

// Situação de uma inscrição nos relatórios: status da inscrição + situação do pagamento.
export default function Situacao({ status, pagamento }) {
  if (!status)
    return <span className="sem-dado">Sem inscrição</span>;

  return (
    <span className="situacao">
      <span className={"admin-badge status-" + status.toLowerCase()}>{STATUS_LABEL[status] || status}</span>
      {pagamento &&
        <span className={"admin-badge pagamento-" + pagamento.toLowerCase()}>{PAGAMENTO_LABEL[pagamento] || pagamento}</span>
      }
    </span>
  );
}
