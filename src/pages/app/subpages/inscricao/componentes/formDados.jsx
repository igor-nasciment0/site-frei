import { Controller, useFormContext } from "react-hook-form";
import { IMaskInput } from 'react-imask';
import Input, { encontraErro } from "./input";
import { Select, SelectItem } from "../../../../../components/select";
import { comoConheceu, escolaridades, genero, parentesco, tipoEscola } from "../selects";
import { getEnderecoCompleto } from "../../../../../api/services/enderecos";
import { useCallback, useState } from "react";
import callApi from "../../../../../api/callAPI";
import AnexoRG from "./anexoRG";
import toast from "react-hot-toast";

export function FormularioDadosPessoais({ avancar }) {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Informações Pessoais</td></tr>
        <tr>
          <td className="label obrigatorio">Nome</td>
          <Input name="name" type="text" placeholder="Informe o nome" {...register("name", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Telefone</td>
          <Controller
            name="phone"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                as={IMaskInput}
                {...field}
                onAccept={(value) => field.onChange(value)}
                name="phone"
                placeholder="Informe o telefone"
                mask="+55 (00) 00000-0000"
                id="phone"
              />
            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">Gênero</td>
          <td className="input">
            <Controller
              name="gender"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Informe o gênero"
                    >
                      {genero.map(g =>
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr className="submit"><td>
          <button type="button" onClick={() => avancar(["name", "phone", "gender"])}>Salvar e avançar</button></td></tr>
      </tfoot>
    </table>
  );
}


export function FormularioEndereco({ avancar, retornar }) {
  const { register, control, setValue } = useFormContext();

  const [carregandoEndereco, setCarregandoEndereco] = useState(false);

  async function preenchePorCep(CEP) {
    setCarregandoEndereco(true);
    const endereco = await callApi(getEnderecoCompleto, false, CEP);

    if (endereco) {
      setValue("address.street", endereco.logradouro || '');
      setValue("address.neighborhood", endereco.bairro || '');
      setValue("address.city", endereco.localidade || '');
      setValue("address.state", endereco.uf || '');
    }

    setCarregandoEndereco(false);
  }

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Endereço</td></tr>
        <tr>
          <td className="label obrigatorio">CEP</td>
          <Controller
            name="address.cep"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                as={IMaskInput}
                {...field}
                onAccept={(value) => field.onChange(value)}
                name="address.cep"
                placeholder="Informe o CEP"
                mask="00000-000"
                id="address.cep"
                onBlur={(e) => preenchePorCep(e.target.value)}
              />
            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">Rua</td>
          <Input name="address.street" type="text" placeholder="Informe a rua" {...register("address.street", { required: "Campo obrigatório" })} disabled={carregandoEndereco} />
        </tr>
        <tr>
          <td className="label obrigatorio">Bairro</td>
          <Input name="address.neighborhood" type="text" placeholder="Informe o bairro" {...register("address.neighborhood", { required: "Campo obrigatório" })} disabled={carregandoEndereco} />
        </tr>
        <tr>
          <td className="label obrigatorio">Cidade</td>
          <Input name="address.city" type="text" placeholder="Informe a cidade" {...register("address.city", { required: "Campo obrigatório" })} disabled={carregandoEndereco} />
        </tr>
        <tr>
          <td className="label obrigatorio">Estado</td>
          <Controller
            name="address.state"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="address.state"
                placeholder="Informe o estado (UF)"
                mask="aa"
                id="address.state"
                onChange={(event) => {
                  field.onChange(event.target.value.toUpperCase());
                }}
                onAccept={(value) => field.onChange(value.toUpperCase())}
              />
            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">Número</td>
          <Input name="address.number" type="number" placeholder="Informe o número" {...register("address.number", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label">Complemento</td>
          <Input name="address.complement" type="text" placeholder="Informe o complemento" {...register("address.complement")} />
        </tr>
      </tbody>
      <tfoot>
        <tr className="submit"><td>
          <button onClick={retornar} type="button" className="retornar">← Voltar</button>
          <button type="button" onClick={() => avancar([
            "address.cep",
            "address.street",
            "address.neighborhood",
            "address.city",
            "address.state",
            "address.number",
            "address.complement"
          ])}>
            Salvar e avançar
          </button>
        </td></tr>
      </tfoot>
    </table>
  );
}

export function FormularioNascimento({ avancar, retornar }) {
  const { register, control } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Informações de Nascimento</td></tr>
        <tr>
          <td className="label obrigatorio">Data</td>
          <Input name="birthInfo.date" type="date" placeholder="Informe a data de nascimento" {...register("birthInfo.date", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Cidade</td>
          <Input name="birthInfo.city" type="text" placeholder="Informe a cidade" {...register("birthInfo.city", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Estado</td>
          <Controller
            name="birthInfo.state"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="birthInfo.state"
                placeholder="Informe o estado (UF)"
                mask="aa"
                id="birthInfo.state"
                onChange={(event) => {
                  field.onChange(event.target.value.toUpperCase());
                }}
                onAccept={(value) => field.onChange(value.toUpperCase())}
              />
            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">País</td>
          <Input name="birthInfo.country" type="text" placeholder="Informe o país" {...register("birthInfo.country", { required: "Campo obrigatório" })} />
        </tr>
      </tbody>
      <tfoot>
        <tr className="submit"><td>
          <button onClick={retornar} type="button" className="retornar">← Voltar</button>
          <button type="button" onClick={() => avancar([
            "birthInfo.date",
            "birthInfo.city",
            "birthInfo.state",
            "birthInfo.country"
          ])}>
            Salvar e avançar
          </button>
        </td></tr>
      </tfoot>
    </table>
  );
}

export function FormularioRG({ avancar, retornar }) {
  const { register, control } = useFormContext();

  // O anexo vive fora do react-hook-form (é upload, não campo do JSON do perfil),
  // então o "avançar" precisa checá-lo separadamente.
  const [temAnexo, setTemAnexo] = useState(false);
  const aoMudarAnexo = useCallback(valor => setTemAnexo(valor), []);

  function avancarComAnexo() {
    if (!temAnexo) {
      toast.error("Anexe uma foto do seu RG para continuar.");
      return;
    }

    avancar([
      "cpf",
      "rgInfo.number",
      "rgInfo.issueDate",
      "rgInfo.issuingAuthority"
    ]);
  }

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td>Cadastro de Pessoa Física (CPF)</td></tr>
        <tr>
          <td className="label obrigatorio">Número</td>

          <Controller
            name="cpf"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="cpf"
                placeholder="Informe o número do CPF"
                id="cpf"
                onAccept={(value) => field.onChange(value)}
                mask="000.000.000-00"
              />
            )}
          />
        </tr>

        <tr className="group-label"><td colSpan={2}>Documento de Identidade (RG)</td></tr>
        <tr>
          <td className="label obrigatorio">Número</td>

          <Controller
            name="rgInfo.number"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="rgInfo.number"
                placeholder="Informe o número do RG"
                id="rgInfo.number"
                onAccept={(value) => field.onChange(value)}
              />
            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">Data de emissão</td>
          <Input
            name="rgInfo.issueDate"
            type="date"
            placeholder="Informe a data de emissão" {
            ...register("rgInfo.issueDate", {
              required: "Campo obrigatório",
              min: { value: "01/01/1900", message: "Data precisa ser maior que 01/01/1900" }
            })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Órgão emissor</td>
          <Input name="rgInfo.issuingAuthority" type="text" placeholder="Informe o órgão emissor" {...register("rgInfo.issuingAuthority", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Foto do RG</td>
          <td className="input">
            <AnexoRG onMudanca={aoMudarAnexo} />
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr className="submit"><td>
          <button onClick={retornar} type="button" className="retornar">← Voltar</button>
          <button type="button" onClick={avancarComAnexo}>
            Salvar e avançar
          </button>
        </td></tr>
      </tfoot>
    </table>
  );
}

export function FormularioResponsavelPrimario({ avancar, retornar }) {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Dados da Mãe</td></tr>
        <tr><td className="label obrigatorio">Nome</td><Input name="primaryResponsible.name" type="text" placeholder="Informe o nome" {...register("primaryResponsible.name", { required: "Campo obrigatório" })} /></tr>
        <tr><td className="label obrigatorio">E-mail</td><Input name="primaryResponsible.email" type="email" placeholder="Informe o e-mail" {...register("primaryResponsible.email", { required: "Campo obrigatório" })} /></tr>
        <tr><td className="label obrigatorio">Telefone</td>

          <Controller
            name="primaryResponsible.phone"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="primaryResponsible.phone"
                placeholder="Informe o telefone"
                mask="+55 (00) 00000-0000"
                id="primaryResponsible.phone"
                onAccept={(value) => field.onChange(value)}
              />
            )}
          />

        </tr>
        <tr><td className="label obrigatorio">Telefone Secundário</td>

          <Controller
            name="primaryResponsible.phoneSecondary"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="primaryResponsible.phoneSecondary"
                placeholder="Informe o telefone secundário"
                mask="+55 (00) 00000-0000"
                id="primaryResponsible.phoneSecondary"
                onAccept={(value) => field.onChange(value)}
              />
            )}
          />

        </tr>
        <tr><td className="label obrigatorio">Parentesco</td>
          <td className="input">
            <Controller
              name="primaryResponsible.relationship"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      disabled
                      placeholder="Informe o parentesco"
                    >
                      {parentesco.map(g =>
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
      </tbody>
      <tfoot><tr className="submit"><td>
        <button onClick={retornar} type="button" className="retornar">← Voltar</button>
        <button type="button" onClick={() => avancar([
          "primaryResponsible.name",
          "primaryResponsible.email",
          "primaryResponsible.phone",
          "primaryResponsible.phoneSecondary",
          "primaryResponsible.relationship"
        ])}>
          Salvar e avançar
        </button>
      </td></tr></tfoot>
    </table>
  );
}

export function FormularioResponsavelSecundario({ avancar, retornar }) {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Responsável Secundário</td></tr>
        <tr><td className="label obrigatorio">Nome</td><Input name="secondaryResponsible.name" type="text" placeholder="Informe o nome" {...register("secondaryResponsible.name", { required: "Campo obrigatório" })} /></tr>
        <tr><td className="label obrigatorio">E-mail</td><Input name="secondaryResponsible.email" type="email" placeholder="Informe o e-mail" {...register("secondaryResponsible.email", { required: "Campo obrigatório" })} /></tr>
        <tr><td className="label obrigatorio">Telefone</td>

          <Controller
            name="secondaryResponsible.phone"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="secondaryResponsible.phone"
                placeholder="Informe o telefone"
                mask="+55 (00) 00000-0000"
                id="secondaryResponsible.phone"
                onAccept={(value) => field.onChange(value)}
              />
            )}
          />

        </tr>
        <tr><td className="label obrigatorio">Telefone Secundário</td>
          <Controller
            name="secondaryResponsible.phoneSecondary"
            control={control}
            rules={{
              required: "Campo obrigatório",
            }}
            render={({ field }) => (
              <Input
                {...field}
                as={IMaskInput}
                name="secondaryResponsible.phoneSecondary"
                placeholder="Informe o telefone"
                mask="+55 (00) 00000-0000"
                id="secondaryResponsible.phoneSecondary"
                onAccept={(value) => field.onChange(value)}
              />
            )}
          />
        </tr>
        <tr><td className="label obrigatorio">Parentesco</td>
          <td className="input">
            <Controller
              name="secondaryResponsible.relationship"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Informe o parentesco"
                    >
                      {parentesco.map(g =>
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
      </tbody>
      <tfoot><tr className="submit"><td>
        <button onClick={retornar} type="button" className="retornar">← Voltar</button>
        <button type="button" onClick={() => avancar([
          "secondaryResponsible.name",
          "secondaryResponsible.email",
          "secondaryResponsible.phone",
          "secondaryResponsible.phoneSecondary",
          "secondaryResponsible.relationship"
        ])}>
          Salvar e avançar
        </button>
      </td></tr></tfoot>
    </table>
  );
}

export function FormularioEscolar({ avancar, retornar }) {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Informações Escolares</td></tr>
        <tr>
          <td className="label obrigatorio">Escola atual / última</td>
          <Input name="schoolInfo.currentSchool" type="text" placeholder="Informe a escola atual / última" {...register("schoolInfo.currentSchool", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Série atual</td>
          <td className="input">
            <Controller
              name="schoolInfo.currentGrade"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Informe a série atual"
                    >
                      {escolaridades.map(e =>
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
        <tr>
          <td className="label obrigatorio">Tipo de escola</td>
          <td className="input">
            <Controller
              name="schoolInfo.schoolType"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Informe o tipo de escola"
                    >
                      {tipoEscola.map(e =>
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
      </tbody>
      <tfoot><tr className="submit"><td>
        <button onClick={retornar} type="button" className="retornar">← Voltar</button>
        <button type="button" onClick={() => avancar([
          "schoolInfo.currentSchool",
          "schoolInfo.currentGrade",
          "schoolInfo.schoolType"
        ])}>
          Salvar e avançar
        </button>
      </td></tr></tfoot>
    </table>
  );
}

export function FormularioInformacoesGerais({ avancar, retornar }) {
  const { register, control, formState: { errors } } = useFormContext();

  return (
    <table className="tabela-form">
      <tbody>
        <tr className="group-label"><td colSpan={2}>Informações Gerais</td></tr>
        <tr>
          <td className="label obrigatorio">Como conheceu o Instituto?</td>
          <td className="input">
            <Controller
              name="generalInfo.howDidYouKnow"
              control={control}
              rules={{
                required: "Campo obrigatório",
              }}
              render={({ field }) => {
                const erroDoCampo = encontraErro(errors, field.name);
                return (
                  <>
                    {erroDoCampo && <span className="erro">{erroDoCampo.message}</span>}
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Informe como conheceu"
                    >
                      {comoConheceu.map(c =>
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      )}
                    </Select>
                  </>
                );
              }}
            />
          </td>
        </tr>
        <tr>
          <td className="label obrigatorio">Renda mensal da família (R$)</td>

          <Controller
            name="generalInfo.income"
            control={control}
            rules={{ required: "Campo obrigatório" }}
            render={({ field }) => (

              <Input
                as={IMaskInput}
                {...field}
                defaultValue={field.value || ''}
                inputRef={field.ref}
                mask={Number}
                radix=","
                scale={2} // número de casas decimais
                thousandsSeparator="."
                padFractionalZeros={true} // força duas casas decimais
                normalizeZeros={true}
                mapToRadix={["."]} // aceita ponto também como separador
                prefix="R$" // prefixo
                placeholder="Informe a renda mensal"
                onAccept={(value) => field.onChange(value)}
              />

            )}
          />
        </tr>
        <tr>
          <td className="label obrigatorio">Pessoas em casa</td>
          <Input name="generalInfo.peopleAtHome" type="number" placeholder="Informe o número de pessoas em casa" {...register("generalInfo.peopleAtHome", { required: "Campo obrigatório" })} />
        </tr>
        <tr>
          <td className="label obrigatorio">Pessoas trabalhando</td>
          <Input name="generalInfo.peopleWorking" type="number" placeholder="Informe o número de pessoas trabalhando" {...register("generalInfo.peopleWorking", { required: "Campo obrigatório" })} />
        </tr>
      </tbody>
      <tfoot>
        <tr className="submit"><td>
          <button onClick={retornar} type="button" className="retornar">← Voltar</button>
          <button type="button" onClick={() => avancar([
            "generalInfo.howDidYouKnow",
            "generalInfo.income",
            "generalInfo.peopleAtHome",
            "generalInfo.peopleWorking"
          ])}>
            Salvar e avançar
          </button>
        </td></tr>
      </tfoot>
    </table>
  );
}