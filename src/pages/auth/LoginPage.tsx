import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Schema ──────────────────────────────────────────────────

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
type FormData = z.infer<typeof schema>

// ─── Component ───────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password)
      navigate('/dashboard/home', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos')
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Confirme seu email antes de entrar')
      } else {
        toast.error('Erro ao entrar. Tente novamente.')
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand panel (desktop) ─────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-primary-600 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-white font-bold text-3xl">Visumo</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-4">
            Bem-vindo ao marketplace de comunicação visual
          </h2>
          <p className="text-primary-300 text-base leading-relaxed">
            Conectamos empresas, profissionais e fornecedores do mercado de comunicação visual.
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              'Projetos publicados e propostas em minutos',
              'Chat em tempo real entre contratante e profissional',
              'Pagamentos seguros e gestão simplificada',
            ].map((text) => (
              <div key={text} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-500/30 border border-primary-400 flex items-center justify-center shrink-0">
                  <span className="text-primary-300 text-xs">✓</span>
                </div>
                <p className="text-primary-200 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-primary-700 font-bold text-2xl">Visumo</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Entrar na sua conta</h1>
              <p className="text-slate-500 text-sm mt-1">
                Não tem conta?{' '}
                <Link to="/cadastro" className="text-primary-600 font-medium hover:text-primary-700">
                  Cadastre-se grátis
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>Senha</Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    error={errors.password?.message}
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                Entrar
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Ao entrar, você concorda com nossos{' '}
            <span className="text-slate-600 underline cursor-pointer">Termos de Uso</span>{' '}
            e{' '}
            <span className="text-slate-600 underline cursor-pointer">Política de Privacidade</span>
          </p>
        </div>
      </div>
    </div>
  )
}
