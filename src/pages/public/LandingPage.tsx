import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Building2, Wrench, Package,
  Search, Handshake, Star, ChevronRight, Zap,
  ShoppingBag, Layers, ChevronDown,
} from 'lucide-react'

// ─── WhatsApp Button ──────────────────────────────────────────
// Troque pelo seu número com DDD: ex. 5511999999999
const WHATSAPP_NUMBER = '5554981678045'
const WHATSAPP_MSG = encodeURIComponent('Olá! Tenho uma dúvida sobre o Visumo.')

function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
      aria-label="Falar pelo WhatsApp"
    >
      {/* WhatsApp SVG icon */}
      <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C8.28 2 2 8.28 2 16c0 2.49.66 4.82 1.8 6.84L2 30l7.38-1.77A13.93 13.93 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.4a11.36 11.36 0 01-5.78-1.58l-.41-.25-4.38 1.05 1.08-4.26-.27-.44A11.38 11.38 0 014.6 16c0-6.28 5.12-11.4 11.4-11.4S27.4 9.72 27.4 16 22.28 27.4 16 27.4zm6.26-8.54c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17s-.9 1.11-1.1 1.34-.4.26-.74.09a9.34 9.34 0 01-2.75-1.7 10.3 10.3 0 01-1.9-2.37c-.2-.34 0-.52.15-.69.14-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.08-.17-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59H11c-.2 0-.52.07-.79.37-.28.3-1.06 1.03-1.06 2.52s1.09 2.92 1.24 3.12c.15.2 2.14 3.27 5.19 4.58.73.31 1.3.5 1.74.64.73.23 1.4.2 1.92.12.59-.09 1.8-.74 2.06-1.45.25-.71.25-1.32.17-1.45-.07-.13-.28-.2-.62-.37z"/>
      </svg>
      Falar pelo WhatsApp
    </a>
  )
}

// ─── Nav ──────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icons/icon-192x192.png" alt="Visumo" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-lg text-slate-900">Visumo</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/escolher-plano"
            className="px-4 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Cadastrar
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-28 pb-16 px-4 sm:px-6 text-center bg-gradient-to-b from-primary-50 via-white to-white">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} />
          Nunca mais perca um serviço por falta de mão de obra.
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight mb-6">
          <span className="gradient-text block">Comunicação Visual</span>
          Conectamos quem precisa com quem faz acontecer
        </h1>

        <p className="text-xl sm:text-2xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Empresas publicam projetos. Profissionais enviam propostas.
          Fornecedores oferecem materiais. Tudo em um só lugar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/escolher-plano"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 w-full sm:w-auto justify-center"
          >
            Começar agora <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:border-primary-300 hover:text-primary-700 transition-colors w-full sm:w-auto justify-center"
          >
            Já tenho conta <ChevronRight size={18} />
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-500" />
            Planos anuais acessíveis
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-500" />
            Pagamento seguro
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-green-500" />
            100% online
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { value: '1.000+', label: 'Profissionais' },
    { value: '500+',   label: 'Empresas' },
    { value: '200+',   label: 'Fornecedores' },
    { value: '2.500+', label: 'Projetos' },
  ]
  return (
    <section className="py-10 px-4 bg-primary-600">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-black text-white">{s.value}</p>
            <p className="text-sm font-medium text-primary-200 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── User Types ───────────────────────────────────────────────

function UserTypeCard({
  icon, title, subtitle, benefits, color,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  benefits: string[]
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{subtitle}</p>
      <ul className="space-y-2 mb-5">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            {b}
          </li>
        ))}
      </ul>
      <Link
        to="/escolher-plano"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 group-hover:gap-2.5 transition-all"
      >
        Ver plano <ArrowRight size={14} />
      </Link>
    </div>
  )
}

