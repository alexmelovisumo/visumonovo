import { Link } from 'react-router-dom'
import {
  MessageCircle, ArrowRight, CheckCircle2,
  Building2, Wrench, Package,
  Search, FileText, MessageSquare, Star, Radio,
} from 'lucide-react'

const WHATSAPP_GROUPS = [
  { label: 'Grupo Empresas & Profissionais 001', href: 'https://chat.whatsapp.com/IVzqgEkUXjZ5uj2ydK4cyk' },
  { label: 'Grupo Empresas & Profissionais 002', href: 'https://chat.whatsapp.com/LPjZX7mOhlG4HgLLZnZLcE' },
]

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
  },
  {
    icon: <Package size={28} className="text-teal-600" />,
    bg: 'bg-teal-50',
    title: 'Fornecedor',
    sub: 'Fornece materiais e matéria-prima',
    benefits: [
      'Exponha seus produtos para todo o mercado',
      'Alcance empresas e profissionais da área',
      'Divulgue promoções e novidades',
      'Receba cotações diretamente',
    ],
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <FileText size={22} className="text-primary-600" />,
    title: 'Empresa publica um projeto',
    desc: 'Descreve o serviço, prazo e orçamento. Em minutos está disponível para profissionais de todo o Brasil.',
  },
  {
    step: '02',
    icon: <Search size={22} className="text-green-600" />,
    title: 'Profissional encontra e se candidata',
    desc: 'Filtra por região, especialidade e valor. Envia proposta com mensagem e prazo estimado.',
  },
  {
    step: '03',
    icon: <MessageSquare size={22} className="text-amber-600" />,
    title: 'Negociação e fechamento',
    desc: 'Empresa escolhe o profissional, negocia detalhes pelo chat integrado e fecha o contrato.',
  },
  {
    step: '04',
    icon: <Star size={22} className="text-rose-500" />,
    title: 'Entrega e avaliação',
    desc: 'Projeto concluído, ambos avaliam. Reputação construída a cada entrega bem-feita.',
  },
]

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

          {/* Frase de abertura impactante */}
          <p className="text-primary-300 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto mb-3">
            A comunicação visual movimenta bilhões todos os anos.
          </p>
          <p className="text-primary-300 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto mb-3">
            Mas nunca teve uma plataforma capaz de conectar todo o setor.
          </p>
          <p className="text-white text-2xl sm:text-3xl font-black mb-10">Até agora.</p>

          {/* Logo + nome */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <img src="/icons/icon-192x192.png" alt="Visumo" className="w-14 h-14 rounded-2xl shadow-lg" />
            <span className="text-white font-black text-4xl tracking-tight">Visumo</span>
          </div>

          {/* Texto principal */}
          <div className="max-w-xl mx-auto mb-10 space-y-4 text-left sm:text-center">
            <p className="text-primary-200 text-xl font-semibold">A comunicação visual nunca mais será a mesma.</p>
            <p className="text-white text-2xl font-black">No dia 21/07/2026, nasce o Visumo.</p>
            <p className="text-primary-300 text-base leading-relaxed">
              A plataforma que conecta empresas, profissionais e fornecedores em um único ecossistema.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              {['Mais oportunidades.', 'Mais conexões.', 'Mais negócios.'].map(t => (
                <span key={t} className="text-white font-bold text-sm bg-white/10 rounded-full px-4 py-1.5">{t}</span>
              ))}
            </div>
          </div>

          {/* Card Live */}
          <div className="max-w-2xl mx-auto mb-10 bg-white/5 border border-white/10 rounded-2xl p-7 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Radio size={16} className="text-rose-400 animate-pulse" />
              <p className="text-rose-400 text-sm font-bold uppercase tracking-wide">Live Oficial de Lançamento</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {[
                { dia: '21', label: '1ª Live' },
                { dia: '22', label: '2ª Live' },
              ].map(live => (
                <div key={live.dia} className="bg-primary-900/60 border border-primary-700 rounded-xl p-4 text-center">
                  <p className="text-primary-400 text-xs font-semibold mb-1">{live.label}</p>
                  <p className="text-white text-3xl font-black">{live.dia} <span className="text-lg font-semibold text-primary-300">JUL</span></p>
                  <p className="text-primary-200 text-sm font-semibold mt-1">às 20h00</p>
                </div>
              ))}
            </div>
            <ul className="space-y-2">
              {[
                'Conheça o Visumo por dentro',
                'Veja como gerar novos negócios na plataforma',
                'Entenda como empresas, profissionais e fornecedores trabalham juntos',
                'Tire suas dúvidas ao vivo',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-primary-200">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA grupos */}
          <p className="text-primary-300 text-sm mb-2">
            Garanta sua vaga entrando em um dos grupos oficiais do WhatsApp.
          </p>
          <p className="text-primary-400 text-xs mb-5">
            Lá você recebe o cupom exclusivo de lançamento, acompanha todas as novidades e participa da live ao vivo.
          </p>
          <a
            href={WHATSAPP_GROUPS[0].href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-2xl px-6 py-3.5 transition-colors shadow-lg"
          >
            <MessageCircle size={18} />
            Entrar no grupo e receber meu cupom
          </a>
        </div>
      </section>

      {/* ── Perfis ─────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Para quem é o Visumo?</h2>
            <p className="text-slate-500">Uma plataforma para toda a cadeia da comunicação visual</p>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ──────────────────────────────────── */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Como funciona</h2>
            <p className="text-slate-500">Do projeto ao pagamento, tudo dentro da plataforma</p>
          </div>

          <div className="relative">
            {/* linha conectora */}
            <div className="hidden sm:block absolute left-7 top-8 bottom-8 w-0.5 bg-slate-100" />

            <div className="flex flex-col gap-6">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="flex gap-5 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative z-10">
                    {item.icon}
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.step}</span>
                  </div>
                  <div className="pt-1">
                    <h3 className="font-bold text-slate-900 text-base mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Grupos WhatsApp ────────────────────────────────── */}
      <section className="px-4 py-16 bg-slate-50">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Entre na comunidade</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Participe dos nossos grupos no WhatsApp. Receba seu cupom exclusivo de lançamento e acompanhe todas as novidades.
          </p>

          <div className="flex flex-col gap-3 mb-6">
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
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700 font-medium">
            🎁 6 meses grátis para empresas e profissionais · 50% off para fornecedores
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="px-4 py-16 bg-primary-950 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-3">Já tem seu cupom?</h2>
          <p className="text-primary-300 mb-8">Cadastre-se agora e ative seu acesso gratuito.</p>
          <Link
            to="/escolher-plano"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl px-8 py-4 transition-colors shadow-lg text-lg"
          >
            Criar minha conta <ArrowRight size={20} />
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
