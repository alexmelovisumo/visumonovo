import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

interface FAQItem {
  q: string
  a: string
}

interface FAQCategory {
  label: string
  slug:  string
  items: FAQItem[]
}

// ─── Content ──────────────────────────────────────────────────

const CATEGORIES: FAQCategory[] = [
  {
    label: 'Geral',
    slug:  'geral',
    items: [
      {
        q: 'O que é o Visumo?',
        a: 'O Visumo é um marketplace B2B voltado para o setor de comunicação visual. Conectamos empresas que precisam de serviços com profissionais autônomos, empresas prestadoras e fornecedores de materiais e insumos.',
      },
      {
        q: 'Preciso pagar para me cadastrar?',
        a: 'Não. O cadastro é gratuito e existe um plano gratuito para começar. Planos pagos oferecem recursos avançados como mais projetos ativos, propostas ilimitadas e destaque no catálogo.',
      },
      {
        q: 'Quais tipos de conta existem?',
        a: 'Empresa (contrata serviços), Profissional Autônomo (oferece serviços), Empresa Prestadora (oferece e contrata), Fornecedor (vende materiais) e Fornecedor-Empresa (vende e contrata). Cada tipo tem funcionalidades específicas.',
      },
      {
        q: 'A plataforma funciona no celular?',
        a: 'Sim. O Visumo é um Progressive Web App (PWA) otimizado para mobile. Você pode instalá-lo na tela inicial do seu smartphone como um aplicativo nativo.',
      },
    ],
  },
  {
    label: 'Empresa',
    slug:  'empresa',
    items: [
      {
        q: 'Como publico um projeto?',
        a: 'Acesse o Dashboard → Criar Projeto. Preencha título, descrição, orçamento estimado, prazo e localização. O projeto fica visível para profissionais da plataforma imediatamente após a publicação.',
      },
      {
        q: 'Como escolho um profissional?',
        a: 'Após publicar o projeto, você recebe propostas. Cada proposta mostra o valor oferecido, prazo e mensagem do profissional. Você pode aceitar uma proposta e iniciar o chat para alinhar detalhes.',
      },
      {
        q: 'Posso falar diretamente com o profissional?',
        a: 'Sim. Após aceitar uma proposta, um chat em tempo real é aberto entre você e o profissional. Você pode trocar mensagens, imagens e atualizações de progresso.',
      },
      {
        q: 'Como finalizo um projeto?',
        a: 'No detalhe do projeto, clique em "Finalizar Projeto". Você poderá adicionar fotos e documentos de conclusão e avaliar o profissional com uma nota de 1 a 5 estrelas.',
      },
    ],
  },
  {
    label: 'Profissional',
    slug:  'profissional',
    items: [
      {
        q: 'Como encontro projetos para propor?',
        a: 'Acesse Dashboard → Projetos para ver todos os projetos abertos. Use os filtros de estado, categoria e orçamento para encontrar projetos compatíveis com seu perfil.',
      },
      {
        q: 'Posso ver projetos próximos a mim?',
        a: 'Sim. Acesse "Mapa de Projetos" para ver projetos com localização definida em um mapa interativo. O mapa pode ser centrado na sua localização automaticamente.',
      },
      {
        q: 'Como aumentar minhas chances de ser contratado?',
        a: 'Complete seu perfil ao máximo: foto, bio, especialidades, portfólio de imagens e links profissionais. Perfis completos recebem muito mais visualizações e propostas aceitas.',
      },
      {
        q: 'Como funciona a avaliação?',
        a: 'Após a conclusão de um projeto, a empresa contratante pode avaliar seu trabalho com nota geral e notas detalhadas por qualidade, comunicação, pontualidade e profissionalismo. As avaliações são públicas no seu perfil.',
      },
    ],
  },
  {
    label: 'Fornecedor',
    slug:  'fornecedor',
    items: [
      {
        q: 'Como cadastro meus produtos?',
        a: 'Acesse Dashboard → Meus Produtos e clique em "Adicionar produto". Informe nome, descrição, categoria e preço. Seus produtos ficam visíveis para todos os usuários da plataforma.',
      },
      {
        q: 'Como recebo cotações?',
        a: 'Quando um cliente solicita cotação de um produto seu, você recebe uma notificação em Cotações. Você pode responder com o preço, prazo e condições diretamente pela plataforma.',
      },
      {
        q: 'Posso vender para qualquer região do Brasil?',
        a: 'Sim. Não há restrição geográfica para fornecedores. Ao responder cotações, informe as condições de frete e entrega diretamente para o cliente.',
      },
    ],
  },
  {
    label: 'Pagamentos',
    slug:  'pagamentos',
    items: [
      {
        q: 'Quais formas de pagamento são aceitas?',
        a: 'Assinaturas são processadas via PagBank, com suporte a cartão de crédito (parcelado), Pix e boleto bancário.',
      },
      {
        q: 'Posso cancelar minha assinatura?',
        a: 'Sim, a qualquer momento. Após o cancelamento, sua conta retorna ao plano gratuito ao final do período pago. Não há reembolso proporcional pelo período restante, salvo casos previstos no Código de Defesa do Consumidor.',
      },
      {
        q: 'O plano anual tem desconto?',
        a: 'Sim. Planos anuais oferecem até 20% de desconto em relação ao plano mensal equivalente. Confira os valores atuais na página de Planos.',
      },
      {
        q: 'Meu pagamento não foi reconhecido, o que faço?',
        a: 'Pagamentos via PagBank podem levar até 2 dias úteis para serem processados. Se após esse prazo seu plano não estiver ativo, entre em contato pelo e-mail contato@visumo.com.br com o comprovante de pagamento.',
      },
    ],
  },
]

// ─── Accordion Item ───────────────────────────────────────────

function AccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-800">{item.q}</span>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-slate-600 leading-relaxed pb-4 pr-6">{item.a}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function FAQPage() {
  const [active, setActive] = useState('geral')
  const category = CATEGORIES.find((c) => c.slug === active) ?? CATEGORIES[0]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <span className="font-bold text-primary-700 tracking-tight">Visumo</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-600">Perguntas frequentes</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Como podemos ajudar?</h1>
          <p className="text-slate-500 text-sm">Encontre respostas rápidas sobre a plataforma Visumo.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Category tabs (sidebar on desktop) */}
          <nav className="lg:w-48 shrink-0">
            <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <button
                    onClick={() => setActive(c.slug)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-colors w-full text-left ${
                      active === c.slug
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-300'
                    }`}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Questions */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-6">
            <h2 className="font-bold text-slate-900 py-5 border-b border-slate-100">{category.label}</h2>
            {category.items.map((item) => (
              <AccordionItem key={item.q} item={item} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 mb-3">Não encontrou o que procurava?</p>
          <a
            href="mailto:contato@visumo.com.br"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Falar com o suporte
          </a>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400 space-x-4">
          <Link to="/termos" className="hover:text-slate-600">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link>
          <Link to="/" className="hover:text-slate-600">Página inicial</Link>
        </div>
      </main>
    </div>
  )
}
