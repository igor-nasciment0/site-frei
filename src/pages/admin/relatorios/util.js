import toast from "react-hot-toast";

// Compartilhado pelos relatórios de indicações e de cupons.

export const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };
export const PAGAMENTO_LABEL = { Pending: "Pendente", Paid: "Pago", Expired: "Vencido", Failed: "Recusado", Canceled: "Cancelado" };

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatarDataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// O CPF de quem indicou chega só com dígitos; o do candidato, como foi digitado.
export function formatarCpf(cpf) {
  const digitos = String(cpf || "").replace(/\D/g, "");
  if (digitos.length !== 11) return cpf || "";
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// colunas: [{ titulo, valor: linha => texto }]. Carregada só ao exportar: a biblioteca não
// pesa no bundle das demais telas.
export async function exportarExcel(colunas, linhas, nomeArquivo) {
  try {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");

    const cabecalho = colunas.map(c => ({ value: c.titulo, fontWeight: "bold" }));
    const corpo = linhas.map((l, i) => colunas.map(c => ({ type: String, value: String(c.valor(l, i) ?? "") })));

    await writeXlsxFile([cabecalho, ...corpo]).toFile(nomeArquivo);
  } catch {
    toast.error("Não foi possível gerar o arquivo Excel.");
  }
}

// AAAA-MM-DD no fuso local, para o nome do arquivo exportado.
export function dataDeHoje() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}
