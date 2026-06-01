import { Link } from 'react-router-dom'
import { MessageCircle, ArrowRight } from 'lucide-react'

// ─── Substitua estes links quando criar os grupos ─────────────
const WHATSAPP_GROUPS = [
  { label: 'Grupo Empresas & Profissionais 001', href: 'https://chat.whatsapp.com/LINK001' },
  { label: 'Grupo Empresas & Profissionais 002', href: 'https://chat.whatsapp.com/LINK002' },
]

export function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-950 via-primary-900 to-primary-800 flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <img src="/icons/icon-192x192.png" alt="Visumo" className="w-12 h-12 rounded-xl shadow-lg" />
        <span className="text-white font-bold text-3xl">Visumo</span>
      </div>

      {/* Badge */}
      <span className="inline-block bg-primary-500/30 border border-primary-400/40 text-primary-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
        Em breve
      </span>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4 max-w-xl">
        O marketplace de comunicação visual está chegando
      </h1>
      <p className="text-primary-300 text-lg max-w-md mb-10 leading-relaxed">
        Conectamos empresas, profissionais e fornecedores do setor. Cadastre-se nos nossos grupos e seja o primeiro a saber quando abrirmos.
      </p>

      {/* WhatsApp groups */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-10">
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

      {/* Divider */}
      <div className="w-full max-w-sm border-t border-primary-700 mb-6" />

      {/* Links discretos para testers */}
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
