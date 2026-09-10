import { useEffect, useRef, useState } from 'react';
import { get, set } from 'local-storage';
import toast from 'react-hot-toast';
import callApi from '../../../../../api/callAPI';
import { enviaDocumentoRG, getDocumentoRG } from '../../../../../api/services/user';

const TIPOS_ACEITOS = 'image/jpeg,image/jpg,image/png,image/heic,application/pdf';
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

/**
 * Anexo obrigatório da foto do RG. O arquivo sobe assim que é escolhido, em requisição
 * própria — o passo do wizard é enviado como JSON no `PUT /users/profile` e não comporta
 * um arquivo. `onMudanca` avisa o passo se já existe anexo, para liberar o "avançar".
 */
export default function AnexoRG({ onMudanca }) {
  const inputRef = useRef(null);

  const usuario = get('user');
  const [temAnexo, setTemAnexo] = useState(!!usuario?.rgInfo?.hasDocument);
  const [previa, setPrevia] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => onMudanca?.(temAnexo), [temAnexo, onMudanca]);

  // Carrega o anexo já enviado para o candidato conferir o que está no sistema.
  useEffect(() => {
    if (!temAnexo || previa) return;

    let urlCriada;

    (async () => {
      const blob = await callApi(getDocumentoRG, false);
      if (!blob || blob.type === 'application/pdf') return;

      urlCriada = URL.createObjectURL(blob);
      setPrevia(urlCriada);
    })();

    return () => urlCriada && URL.revokeObjectURL(urlCriada);
    // Só na primeira carga: depois do upload a prévia já vem do arquivo local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selecionar(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO) {
      toast.error('Arquivo muito grande. O limite é de 4MB.');
      evento.target.value = '';
      return;
    }

    setEnviando(true);
    const resposta = await callApi(enviaDocumentoRG, true, arquivo);
    setEnviando(false);

    if (!resposta) {
      evento.target.value = '';
      return;
    }

    setTemAnexo(true);
    setPrevia(arquivo.type === 'application/pdf' ? null : URL.createObjectURL(arquivo));

    // Mantém o usuário salvo em sincronia para que o passo continue liberado após um F5.
    if (usuario) {
      set('user', { ...usuario, rgInfo: { ...usuario.rgInfo, hasDocument: true } });
    }

    toast.success('Documento anexado!');
  }

  return (
    <div className="anexo-rg">
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS}
        onChange={selecionar}
        hidden
      />

      {previa
        ? <img className="previa" src={previa} alt="Prévia do RG anexado" />
        : <div className={'previa vazia' + (temAnexo ? ' com-arquivo' : '')}>
            <span>{temAnexo ? 'Documento anexado' : 'Nenhum arquivo anexado'}</span>
          </div>
      }

      <div className="controles">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}>
          {enviando ? 'Enviando…' : temAnexo ? 'Trocar arquivo' : 'Anexar documento'}
        </button>

        <p className="aviso">
          Envie uma <strong>foto legível</strong>, com todos os dados visíveis e sem reflexo.
          Aceitamos JPG, PNG ou PDF de até 4MB.
        </p>
      </div>
    </div>
  );
}
