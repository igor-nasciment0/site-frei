import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import callApi from "../../../../api/callAPI";
import {
  getInscricao,
  resetarSenha,
  resetarPagamento,
  inserirPagamentoManual,
  removerInscricao,
  getOpcoesPrimeiraOpcaoAdmin,
  getOpcoesSegundaOpcaoAdmin,
  atualizarEscolhasCurso,
} from "../../../../api/services/admin/inscricoes";
import { listarCursos } from "../../../../api/services/admin/cursos";
import { converterDataUTCParaLocalSemMudarDia } from "../../../../util/date";
import Carregamento from "../../../../components/carregamento";
import { Select, SelectItem } from "../../../../components/select";
import DadosCandidato, { Info } from "../../componentes/dadosCandidato";
import "./index.scss";

// Mesmos valores do enum SecondChoiceRequirement da API (ver formCursos.jsx, do candidato).
const SEGUNDA_OBRIGATORIA = 1;
const SEGUNDA_OPCIONAL = 2;

const STATUS_LABEL = { Open: "Aberta", Validated: "Validada", Canceled: "Cancelada" };

const PAYMENT_STATUS_LABEL = {
  Pending: "Pendente",
  Paid: "Pago",
  Expired: "Expirado",
  Failed: "Falhou",
  Canceled: "Cancelado",
};

export default function AdminInscricaoDetalhes() {
  const { id } = useParams();
  const [inscricao, setInscricao] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { carregar(); }, [id]);

  async function carregar() {
    const r = await callApi(getInscricao, true, id);

    if (!r) {
      navigate("/admin/login");
      return;
    }

    setInscricao(r);
  }

  if (!inscricao) return <Carregamento />;

  const student = inscricao.student || {};

  return (
    <div className="admin-inscricao-detalhes">
      <div className="cabecalho-pagina">
        <div>
          <p className="eyebrow">Painel administrativo</p>
          <h1>Protocolo {inscricao.protocol}</h1>
        </div>
        <Link to="/admin/inscricoes" className="btn-fantasma">← Voltar para a lista</Link>
      </div>

      <div className="secao-inscricao">
        <h2>Inscrição</h2>
        <div className="grade-info">
          <Info rotulo="Status" valor={<span className={"admin-badge status-" + inscricao.status?.toLowerCase()}>{STATUS_LABEL[inscricao.status] || inscricao.status}</span>} />
          <Info rotulo="Inscrito em" valor={converterDataUTCParaLocalSemMudarDia(inscricao.createdAt)} />
          <Info rotulo="Última atualização" valor={converterDataUTCParaLocalSemMudarDia(inscricao.modifiedAt)} />
          <Info rotulo="Sala da prova" valor={inscricao.testRoom || "—"} />
          <Info rotulo="Horário da prova" valor={inscricao.testTime || "—"} />
        </div>

        <EscolhasCurso inscricao={inscricao} aoAtualizar={carregar} />
      </div>

      <Pagamento inscricao={inscricao} aoAtualizar={carregar} />

      <ResetarSenha inscricaoId={inscricao.id} nomeCandidato={student.name} />

      <DadosCandidato candidato={student} />

      <RemoverInscricao inscricaoId={inscricao.id} protocolo={inscricao.protocol} nomeCandidato={student.name} />
    </div>
  );
}

// Zona de perigo: apaga o documento da inscrição do banco (curso, status, dados de prova e
// todos os campos de pagamento embutidos nela — não há coleção separada de pagamento por
// inscrição). Irreversível. A conta do candidato (User) não é afetada — ele pode se inscrever
// de novo do zero, se a edição ainda permitir.
function RemoverInscricao({ inscricaoId, protocolo, nomeCandidato }) {
  const navigate = useNavigate();
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    const confirmado = confirm(
      `Remover definitivamente a inscrição de "${nomeCandidato}" (protocolo ${protocolo})?\n\n` +
      "Isso apaga o registro desta inscrição e todas as informações de pagamento associadas a ela. " +
      "Não pode ser desfeito. A conta do candidato continua existindo — ele pode se inscrever de novo, se a edição ainda permitir."
    );
    if (!confirmado) return;

    setRemovendo(true);
    const r = await callApi(removerInscricao, true, inscricaoId);
    setRemovendo(false);

    if (r?.success) {
      toast.success("Inscrição removida.");
      navigate("/admin/inscricoes");
    }
  }

  return (
    <div className="secao-inscricao secao-perigo">
      <h2>Remover inscrição</h2>
      <p className="aviso">
        Apaga definitivamente o registro desta inscrição e todas as informações de pagamento associadas a ela. Ação irreversível — a conta do candidato não é afetada.
      </p>
      <button type="button" className="admin-btn-perigo" disabled={removendo} onClick={remover}>
        {removendo ? "Removendo…" : "Remover inscrição"}
      </button>
    </div>
  );
}

