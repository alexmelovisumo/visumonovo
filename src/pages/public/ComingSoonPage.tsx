import { Link } from 'react-router-dom'
import { MessageCircle, ArrowRight, Radio } from 'lucide-react'

const WHATSAPP_GROUPS = [
  { label: 'Grupo Empresas & Profissionais 001', href: 'https://chat.whatsapp.com/IVzqgEkUXjZ5uj2ydK4cyk' },
  { label: 'Grupo Empresas & Profissionais 002', href: 'https://chat.whatsapp.com/LPjZX7mOhlG4HgLLZnZLcE' },
]

export function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 flex flex-col items-center justify-center px-4 text-center py-16">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/icons/icon-192x192.png" alt="Visumo" className="w-12 h-12 rounded-xl shadow-lg" />
        <span className="text-white font-bold text-3xl">Visumo</span>
      </div>

      {/* Badge */}
      <span className="inline-block bg-primary-500/30 border border-primary-400/40 text-primary-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
        Em breve
      </span>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-xl">
        O marketplace da comunicação visual está chegando.
      </h1>
      <p className="text-primary-200 text-lg max-w-lg mb-8 leading-relaxed">
        Entre agora nos grupos oficiais do WhatsApp, participe da live de lançamento e receba seu cupom exclusivo.
      </p>

      {/* Card Live */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Radio size={14} className="text-rose-400 animate-pulse" />
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wide">Live Oficial de Lançamento</p>
        </div>
        <p className="text-white font-semibold text-sm mb-2">Em breve teremos uma live de lançamento!</p>
        <p className="text-primary-300 text-xs leading-relaxed">
          A data será anunciada nos grupos oficiais do WhatsApp. Os cupons exclusivos serão distribuídos ao vivo — entre no grupo e não perca!
        </p>
      </div>

      {/* WhatsApp groups */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-8">
        {WHATSAPP_GROUPS.map(g => (
          <a
            key={g.href}
            href={g.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-400 transition-colors text-white font-semibold rounded-2xl px-6 py-3.5 shadow-lg"
          >
            <MessageCircle size={20} />
            {g.label}
          </a>
        ))}
      </div>

      {/* Benefícios */}
      <div className="flex flex-col gap-1.5 mb-8">
        <p className="text-white font-semibold text-sm">🎁 6 meses GRÁTIS para empresas e profissionais.</p>
        <p className="text-white font-semibold text-sm">🎁 50% de desconto no 1º ano para fornecedores.</p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-sm border-t border-primary-700 mb-6" />

      <div className="flex items-center gap-4 text-sm">
        <Link
          to="/lancamento"
          className="text-primary-300 hover:text-white transition-colors flex items-center gap-1"
        >
          Ver página de lançamento <ArrowRight size={14} />
        </Link>
        <span className="text-primary-700">·</span>
        <Link to="/login" className="text-primary-400 hover:text-primary-200 transition-colors">
          Já tenho conta
        </Link>
      </div>
    </div>
  )
}
