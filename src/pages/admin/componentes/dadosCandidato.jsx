import { useState } from "react";
import callApi from "../../../api/callAPI";
import { getDocumentoRGCandidato } from "../../../api/services/admin/inscricoes";
import { converterDataUTCParaLocalSemMudarDia } from "../../../util/date";
import "./dadosCandidato.scss";

// Dados da conta do candidato (coleção users), somente leitura. Usado no detalhe da inscrição
// e no modal da lista de contas.
export default function DadosCandidato({ candidato = {} }) {
  return (
    <>
      <div className="secao-inscricao">
        <h2>Dados pessoais</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={candidato.name} />
          <Info rotulo="E-mail" valor={candidato.email} />
          <Info rotulo="Telefone" valor={candidato.phone} />
          <Info rotulo="CPF" valor={candidato.cpf} />
          <Info rotulo="Gênero" valor={candidato.gender} />
          <Info rotulo="Idade" valor={candidato.age != null ? `${candidato.age} anos` : "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Endereço</h2>
        <div className="grade-info">
          <Info rotulo="CEP" valor={candidato.address?.cep} />
          <Info rotulo="Rua" valor={candidato.address?.street} />
          <Info rotulo="Número" valor={candidato.address?.number} />
          <Info rotulo="Complemento" valor={candidato.address?.complement || "—"} />
          <Info rotulo="Bairro" valor={candidato.address?.neighborhood} />
          <Info rotulo="Cidade" valor={candidato.address?.city} />
          <Info rotulo="Estado" valor={candidato.address?.state} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Nascimento</h2>
        <div className="grade-info">
          <Info rotulo="Data" valor={candidato.birthInfo?.date ? converterDataUTCParaLocalSemMudarDia(candidato.birthInfo.date) : "—"} />
          <Info rotulo="Cidade" valor={candidato.birthInfo?.city} />
          <Info rotulo="Estado" valor={candidato.birthInfo?.state} />
          <Info rotulo="País" valor={candidato.birthInfo?.country} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Documento (RG)</h2>
        <div className="grade-info">
          <Info rotulo="Número" valor={candidato.rgInfo?.number} />
          <Info rotulo="Data de emissão" valor={candidato.rgInfo?.issueDate ? converterDataUTCParaLocalSemMudarDia(candidato.rgInfo.issueDate) : "—"} />
          <Info rotulo="Órgão emissor" valor={candidato.rgInfo?.issuingAuthority} />
          <Info
            rotulo="Anexo"
            valor={candidato.rgInfo?.hasDocument
              ? converterDataUTCParaLocalSemMudarDia(candidato.rgInfo.documentUploadedAt)
              : "Não enviado"}
          />
        </div>

        {candidato.rgInfo?.hasDocument && <AnexoRGCandidato userId={candidato.id} />}
      </div>

      <div className="secao-inscricao">
        <h2>Responsável primário</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={candidato.primaryResponsible?.name} />
          <Info rotulo="Parentesco" valor={candidato.primaryResponsible?.relationship} />
          <Info rotulo="E-mail" valor={candidato.primaryResponsible?.email} />
          <Info rotulo="Telefone" valor={candidato.primaryResponsible?.phone} />
          <Info rotulo="Telefone secundário" valor={candidato.primaryResponsible?.phoneSecondary || "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Responsável secundário</h2>
        <div className="grade-info">
          <Info rotulo="Nome" valor={candidato.secondaryResponsible?.name} />
          <Info rotulo="Parentesco" valor={candidato.secondaryResponsible?.relationship} />
          <Info rotulo="E-mail" valor={candidato.secondaryResponsible?.email} />
          <Info rotulo="Telefone" valor={candidato.secondaryResponsible?.phone} />
          <Info rotulo="Telefone secundário" valor={candidato.secondaryResponsible?.phoneSecondary || "—"} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Escolaridade</h2>
        <div className="grade-info">
          <Info rotulo="Escola atual" valor={candidato.schoolInfo?.currentSchool} />
          <Info rotulo="Série atual" valor={candidato.schoolInfo?.currentGrade} />
          <Info rotulo="Tipo de escola" valor={candidato.schoolInfo?.schoolType} />
        </div>
      </div>

      <div className="secao-inscricao">
        <h2>Informações gerais</h2>
        <div className="grade-info">
          <Info rotulo="Como conheceu o instituto" valor={candidato.generalInfo?.howDidYouKnow} />
          <Info rotulo="Renda mensal familiar" valor={candidato.generalInfo?.income != null ? formatarMoeda(candidato.generalInfo.income) : "—"} />
          <Info rotulo="Pessoas em casa" valor={candidato.generalInfo?.peopleAtHome} />
          <Info rotulo="Pessoas trabalhando" valor={candidato.generalInfo?.peopleWorking} />
        </div>
      </div>
    </>
  );
}

function AnexoRGCandidato({ userId }) {
  const [abrindo, setAbrindo] = useState(false);

  async function abrir() {
    setAbrindo(true);
    const blob = await callApi(getDocumentoRGCandidato, true, userId);
    setAbrindo(false);

    if (!blob) return;

    // A URL de objeto é revogada só depois que a aba teve tempo de carregar o arquivo.
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  return (
    <button type="button" className="btn-fantasma" disabled={abrindo} onClick={abrir}>
      {abrindo ? "Abrindo…" : "Ver anexo do RG"}
    </button>
  );
}

export function Info({ rotulo, valor }) {
  return (
    <div className="info">
      <span className="rotulo">{rotulo}</span>
      <span className="valor">{valor === "" || valor == null ? "—" : valor}</span>
    </div>
  );
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