// Ação de resetar a senha do candidato dono da inscrição. Se o campo de nova
// senha for deixado em branco, o backend gera uma senha aleatória — nesse
// caso ela só existe nesta resposta, então é exibida (uma única vez) para o
// admin copiar e repassar ao candidato.
function ResetarSenha({ inscricaoId, nomeCandidato }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaGerada, setSenhaGerada] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function resetar() {
    if (!confirm(`Resetar a senha de "${nomeCandidato}"? A senha atual deixará de funcionar imediatamente.`)) return;

    setEnviando(true);
    const r = await callApi(resetarSenha, true, inscricaoId, novaSenha || undefined);
    setEnviando(false);

    if (r?.success) {
      setSenhaGerada(r.newPassword);
      setNovaSenha("");
      toast.success("Senha resetada com sucesso!");
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(senhaGerada);
    toast.success("Senha copiada!");
  }

  return (
    <div className="secao-inscricao secao-reset-senha">
      <h2>Resetar senha do candidato</h2>
      <p className="aviso">
        Deixe o campo em branco para gerar uma senha aleatória, ou defina uma senha específica para repassar ao candidato.
      </p>

      <div className="linha-reset">
        <input
          type="text"
          placeholder="Nova senha (opcional)"
          value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)}
        />
        <button className="btn-primario" disabled={enviando} onClick={resetar}>
          {enviando ? "Resetando…" : "Resetar senha"}
        </button>
      </div>

      {senhaGerada &&
        <div className="senha-gerada">
          <span>Nova senha: <strong>{senhaGerada}</strong></span>
          <button className="btn-fantasma" onClick={copiar}>Copiar</button>
        </div>
      }
    </div>
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataHora(dataStringUTC) {
  return dataStringUTC ? new Date(dataStringUTC).toLocaleString("pt-BR") : "—";
}

// Mostra os campos de pagamento (PIX) da inscrição e permite duas ações administrativas
// que só afetam o pagamento, nunca a inscrição em si: remover a cobrança vigente (o
// candidato recebe uma nova, com QR code novo, ao reabrir o Acompanhamento) e registrar um
// pagamento recebido fora do PIX, sem precisar gerar QR code.
const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "Outro"];

