import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Building2, Wrench, Package,
  Search, Handshake, Star, ChevronRight, Zap,
  ShoppingBag, Layers,
} from 'lucide-react'

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
          Marketplace B2B de Comunicação Visual
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
          <span className="gradient-text block">Comunicação Visual</span>
          Conectamos quem precisa com quem faz acontecer
        </h1>

        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
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
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
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
      icon: <Wrench size={24} className="text-amber-600" />,
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
      icon: <Package size={24} className="text-green-600" />,
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
      icon: <Building2 size={24} className="text-violet-600" />,
      title: 'Empresa',
      subtitle: 'Contrata serviços de comunicação visual',
      color: 'bg-violet-50',
      benefits: [
        'Publique projetos gratuitamente',
        'Receba propostas de profissionais',
        'Gerencie negociações em um só lugar',
        'Chat direto com os prestadores',
      ],
    },
    {
      icon: <ShoppingBag size={24} className="text-blue-600" />,
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
      icon: <Layers size={24} className="text-rose-600" />,
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
      desc: 'Descreva o serviço que precisa, defina orçamento e prazo. É gratuito.',
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

// ─── CTA ─────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Pronto para começar?</h2>
        <p className="text-slate-500 text-lg mb-8">
          Crie sua conta gratuitamente e faça parte do maior marketplace de
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
      <CTA />
      <Footer />
    </div>
  )
}