function UserTypes() {
  const types = [
    {
      icon: <Wrench size={28} className="text-amber-600" />,
      title: 'Profissional',
      subtitle: 'Presta serviços de comunicação visual',
      color: 'bg-amber-50',
      benefits: [
        'Acesse projetos na sua região',
        'Envie propostas detalhadas',
        'Construa seu portfólio',
        'Expanda sua cartela de clientes',
      ],
    },
    {
      icon: <Package size={28} className="text-green-600" />,
      title: 'Fornecedor',
      subtitle: 'Vende materiais e insumos para o setor',
      color: 'bg-green-50',
      benefits: [
        'Catálogo de produtos online',
        'Visibilidade para profissionais',
        'Contato direto com compradores',
        'Aumente suas vendas B2B',
      ],
    },
    {
      icon: <Building2 size={28} className="text-violet-600" />,
      title: 'Empresa',
      subtitle: 'Contrata serviços de comunicação visual',
      color: 'bg-violet-50',
      benefits: [
        'Publique e gerencie projetos',
        'Receba propostas de profissionais',
        'Gerencie negociações em um só lugar',
        'Chat direto com os prestadores',
      ],
    },
    {
      icon: <ShoppingBag size={28} className="text-blue-600" />,
      title: 'Fornecedor/Empresa',
      subtitle: 'Fornece materiais e também contrata serviços',
      color: 'bg-blue-50',
      benefits: [
        'Catálogo de produtos online',
        'Publique e receba projetos',
        'Acesso duplo: fornecedor + empresa',
        'Máxima visibilidade na plataforma',
      ],
    },
    {
      icon: <Layers size={28} className="text-rose-600" />,
      title: 'Empresa Prestadora',
      subtitle: 'Empresa que também presta serviços ao mercado',
      color: 'bg-rose-50',
      benefits: [
        'Publique e receba projetos',
        'Envie e receba propostas',
        'Perfil completo: empresa + prestador',
        'Destaque máximo na busca',
      ],
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Para quem é o Visumo?</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Escolha o perfil que melhor descreve você e comece a usar hoje mesmo
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {types.map((t) => (
            <UserTypeCard key={t.title} {...t} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: <Building2 size={20} className="text-primary-600" />,
      title: 'Empresa publica projeto',
      desc: 'Descreva o serviço que precisa, defina orçamento e prazo.',
    },
    {
      number: '02',
      icon: <Search size={20} className="text-primary-600" />,
      title: 'Profissionais encontram',
      desc: 'Profissionais da sua região visualizam o projeto e avaliam a oportunidade.',
    },
    {
      number: '03',
      icon: <Handshake size={20} className="text-primary-600" />,
      title: 'Proposta aceita',
      desc: 'A empresa escolhe a melhor proposta e começa o chat para alinhar detalhes.',
    },
    {
      number: '04',
      icon: <Star size={20} className="text-primary-600" />,
      title: 'Projeto entregue',
      desc: 'Serviço concluído com sucesso. Construa uma parceria duradoura.',
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Como funciona</h2>
          <p className="text-slate-500 text-lg">Simples, rápido e eficiente</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="bg-primary-50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  {step.icon}
                </div>
                <span className="text-3xl font-black text-primary-100">{step.number}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────

function Features() {
  const features = [
    { title: 'Chat em tempo real', desc: 'Comunicação direta entre empresa e profissional após aceite da proposta.' },
    { title: 'Geolocalização', desc: 'Encontre profissionais e projetos próximos à sua região.' },
    { title: 'Planos flexíveis', desc: 'Planos anuais acessíveis para cada tipo de usuário.' },
    { title: 'Catálogo de fornecedores', desc: 'Acesse materiais e insumos direto de quem fornece.' },
    { title: 'Dashboard completo', desc: 'Gerencie projetos, propostas e negociações em um painel centralizado.' },
    { title: 'Seguro e confiável', desc: 'Autenticação segura e controle de acesso por perfil de usuário.' },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 bg-primary-950">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Por que escolher o Visumo?</h2>
          <p className="text-primary-300 text-lg">Uma plataforma completa para o setor de comunicação visual</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-primary-900/50 border border-primary-800 rounded-2xl p-5">
              <CheckCircle2 size={18} className="text-primary-400 mb-3" />
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-primary-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'O Visumo é gratuito?',
    a: 'O Visumo funciona por assinatura anual. Você escolhe o plano ideal para o seu perfil (profissional, empresa ou fornecedor) e durante o ano todo pode fazer quantas negociações quiser sem custo adicional.',
  },
  {
    q: 'Como funciona para profissionais de comunicação visual?',
    a: 'Você cria seu perfil, adiciona suas especialidades e portfólio, e passa a receber oportunidades de projetos na sua região. Envie propostas, negocie diretamente com a empresa e construa sua reputação com avaliações reais.',
  },
  {
    q: 'Uma empresa pode publicar projetos e receber propostas?',
    a: 'Sim! Empresas publicam projetos descrevendo o serviço, orçamento e prazo. Profissionais qualificados da região enviam propostas, e você escolhe a melhor via chat direto na plataforma.',
  },
  {
    q: 'Fornecedores também podem usar o Visumo?',
    a: 'Sim. Fornecedores criam um catálogo de produtos e materiais visível para profissionais e empresas de todo o Brasil. Compradores entram em contato diretamente pelo sistema de cotações.',
  },
  {
    q: 'Os pagamentos são seguros?',
    a: 'As assinaturas são processadas pelo PagBank, um dos maiores meios de pagamento do Brasil, com total segurança. As negociações entre empresa e profissional são gerenciadas diretamente entre as partes.',
  },
  {
    q: 'Posso cancelar meu plano?',
    a: 'Os planos são anuais. Você pode cancelar a renovação automática a qualquer momento pelo painel de assinatura, mantendo acesso até o fim do período pago.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-semibold text-slate-900 text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-primary-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-slate-500 text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  )
}

function FAQ() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Perguntas frequentes</h2>
          <p className="text-slate-500 text-lg">Tire suas dúvidas sobre o Visumo</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-6 divide-y-0">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ─────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Pronto para começar?</h2>
        <p className="text-slate-500 text-lg mb-8">
          Escolha seu plano e faça parte do maior marketplace de
          comunicação visual do Brasil.
        </p>
        <Link
          to="/escolher-plano"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-600 text-white font-semibold text-lg hover:bg-primary-700 transition-colors shadow-xl shadow-primary-200"
        >
          Ver planos e começar <ArrowRight size={20} />
        </Link>
        <p className="text-xs text-slate-400 mt-4">Planos anuais. Pagamento seguro via PagBank.</p>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192x192.png" alt="Visumo" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-slate-900">Visumo</span>
        </div>
        <p className="text-sm text-slate-400 text-center">
          © {new Date().getFullYear()} Visumo. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <Link to="/planos"      className="hover:text-slate-600 transition-colors">Planos</Link>
          <Link to="/faq"         className="hover:text-slate-600 transition-colors">FAQ</Link>
          <Link to="/termos"      className="hover:text-slate-600 transition-colors">Termos</Link>
          <Link to="/privacidade" className="hover:text-slate-600 transition-colors">Privacidade</Link>
          <Link to="/login"       className="hover:text-slate-600 transition-colors">Entrar</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Stats />
      <UserTypes />
      <HowItWorks />
      <Features />
      <FAQ />
      <CTA />
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