function Pagamento({ inscricao, aoAtualizar }) {
  const [resetando, setResetando] = useState(false);
  const [valorManual, setValorManual] = useState("");
  const [dataManual, setDataManual] = useState("");
  const [formaManual, setFormaManual] = useState("");
  const [enviandoManual, setEnviandoManual] = useState(false);

  async function resetar() {
    if (!confirm("Remover as informações de pagamento desta inscrição? Uma cobrança PIX nova (com QR code novo) será gerada na próxima vez que o candidato abrir o Acompanhamento."))
      return;

    setResetando(true);
    const r = await callApi(resetarPagamento, true, inscricao.id);
    setResetando(false);

    if (r) {
      toast.success("Informações de pagamento removidas.");
      aoAtualizar();
    }
  }

  async function inserirManual() {
    if (!formaManual) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }

    if (!confirm("Marcar esta inscrição como paga manualmente?")) return;

    setEnviandoManual(true);
    const r = await callApi(inserirPagamentoManual, true, inscricao.id, {
      valor: valorManual ? Number(valorManual) : undefined,
      pagoEm: dataManual ? new Date(dataManual).toISOString() : undefined,
      forma: formaManual,
    });
    setEnviandoManual(false);

    if (r) {
      toast.success("Pagamento registrado manualmente.");
      setValorManual("");
      setDataManual("");
      setFormaManual("");
      aoAtualizar();
    }
  }

  const status = inscricao.paymentStatus;

  return (
    <div className="secao-inscricao secao-pagamento">
      <h2>Pagamento</h2>

      <div className="grade-info">
        <Info
          rotulo="Status"
          valor={<span className={"admin-badge status-" + (status || "").toLowerCase()}>{PAYMENT_STATUS_LABEL[status] || status}</span>}
        />
        <Info rotulo="Valor" valor={formatarMoeda(inscricao.paymentAmount)} />
        <Info rotulo="Pago em" valor={formatarDataHora(inscricao.paymentPaidAt)} />
        {status === "Paid" && <Info rotulo="Forma de pagamento" valor={inscricao.paymentMethod || "QR Code"} />}
        <Info rotulo="Cobrança vence em" valor={formatarDataHora(inscricao.paymentExpiresAt)} />
        <Info rotulo="Correlation ID (PIX)" valor={inscricao.paymentCorrelationId || "—"} />
      </div>

      {inscricao.paymentCopyPasteCode &&
        <div className="campo-copia-cola">
          <span className="rotulo">Código PIX copia-e-cola</span>
          <code>{inscricao.paymentCopyPasteCode}</code>
        </div>
      }

      <div className="acoes-pagamento">
        <div className="bloco-acao">
          <p className="aviso">
            Remove a cobrança atual; o candidato recebe uma cobrança nova (com QR code novo) ao reabrir o Acompanhamento.
          </p>
          <button type="button" className="admin-btn-perigo" disabled={resetando} onClick={resetar}>
            {resetando ? "Removendo…" : "Remover informações de pagamento"}
          </button>
        </div>

        <div className="bloco-acao">
          <p className="aviso">
            Marca a inscrição como paga sem gerar QR code — use para pagamentos recebidos fora do PIX.
          </p>
          <div className="linha-pagamento-manual">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor (opcional)"
              value={valorManual}
              onChange={e => setValorManual(e.target.value)}
            />
            <select value={formaManual} onChange={e => setFormaManual(e.target.value)} aria-label="Forma de pagamento">
              <option value="">Forma de pagamento</option>
              {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input
              type="datetime-local"
              value={dataManual}
              onChange={e => setDataManual(e.target.value)}
            />
            <button type="button" className="btn-primario" disabled={enviandoManual} onClick={inserirManual}>
              {enviandoManual ? "Registrando…" : "Inserir pagamento manual"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ex.: "Manhã - 08:00h às 09:00h". Sem horários cadastrados, mostra só o nome. Mesma regra do
// formCursos.jsx (candidato).
function rotuloHorario(horario) {
  if (!horario.entryTime || !horario.exitTime)
    return horario.name;

  return `${horario.name} - ${horario.entryTime}h às ${horario.exitTime}h`;
}

// Mostra a 1ª/2ª opção de curso e período da inscrição e, sob demanda, permite à secretaria
// trocá-las. Roda no backend exatamente as mesmas validações do formulário do candidato (matriz
// de compatibilidade, idade, RG, mensalidades em aberto, cadastro completo) — a diferença é que
// aqui funciona mesmo com a inscrição já validada ou paga, travas que só bloqueiam o candidato
// (ver AdminUpdateEnrollmentChoicesCommandHandler).
function EscolhasCurso({ inscricao, aoAtualizar }) {
  const [editando, setEditando] = useState(false);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [cursos, setCursos] = useState([]);
  // Cursos/períodos que o candidato consegue usar como 1ª opção (matriz + nascimento +
  // escolaridade). null = não carregado (ou falhou) — aí a lista não é filtrada.
  const [opcoesPrimeira, setOpcoesPrimeira] = useState(null);
  // O que a 1ª opção escolhida permite como 2ª, segundo a matriz — já filtrado pelo perfil do
  // candidato. null = ainda não consultado.
  const [regraSegunda, setRegraSegunda] = useState(null);

  const [codigoPrimeiroCurso, setCodigoPrimeiroCurso] = useState("");
  const [codigoPrimeiroHorario, setCodigoPrimeiroHorario] = useState("");
  const [codigoSegundoCurso, setCodigoSegundoCurso] = useState("");
  const [codigoSegundoHorario, setCodigoSegundoHorario] = useState("");
  const [erro, setErro] = useState("");

  async function iniciarEdicao() {
    setCodigoPrimeiroCurso(inscricao.firstChoice ? String(inscricao.firstChoice.courseCode) : "");
    setCodigoPrimeiroHorario(inscricao.firstChoice ? String(inscricao.firstChoice.periodCode) : "");
    setCodigoSegundoCurso(inscricao.secondChoice ? String(inscricao.secondChoice.courseCode) : "");
    setCodigoSegundoHorario(inscricao.secondChoice ? String(inscricao.secondChoice.periodCode) : "");
    setRegraSegunda(null);
    setErro("");
    setEditando(true);

    setCarregandoOpcoes(true);
    const [listaCursos, primeira] = await Promise.all([
      callApi(listarCursos, true),
      callApi(getOpcoesPrimeiraOpcaoAdmin, false, inscricao.id),
    ]);
    setCursos(listaCursos || []);
    setOpcoesPrimeira(Array.isArray(primeira) ? primeira : null);
    setCarregandoOpcoes(false);
  }

  function cancelarEdicao() {
    setEditando(false);
    setErro("");
  }

  // A cada 1ª opção (curso + período), busca o que ela permite como 2ª.
  useEffect(() => {
    if (!editando || !codigoPrimeiroCurso || !codigoPrimeiroHorario) {
      setRegraSegunda(null);
      return;
    }

    let cancelado = false;
    setRegraSegunda(null);

    (async () => {
      const r = await callApi(getOpcoesSegundaOpcaoAdmin, false, inscricao.id, codigoPrimeiroCurso, codigoPrimeiroHorario);
      if (!cancelado) setRegraSegunda(r || null);
    })();

    return () => { cancelado = true; };
  }, [editando, codigoPrimeiroCurso, codigoPrimeiroHorario]);

  // A 1ª/2ª opção já salva continua na lista mesmo que o perfil do candidato tenha deixado de
  // atender os critérios atuais — senão o campo apareceria vazio para uma escolha já feita.
  const salvaPrimeira = inscricao.firstChoice;
  const periodosPrimeira = codigo => {
    const permitidos = opcoesPrimeira?.find(o => o.courseCode == codigo)?.periodCodes ?? [];
    if (salvaPrimeira?.courseCode == codigo && !permitidos.includes(salvaPrimeira.periodCode))
      return [...permitidos, salvaPrimeira.periodCode];
    return permitidos;
  };
  const cursosPrimeiraOpcao = opcoesPrimeira ? cursos.filter(c => periodosPrimeira(c.code).length > 0) : cursos;
  const primeiraOpcaoCurso = cursos.find(c => c.code == codigoPrimeiroCurso);
  const horariosPrimeiraOpcao = opcoesPrimeira
    ? (primeiraOpcaoCurso?.availablePeriods || []).filter(h => periodosPrimeira(codigoPrimeiroCurso).includes(h.code))
    : (primeiraOpcaoCurso?.availablePeriods || []);

  const opcaoDoCurso = codigo => regraSegunda?.options?.find(o => o.courseCode == codigo);
  const cursosSegundaOpcao = regraSegunda ? cursos.filter(c => opcaoDoCurso(c.code)) : [];
  const aceitaSegunda = cursosSegundaOpcao.length > 0;
  const segundaObrigatoria = regraSegunda?.secondChoiceRequirement === SEGUNDA_OBRIGATORIA;
  const segundaOpcional = regraSegunda?.secondChoiceRequirement === SEGUNDA_OPCIONAL;
  const segundaOpcaoCurso = cursos.find(c => c.code == codigoSegundoCurso);
  const periodosPermitidos = opcaoDoCurso(codigoSegundoCurso)?.periodCodes ?? [];
  const horariosSegundaOpcao = (segundaOpcaoCurso?.availablePeriods || []).filter(h => periodosPermitidos.includes(h.code));

  let placeholderSegunda = "Selecione um curso...";
  if (!codigoPrimeiroCurso) placeholderSegunda = "Escolha a primeira opção antes";
  else if (!codigoPrimeiroHorario) placeholderSegunda = "Escolha o período da primeira opção antes";
  else if (!regraSegunda) placeholderSegunda = "Carregando...";
  else if (!aceitaSegunda) placeholderSegunda = "Sem segunda opção para este curso";
  else if (segundaOpcional) placeholderSegunda = "Sem segunda opção";

  function handleMudaPrimeiraOpcaoCurso(novaOpcao) {
    setCodigoPrimeiroCurso(novaOpcao);
    setCodigoPrimeiroHorario("");
    if (erro) setErro("");
  }

  function handleMudaSegundaOpcaoCurso(novaOpcao) {
    setCodigoSegundoCurso(novaOpcao);
    setCodigoSegundoHorario("");
    if (erro) setErro("");
  }

  function handleMudaHorario1(novaOpcao) {
    if (codigoPrimeiroCurso == codigoSegundoCurso && codigoSegundoHorario == novaOpcao) {
      setCodigoSegundoCurso("");
      setCodigoSegundoHorario("");
      setErro("Opções de curso e período não podem ser iguais.");
    }
    setCodigoPrimeiroHorario(novaOpcao);
  }

  function handleMudaHorario2(novaOpcao) {
    if (codigoPrimeiroCurso == codigoSegundoCurso && codigoPrimeiroHorario == novaOpcao) {
      setCodigoPrimeiroCurso("");
      setCodigoPrimeiroHorario("");
      setErro("Opções de curso e período não podem ser iguais.");
    }
    setCodigoSegundoHorario(novaOpcao);
  }

  async function salvar() {
    if (!codigoPrimeiroCurso || !codigoPrimeiroHorario) {
      toast.error("Selecione a primeira opção de curso e período.");
      return;
    }

    setSalvando(true);
    const r = await callApi(atualizarEscolhasCurso, true, inscricao.id, {
      firstChoiceCourseCode: Number(codigoPrimeiroCurso),
      firstChoicePeriodCode: Number(codigoPrimeiroHorario),
      secondChoiceCourseCode: codigoSegundoCurso ? Number(codigoSegundoCurso) : 0,
      secondChoicePeriodCode: codigoSegundoHorario ? Number(codigoSegundoHorario) : 0,
    });
    setSalvando(false);

    if (r) {
      toast.success("Opções de curso atualizadas.");
      setEditando(false);
      aoAtualizar();
    }
  }

  if (!editando) {
    return (
      <div className="grade-info bloco-escolhas-curso">
        <Info rotulo="1ª opção" valor={inscricao.firstChoice ? `${inscricao.firstChoice.courseName} — ${inscricao.firstChoice.periodName}` : "—"} />
        <Info rotulo="2ª opção" valor={inscricao.secondChoice ? `${inscricao.secondChoice.courseName} — ${inscricao.secondChoice.periodName}` : "—"} />
        <button type="button" className="btn-fantasma" onClick={iniciarEdicao}>Editar opções de curso</button>
      </div>
    );
  }

  return (
    <div className="bloco-escolhas-curso editando">
      <p className="aviso">
        Roda as mesmas validações do formulário de inscrição (matriz de compatibilidade, idade, RG,
        mensalidades em aberto, cadastro completo). Diferente do candidato, aqui a troca funciona
        mesmo com a inscrição já validada ou com o pagamento confirmado.
      </p>

      {erro && <p className="cursos-erro">{erro}</p>}

      <div className="grade">
        <div className="campo">
          <label>Primeira opção de curso</label>
          <Select
            disabled={carregandoOpcoes}
            placeholder="Selecione um curso..."
            value={codigoPrimeiroCurso}
            onChange={handleMudaPrimeiraOpcaoCurso}>
            {cursosPrimeiraOpcao.map((curso, index) =>
              <SelectItem key={'po' + index} value={String(curso.code)}>{curso.name}</SelectItem>
            )}
          </Select>
        </div>

        <div className="campo">
          <label>Período da primeira opção</label>
          <Select
            disabled={!primeiraOpcaoCurso || carregandoOpcoes}
            placeholder="Selecione um horário..."
            value={codigoPrimeiroHorario}
            onChange={handleMudaHorario1}>
            {horariosPrimeiraOpcao.map((horario, index) =>
              <SelectItem key={'ph' + index} value={String(horario.code)}>{rotuloHorario(horario)}</SelectItem>
            )}
          </Select>
        </div>

        <div className="campo">
          <label>{segundaObrigatoria ? "Segunda opção de curso *" : "Segunda opção de curso"}</label>
          <Select
            placeholder={placeholderSegunda}
            disabled={carregandoOpcoes || !aceitaSegunda}
            value={codigoSegundoCurso}
            onChange={handleMudaSegundaOpcaoCurso}>
            {segundaOpcional && <SelectItem value="">Sem segunda opção</SelectItem>}
            {cursosSegundaOpcao.map((curso, index) =>
              <SelectItem key={'so' + index} value={String(curso.code)}>
                {curso.code == codigoPrimeiroCurso ? `${curso.name} (outro período)` : curso.name}
              </SelectItem>
            )}
          </Select>
        </div>

        <div className="campo">
          <label>{segundaObrigatoria ? "Período da segunda opção *" : "Período da segunda opção"}</label>
          <Select
            disabled={!segundaOpcaoCurso || carregandoOpcoes}
            placeholder="Selecione um horário..."
            value={codigoSegundoHorario}
            onChange={handleMudaHorario2}>
            {horariosSegundaOpcao.map((horario, index) =>
              <SelectItem key={'sh' + index} value={String(horario.code)}>{rotuloHorario(horario)}</SelectItem>
            )}
          </Select>
        </div>
      </div>

      <div className="acoes-escolhas-curso">
        <button type="button" className="btn-fantasma" disabled={salvando} onClick={cancelarEdicao}>Cancelar</button>
        <button type="button" className="btn-primario" disabled={salvando || carregandoOpcoes} onClick={salvar}>
          {salvando ? "Salvando…" : "Salvar opções de curso"}
        </button>
      </div>
    </div>
  );
}
