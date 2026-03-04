import { Link } from 'react-router-dom'
import { Home, Search, ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="relative inline-block mb-8">
          <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
            <span className="text-6xl font-extrabold text-primary-300 select-none">404</span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center shadow-sm">
            <Search size={20} className="text-slate-300" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Página não encontrada</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          O endereço que você acessou não existe ou foi movido.
          Verifique o link ou volte para a página inicial.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Home size={16} /> Página inicial
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400 mb-3">Links úteis</p>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            <Link to="/dashboard/home" className="text-primary-600 hover:underline">Dashboard</Link>
            <Link to="/planos"         className="text-primary-600 hover:underline">Planos</Link>
            <Link to="/faq"            className="text-primary-600 hover:underline">FAQ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
