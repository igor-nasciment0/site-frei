import { Select, SelectItem } from '../../../../../components/select';
import { useEffect, useState } from 'react';
import { getCursoHorarios, getCursos } from '../../../../../api/services/cursos';
import callApi from '../../../../../api/callAPI';
import { criaInscricao, getInscricao, getOpcoesSegundaOpcao, validaEscolhasCurso } from '../../../../../api/services/inscricao';
import { temOpcoesDeCurso } from '../../../../../util/useMinhaInscricao';
import toast from 'react-hot-toast';
import { useLoadingBar } from 'react-top-loading-bar';
import { useNavigate } from 'react-router';

// Ex.: "Manhã - 08:00h às 09:00h". Sem horários cadastrados, mostra só o nome.
function rotuloHorario(horario) {
  if (!horario.entryTime || !horario.exitTime)
    return horario.name;

  return `${horario.name} - ${horario.entryTime}h às ${horario.exitTime}h`;
}

// Mesmos valores do enum SecondChoiceRequirement da API.
const SEGUNDA_OBRIGATORIA = 1;
const SEGUNDA_OPCIONAL = 2;

export default function FormularioCursos() {

  const [carregamentoInicial, setCarregamentoInicial] = useState(true);

  const [opcoesCanceladas, setOpcoesCanceladas] = useState(false);

  const [minhaInscricao, setMinhaInscricao] = useState(null);

  const [codigoPrimeiroCurso, setCodigoPrimeiroCurso] = useState("");
  const [codigoPrimeiroHorario, setCodigoPrimeiroHorario] = useState("");
  const [codigoSegundoCurso, setCodigoSegundoCurso] = useState("");
  const [codigoSegundoHorario, setCodigoSegundoHorario] = useState("");

  const [opcoesCurso, setOpcoesCurso] = useState([]);
  const [opcoesHorario1, setOpcoesHorario1] = useState([]);
  const [opcoesHorario2, setOpcoesHorario2] = useState([]);

  const [erro, setErro] = useState("");
  const [avisoCompatibilidade, setAvisoCompatibilidade] = useState("");

  // O que a 1ª opção escolhida (curso e período) permite na 2ª, segundo a matriz de
  // compatibilidade do admin — já filtrado pelo perfil do candidato. null = ainda não consultado.
  const [regraSegunda, setRegraSegunda] = useState(null);

  const primeiraOpcaoCurso = opcoesCurso?.find(opcao => opcao.code == codigoPrimeiroCurso);
  const segundaOpcaoCurso = opcoesCurso?.find(opcao => opcao.code == codigoSegundoCurso);

  // A API já devolve só cursos com algum período disponível (inclusive o próprio curso da 1ª
  // opção, em outro período, quando a diagonal libera).
  const opcaoDoCurso = codigo => regraSegunda?.options.find(o => o.courseCode == codigo);
  const cursosSegundaOpcao = regraSegunda
    ? opcoesCurso.filter(curso => opcaoDoCurso(curso.code))
    : [];
  const aceitaSegunda = cursosSegundaOpcao.length > 0;
  const segundaObrigatoria = regraSegunda?.secondChoiceRequirement === SEGUNDA_OBRIGATORIA;
  const segundaOpcional = regraSegunda?.secondChoiceRequirement === SEGUNDA_OPCIONAL;

  // Só os períodos que a matriz habilita para o período escolhido na 1ª opção.
  const periodosPermitidos = opcaoDoCurso(codigoSegundoCurso)?.periodCodes ?? [];
  const horariosSegundaOpcao = opcoesHorario2.filter(horario => periodosPermitidos.includes(horario.code));

  let placeholderSegunda = "Selecione um curso...";
  if (!codigoPrimeiroCurso) placeholderSegunda = "Escolha a primeira opção antes";
  else if (!codigoPrimeiroHorario) placeholderSegunda = "Escolha o período da primeira opção antes";
  else if (!regraSegunda) placeholderSegunda = "Carregando...";
  else if (!aceitaSegunda) placeholderSegunda = "Sem segunda opção para este curso";
  else if (segundaOpcional) placeholderSegunda = "Sem segunda opção";

  // A cada 1ª opção (curso + período), busca o que ela permite como 2ª.
  useEffect(() => {
    if (!codigoPrimeiroCurso || !codigoPrimeiroHorario) {
      setRegraSegunda(null);
      return;
    }

    let cancelado = false;
    setRegraSegunda(null);

    (async () => {
      const r = await callApi(getOpcoesSegundaOpcao, false, codigoPrimeiroCurso, codigoPrimeiroHorario);
      if (cancelado || !r) return;

      setRegraSegunda(r);
    })();

    return () => { cancelado = true; };
  }, [codigoPrimeiroCurso, codigoPrimeiroHorario]);

  // 2ª opção (ou só o período dela) que não entra na lista da nova 1ª é limpa — o backend
  // recusaria a combinação de qualquer jeito. Só reage à regra nova, não a cada troca da 2ª.
  useEffect(() => {
    if (!regraSegunda || !codigoSegundoCurso) return;

    const opcao = regraSegunda.options.find(o => o.courseCode == codigoSegundoCurso);
    if (!opcao) {
      setCodigoSegundoCurso("");
      setCodigoSegundoHorario("");
      setErro("Sua segunda opção foi removida porque não pode ser combinada com a primeira escolhida.");
      return;
    }

    if (codigoSegundoHorario && !opcao.periodCodes.includes(Number(codigoSegundoHorario))) {
      setCodigoSegundoHorario("");
      setErro("O período da sua segunda opção foi removido porque não pode ser combinado com a primeira escolhida.");
    }
  }, [regraSegunda]);

  // Aviso antecipado de incompatibilidade entre 1ª e 2ª opção (ou qualquer outro requisito da
  // inscrição) — roda no backend a mesma validação de POST /enrollments, com debounce, sem
  // persistir nada. Não substitui a validação real do submit, só evita que o candidato descubra
  // o problema só depois de clicar em "Concluir Inscrição".
  useEffect(() => {
    if (!codigoPrimeiroCurso || !codigoPrimeiroHorario) {
      setAvisoCompatibilidade("");
      return;
    }

    // 2ª opção só entra na checagem quando curso e horário dela já foram escolhidos —
    // enquanto só o curso está selecionado, ainda falta período pra ela fazer sentido.
    if (codigoSegundoCurso && !codigoSegundoHorario) {
      setAvisoCompatibilidade("");
      return;
    }

    let cancelado = false;

    const timer = setTimeout(async () => {
      const r = await callApi(validaEscolhasCurso, false, {
        firstChoiceCourseCode: codigoPrimeiroCurso,
        firstChoicePeriodCode: codigoPrimeiroHorario,
        secondChoiceCourseCode: codigoSegundoCurso,
        secondChoicePeriodCode: codigoSegundoHorario
      });

      if (!cancelado)
        setAvisoCompatibilidade(r && !r.compativel ? r.mensagem : "");
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [codigoPrimeiroCurso, codigoPrimeiroHorario, codigoSegundoCurso, codigoSegundoHorario]);

  // USE_EFFECTS PARA CARREGAR CURSOS E HORÁRIOS
  useEffect(() => {
    (async () => {
      const cursos = await callApi(getCursos);
      setOpcoesCurso(cursos);

      // 404 = ainda sem inscrição; o corpo do 404 não é uma inscrição.
      const respostaInscricao = await callApi(getInscricao);
      const insc = respostaInscricao?.status === 200 ? respostaInscricao.data : null;

      if (insc && !temOpcoesDeCurso(insc))
        setOpcoesCanceladas(true);

      if (temOpcoesDeCurso(insc)) {
        const idOpcao1 = cursos.find(curso => curso.code == insc.firstChoice.courseCode).id;
        const idOpcao2 = cursos.find(curso => curso.code == insc.secondChoice?.courseCode)?.id;

        const h1 = await callApi(getCursoHorarios, false, idOpcao1);

        setOpcoesHorario1(h1);

        if (idOpcao2) {
          const h2 = await callApi(getCursoHorarios, false, idOpcao2);
          setOpcoesHorario2(h2);
        }

        setMinhaInscricao(insc);
      }

      setCarregamentoInicial(false);
    })();
  }, [])

  useEffect(() => {
    if (minhaInscricao) {
      setCodigoPrimeiroCurso(String(minhaInscricao.firstChoice.courseCode));
      setCodigoPrimeiroHorario(String(minhaInscricao.firstChoice.periodCode));

      // Sem 2ª opção a API devolve código 0 — no formulário isso é "vazio".
      const segunda = minhaInscricao.secondChoice;
      setCodigoSegundoCurso(segunda?.courseCode ? String(segunda.courseCode) : "");
      setCodigoSegundoHorario(segunda?.courseCode ? String(segunda.periodCode) : "");
    }

  }, [minhaInscricao])

  async function handleMudaPrimeiraOpcaoCurso(novaOpcao) {
    setCodigoPrimeiroCurso(novaOpcao);
    setCodigoPrimeiroHorario("");

    const cursoId = (opcoesCurso?.find(opcao => opcao.code == novaOpcao))?.id;

    if (cursoId) {
      setOpcoesHorario1(await callApi(getCursoHorarios, false, cursoId));
    }

    if (erro)
      setErro("")
  }

  async function handleMudaSegundaOpcaoCurso(novaOpcao) {
    setCodigoSegundoCurso(novaOpcao);
    setCodigoSegundoHorario("");

    const cursoId = (opcoesCurso?.find(opcao => opcao.code == novaOpcao))?.id;

    if (cursoId) {
      setOpcoesHorario2(await callApi(getCursoHorarios, false, cursoId));
    }

    if (erro)
      setErro("")
  }

  function handleMudaHorario1(novaOpcao) {
    if (codigoPrimeiroCurso == codigoSegundoCurso && codigoSegundoHorario == novaOpcao) {
      setCodigoSegundoCurso("");
      setCodigoSegundoHorario("");
      setErro("Opções de curso e período não podem ser iguais.");
    }

    setCodigoPrimeiroHorario(novaOpcao);

    if (erro)
      setErro("")
  }

  function handleMudaHorario2(novaOpcao) {
    if (codigoPrimeiroCurso == codigoSegundoCurso && codigoPrimeiroHorario == novaOpcao) {
      setCodigoPrimeiroCurso("");
      setCodigoPrimeiroHorario("");
      setErro("Opções de curso e período não podem ser iguais.");
    }

    setCodigoSegundoHorario(novaOpcao);

    if (erro)
      setErro("")
  }

  const { start, complete } = useLoadingBar({
    color: "#C2A46A",
    height: 2,
  });

  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    if (!codigoPrimeiroCurso || !codigoPrimeiroHorario) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    // Se a 2ª opção é obrigatória depende da 1ª (matriz de compatibilidade) — quem recusa é o
    // backend, e o aviso antecipado (validate-choices) já mostra a mensagem antes do clique.

    setCarregando(true);

    const r = await callApi(criaInscricao, true, {
      firstChoiceCourseCode: codigoPrimeiroCurso,
      firstChoicePeriodCode: codigoPrimeiroHorario,
      secondChoiceCourseCode: codigoSegundoCurso,
      secondChoicePeriodCode: codigoSegundoHorario
    });

    if (r) {
      start("continuous", 0, 100);
      toast.success("Sucesso!");
      setTimeout(complete, 750);
      setTimeout(() => navigate("/acompanhamento"), 1000);
    }

    setCarregando(false);
  }

  return (
    <form>
      {/* Abre em nova aba de propósito: sair da página descartaria o wizard preenchido. */}
      <p className="ajuda-cursos">
        Ainda em dúvida sobre qual escolher?{' '}
        <a href="/cursos" target="_blank" rel="noopener noreferrer">Conheça os cursos disponíveis</a>.
      </p>

      <table className="tabela-form">
        <tbody>
          {opcoesCanceladas &&
            <tr className='cursos-erro'>
              <td />
              <td>Suas opções de curso foram canceladas porque os dados de nascimento ou de escolaridade foram alterados. Escolha os cursos novamente.</td>
            </tr>
          }
          {erro &&
            <tr className='cursos-erro'>
              <td />
              <td>{erro}</td>
            </tr>
          }
          <tr>
            <td className="label obrigatorio">Primeira Opção de Curso</td>
            <td className="input">

              <Select
                disabled={carregamentoInicial}
                placeholder="Selecione um curso..."
                value={codigoPrimeiroCurso}
                className={carregamentoInicial ? "carregando" : ""}
                onChange={novoValor => handleMudaPrimeiraOpcaoCurso(novoValor)}>

                {opcoesCurso.map((curso, index) =>
                  <SelectItem key={'po' + index} value={String(curso.code)}>
                    {curso.name}
                  </SelectItem>
                )}
              </Select>

            </td>
          </tr>
          <tr>
            <td className="label obrigatorio">Período Primeira Opção</td>
            <td className="input">

              <Select
                disabled={!primeiraOpcaoCurso || carregamentoInicial}
                placeholder="Selecione um horário..."
                value={codigoPrimeiroHorario}
                onChange={novoValor => handleMudaHorario1(novoValor)}>
                {opcoesHorario1.map((horario, index) =>
                  <SelectItem key={'ph' + index} value={String(horario.code)}>{rotuloHorario(horario)}</SelectItem>
                )}
              </Select>
            </td>
          </tr>
          <tr>
            <td className={"label" + (segundaObrigatoria ? " obrigatorio" : "")}>Segunda Opção de Curso</td>
            <td className="input">

              {/* Só os cursos que a matriz de compatibilidade libera para a 1ª opção escolhida. */}
              <Select
                placeholder={placeholderSegunda}
                disabled={carregamentoInicial || !aceitaSegunda}
                value={codigoSegundoCurso}
                onChange={novoValor => handleMudaSegundaOpcaoCurso(novoValor)}>
                {segundaOpcional && <SelectItem value="">Sem segunda opção</SelectItem>}
                {cursosSegundaOpcao.map((curso, index) =>
                  <SelectItem key={'so' + index} value={String(curso.code)}>
                    {curso.code == codigoPrimeiroCurso ? `${curso.name} (outro período)` : curso.name}
                  </SelectItem>
                )}
              </Select>
            </td>
          </tr>
          <tr>
            <td className={"label" + (segundaObrigatoria ? " obrigatorio" : "")}>Período Segunda Opção</td>
            <td className="input">
              <Select
                disabled={!segundaOpcaoCurso || carregamentoInicial}
                placeholder="Selecione um horário..."
                value={codigoSegundoHorario}
                onChange={novoValor => handleMudaHorario2(novoValor)}>
                {horariosSegundaOpcao.map((horario, index) =>
                  <SelectItem key={'sh' + index} value={String(horario.code)}>{rotuloHorario(horario)}</SelectItem>
                )}
              </Select>
            </td>
          </tr>
          {avisoCompatibilidade &&
            <tr className='cursos-erro'>
              <td />
              <td>{avisoCompatibilidade}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr className='submit'>
            <td>
              <button type='button' disabled={carregando || carregamentoInicial || !!avisoCompatibilidade} onClick={submit}>Concluir Inscrição</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </form>
  )
}
