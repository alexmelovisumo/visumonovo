import { Link } from 'react-router-dom'
import {
  MessageCircle, ArrowRight, CheckCircle2,
  Building2, Wrench, Package, Play,
} from 'lucide-react'

// ─── Substitua pelos links reais quando criar os grupos ───────
const WHATSAPP_GROUPS = [
  { label: 'Grupo Empresas & Profissionais 001', href: 'https://chat.whatsapp.com/LINK001' },
  { label: 'Grupo Empresas & Profissionais 002', href: 'https://chat.whatsapp.com/LINK002' },
]

// ─── Cupons por perfil ────────────────────────────────────────
const COUPONS = [
  { type: 'Empresa',            code: 'BETAEMPRESA',    plan: 'plano_empresa',    color: 'bg-blue-600' },
  { type: 'Profissional',       code: 'BETAPRO',        plan: 'plano_profissional', color: 'bg-green-600' },
  { type: 'Empresa Prestadora', code: 'BETAPRESTADORA', plan: 'plano_empresa_prestadora', color: 'bg-teal-600' },
]

// ─── Benefícios por perfil ────────────────────────────────────
const PROFILES = [
  {
    icon: <Building2 size={28} className="text-blue-600" />,
    bg: 'bg-blue-50',
    title: 'Empresa',
    sub: 'Contrata serviços de comunicação visual',
    benefits: [
      'Publique projetos e receba propostas',
      'Escolha o profissional ideal para cada demanda',
      'Gerencie tudo em um só lugar',
      'Chat direto com profissionais',
    ],
    coupon: 'BETAEMPRESA',
    plan: 'plano_empresa',
  },
  {
    icon: <Wrench size={28} className="text-green-600" />,
    bg: 'bg-green-50',
    title: 'Profissional',
    sub: 'Presta serviços de comunicação visual',
    benefits: [
      'Acesse projetos na sua região',
      'Envie propostas e feche contratos',
      'Construa portfólio e reputação',
      'Gerencie seus projetos e clientes',
    ],
    coupon: 'BETAPRO',
    plan: 'plano_profissional',
  },
  {
    icon: <Package size={28} className="text-teal-600" />,
    bg: 'bg-teal-50',
    title: 'Empresa Prestadora',
    sub: 'Presta e contrata serviços',
    benefits: [
      'Publique e receba projetos',
      'Portfólio de trabalhos realizados',
      'Gerencie equipes e contratações',
      'Visibilidade completa no mercado',
    ],
    coupon: 'BETAPRESTADORA',
    plan: 'plano_empresa_prestadora',
  },
]

// ─── Video placeholder ────────────────────────────────────────
function VideoPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full aspect-video bg-primary-950 rounded-2xl flex flex-col items-center justify-center gap-3 border border-primary-800">
      <div className="w-16 h-16 bg-primary-700/50 rounded-full flex items-center justify-center">
        <Play size={28} className="text-primary-300 ml-1" />
      </div>
      <p className="text-primary-400 text-sm">{label}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export function LaunchPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icons/icon-192x192.png" alt="Visumo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-slate-900">Visumo</span>
          </div>
          <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            Já tenho conta
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-primary-950 to-primary-800 px-4 pt-16 pb-20 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-primary-500/30 border border-primary-400/40 text-primary-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            Lançamento — Acesso gratuito por 3 meses
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            O marketplace de<br />comunicação visual chegou
          </h1>
          <p className="text-primary-300 text-lg mb-8 leading-relaxed max-w-xl mx-auto">
            Empresas publicam projetos. Profissionais enviam propostas. Fornecedores oferecem materiais. Tudo em um só lugar — e por 3 meses é de graça.
          </p>

          {/* Video principal */}
          <div className="max-w-2xl mx-auto mb-8">
            <VideoPlaceholder label="Vídeo de apresentação — em breve" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/escolher-plano"
              className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold rounded-2xl px-6 py-3.5 transition-colors shadow-lg"
            >
              Quero meu acesso gratuito <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Perfis ─────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Para quem é o Visumo?</h2>
            <p className="text-slate-500">Escolha seu perfil e comece gratuitamente</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {PROFILES.map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${p.bg} rounded-xl flex items-center justify-center`}>
                  {p.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{p.title}</h3>
                  <p className="text-slate-500 text-sm mt-0.5">{p.sub}</p>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.benefits.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/cadastro?plano=${p.plan}&cupom=${p.coupon}`}
                  className="mt-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors text-sm"
                >
                  Começar grátis com código <span className="font-mono bg-white/20 px-1.5 rounded">{p.coupon}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cupons ─────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-2">3 meses 100% gratuito</h2>
          <p className="text-slate-500 mb-10">Use o cupom do seu perfil ao se cadastrar. Sem cartão de crédito.</p>

          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {COUPONS.map(c => (
              <div key={c.code} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
                <p className="text-slate-500 text-sm mb-2">{c.type}</p>
                <p className={`font-mono font-black text-xl text-white ${c.color} rounded-xl px-4 py-2.5 mb-3`}>
                  {c.code}
                </p>
                <Link
                  to={`/cadastro?plano=${c.plan}&cupom=${c.code}`}
                  className="text-sm text-primary-600 font-semibold hover:text-primary-700 flex items-center justify-center gap-1"
                >
                  Usar este cupom <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            Cupons válidos por tempo limitado. Após o período gratuito, escolha um plano para continuar.
          </p>
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────── */}
      <section className="px-4 py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Como funciona</h2>
            <p className="text-slate-500">Veja na prática como o Visumo conecta o mercado</p>
          </div>
          <VideoPlaceholder label="Vídeo demonstração — em breve" />
        </div>
      </section>

      {/* ── Grupos WhatsApp ────────────────────────────────── */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Entre na comunidade</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Participe dos nossos grupos no WhatsApp. Tire dúvidas, acompanhe novidades e participe das lives de apresentação ao vivo.
          </p>

          <div className="flex flex-col gap-3">
            {WHATSAPP_GROUPS.map(g => (
              <a
                key={g.href}
                href={g.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-400 transition-colors text-white font-semibold rounded-2xl px-6 py-4 shadow-md"
              >
                <MessageCircle size={20} />
                {g.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="px-4 py-16 bg-primary-950 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-3">Comece agora, é gratuito</h2>
          <p className="text-primary-300 mb-8">3 meses sem custo. Sem cartão de crédito. Cancele quando quiser.</p>
          <Link
            to="/escolher-plano"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl px-8 py-4 transition-colors shadow-lg text-lg"
          >
            Criar minha conta grátis <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-6 px-4 text-center">
        <p className="text-slate-400 text-xs">
          © {new Date().getFullYear()} Visumo · Marketplace de Comunicação Visual ·{' '}
          <Link to="/termos" className="hover:text-slate-600">Termos</Link> ·{' '}
          <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link>
        </p>
      </footer>
    </div>
  )
}
