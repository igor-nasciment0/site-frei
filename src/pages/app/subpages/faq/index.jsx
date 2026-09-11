import './index.scss';

import AcordeaoPerguntas from '../../../../components/acordeao_perguntas';
import { useSearchParams } from 'react-router';

export default function FAQ() {
  const [searchParams] = useSearchParams();
  // `q` aceita a key da pergunta (ex.: ?q=edital-bolsa) ou o índice, para links antigos.
  const qParam = searchParams.get('q');
  const aberta = qParam !== null ? qParam : undefined;

  return (
    <section className='faq'>
      <p className="eyebrow">Central de ajuda</p>
      <h1>Perguntas frequentes</h1>

      <AcordeaoPerguntas aberta={aberta} />

      <div className="faixa-contato">
        <div>
          <p className="titulo">Não encontrou sua dúvida?</p>
          <p className="texto">Seg a sex · 8h–11h30 e 13h30–17h · (11) 96398-6252</p>
        </div>

        <a className="btn-fantasma" href="https://wa.me/5511963986252" target="_blank" rel="noopener noreferrer">
          Falar no WhatsApp
        </a>
      </div>
    </section>
  )
}
