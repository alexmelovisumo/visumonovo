import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Wrench, Package, Eye, EyeOff, ChevronLeft, ShoppingBag, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CitySelect } from '@/components/ui/city-select'
import { cn } from '@/lib/utils'
import { BR_STATES } from '@/utils/constants'
import type { UserType } from '@/types'

// ─── Types ───────────────────────────────────────────────────

type Step = 1 | 2 | 3

const userTypes = [
  {
    type: 'profissional' as UserType,
    icon: <Wrench size={24} />,
    label: 'Profissional',
    description: 'Quero encontrar projetos e oferecer meus serviços',
  },
  {
    type: 'fornecedor' as UserType,
    icon: <Package size={24} />,
    label: 'Fornecedor',
    description: 'Quero divulgar materiais e insumos para o setor',
  },
  {
    type: 'empresa' as UserType,
    icon: <Building2 size={24} />,
    label: 'Empresa',
    description: 'Quero publicar projetos e contratar profissionais',
  },
  {
    type: 'fornecedor_empresa' as UserType,
    icon: <ShoppingBag size={24} />,
    label: 'Fornecedor/Empresa',
    description: 'Forneço materiais e também contrato serviços',
  },
  {
    type: 'empresa_prestadora' as UserType,
    icon: <Layers size={24} />,
    label: 'Empresa Prestadora',
    description: 'Sou empresa e também presto serviços ao mercado',
  },
]

// ─── Schemas ─────────────────────────────────────────────────

const accountSchema = z
  .object({
    email:           z.string().email('Email inválido'),
    password:        z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

const profileSchema = z.object({
  full_name:    z.string().min(2, 'Nome muito curto'),
  phone:        z.string().min(10, 'Telefone inválido'),
  company_name: z.string().optional(),
  city:         z.string().min(2, 'Cidade é obrigatória'),
  state:        z.string().length(2, 'Selecione o estado'),
})

type AccountData = z.infer<typeof accountSchema>
type ProfileData = z.infer<typeof profileSchema>

// ─── Step indicator ───────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = ['Tipo de conta', 'Criar conta', 'Seu perfil']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const num = (i + 1) as Step
        const isActive = num === current
        const isDone = num < current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  isActive && 'bg-primary-600 text-white shadow-md shadow-primary-200',
                  isDone && 'bg-primary-100 text-primary-700',
                  !isActive && !isDone && 'bg-slate-100 text-slate-400'
                )}
              >
                {isDone ? '✓' : num}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isActive ? 'text-primary-700 font-medium' : 'text-slate-400'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 mb-5 transition-colors',
                  num < current ? 'bg-primary-300' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

// Mapa: nome do plano → user_type
const PLAN_TO_USER_TYPE: Record<string, UserType> = {
  plano_profissional:       'profissional',
  plano_fornecedor:         'fornecedor',
  plano_empresa:            'empresa',
  plano_fornecedor_empresa: 'fornecedor_empresa',
  plano_empresa_prestadora: 'empresa_prestadora',
}

export function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, fetchProfile } = useAuthStore()
  const [step, setStep] = useState<Step>(1)
  const [userType, setUserType] = useState<UserType | null>(null)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Form step 2
  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  // Form step 3
  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })

  // Se vier com ?plano= na URL, pré-seleciona o tipo e pula para step 2
  useEffect(() => {
    const plano = searchParams.get('plano')
    if (plano && PLAN_TO_USER_TYPE[plano]) {
      setUserType(PLAN_TO_USER_TYPE[plano])
      setStep(2)
    }
  }, [searchParams])

  // ── Step 1: Choose user type ──────────────────────────────

  const handleSelectType = (type: UserType) => {
    setUserType(type)
    setStep(2)
  }

  // ── Step 2: Account ───────────────────────────────────────

  const onAccountSubmit = (data: AccountData) => {
    setAccountData(data)
    setStep(3)
  }

  // ── Step 3: Profile → create account ─────────────────────

  const onProfileSubmit = async (profileData: ProfileData) => {
    if (!userType || !accountData) return

    try {
      // 1. Cria o usuário — todos os dados do perfil vão no metadata
      //    O trigger handle_new_user (SECURITY DEFINER) cria o perfil completo,
      //    então funciona mesmo quando confirmação de email está ativada.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          data: {
            user_type:    userType,
            full_name:    profileData.full_name,
            phone:        profileData.phone,
            city:         profileData.city,
            state:        profileData.state,
            company_name: userType === 'empresa' ? (profileData.company_name ?? '') : '',
          },
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Erro ao criar conta')

      // 2. Se a sessão existir (confirmação de email desativada), carrega perfil
      if (authData.session) {
        setUser(authData.user)
        // Aguarda o trigger handle_new_user criar o perfil no banco
        await new Promise(r => setTimeout(r, 2000))
        await fetchProfile(authData.user.id)
        toast.success('Conta criada com sucesso!')
        navigate('/dashboard/home', { replace: true })
      } else {
        // Email de confirmação foi enviado — redireciona para login com aviso
        toast.success('Conta criada! Verifique seu email para ativar o acesso.')
        navigate('/login', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('User already registered')) {
        toast.error('Este email já está cadastrado.')
        setStep(2)
      } else if (msg.includes('Password should be')) {
        toast.error('A senha deve ter pelo menos 6 caracteres.')
      } else {
        toast.error(`Erro ao criar conta: ${msg || 'Tente novamente.'}`)
      }
    }
  }

  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand (desktop) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 bg-primary-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-primary-600 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-10">
            <img src="/icons/icon-192x192.png" alt="Visumo" className="w-12 h-12 rounded-xl" />
            <span className="text-white font-bold text-3xl">Visumo</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Crie sua conta em poucos minutos
          </h2>
          <p className="text-primary-300 text-sm leading-relaxed">
            Planos anuais a partir de R$100. Pagamento seguro via PagBank.
          </p>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-5">
            <img src="/icons/icon-192x192.png" alt="Visumo" className="w-9 h-9 rounded-lg" />
            <span className="text-primary-700 font-bold text-2xl">Visumo</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8">
            <StepIndicator current={step} />

            {/* ── Step 1: User Type ─────────────────────── */}
            {step === 1 && (
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Como você vai usar o Visumo?</h1>
                <p className="text-slate-500 text-sm mb-6">Escolha seu perfil para configurar a experiência certa</p>

                <div className="space-y-3">
                  {userTypes.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => handleSelectType(item.type)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                        'hover:border-primary-400 hover:bg-primary-50',
                        userType === item.type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200'
                      )}
                    >
                      <div className="text-primary-600 shrink-0">{item.icon}</div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Já tem conta?{' '}
                  <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                    Entrar
                  </Link>
                </p>
              </div>
            )}

            {/* ── Step 2: Account credentials ──────────── */}
            {step === 2 && (
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>

                <h1 className="text-xl font-bold text-slate-900 mb-1">Crie seu acesso</h1>
                <p className="text-slate-500 text-sm mb-6">
                  Conta do tipo:{' '}
                  <strong className="text-primary-700">
                    {userTypes.find((u) => u.type === userType)?.label ?? userType}
                  </strong>
                </p>

                <form
                  onSubmit={accountForm.handleSubmit(onAccountSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email" required>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      error={accountForm.formState.errors.email?.message}
                      {...accountForm.register('email')}
                    />
                    {accountForm.formState.errors.email && (
                      <p className="text-xs text-red-500">{accountForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" required>Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        className="pr-10"
                        error={accountForm.formState.errors.password?.message}
                        {...accountForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {accountForm.formState.errors.password && (
                      <p className="text-xs text-red-500">{accountForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" required>Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repita a senha"
                        className="pr-10"
                        error={accountForm.formState.errors.confirmPassword?.message}
                        {...accountForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {accountForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-500">{accountForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Continuar
                  </Button>
                </form>
              </div>
            )}

            {/* ── Step 3: Profile data ──────────────────── */}
            {step === 3 && (
              <div>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                >
                  <ChevronLeft size={16} /> Voltar
                </button>

                <h1 className="text-xl font-bold text-slate-900 mb-1">Seus dados</h1>
                <p className="text-slate-500 text-sm mb-6">Informações básicas do seu perfil</p>

                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" required>
                      {(userType === 'empresa' || userType === 'fornecedor_empresa' || userType === 'empresa_prestadora')
                        ? 'Nome do responsável'
                        : 'Seu nome completo'}
                    </Label>
                    <Input
                      id="full_name"
                      autoComplete="name"
                      placeholder="Nome completo"
                      error={profileForm.formState.errors.full_name?.message}
                      {...profileForm.register('full_name')}
                    />
                    {profileForm.formState.errors.full_name && (
                      <p className="text-xs text-red-500">{profileForm.formState.errors.full_name.message}</p>
                    )}
                  </div>

                  {(userType === 'empresa' || userType === 'fornecedor_empresa' || userType === 'empresa_prestadora') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="company_name">Nome da empresa</Label>
                      <Input
                        id="company_name"
                        placeholder="Razão social ou nome fantasia"
                        {...profileForm.register('company_name')}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" required>Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="(11) 99999-9999"
                      error={profileForm.formState.errors.phone?.message}
                      {...profileForm.register('phone')}
                    />
                    {profileForm.formState.errors.phone && (
                      <p className="text-xs text-red-500">{profileForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="state" required>Estado</Label>
                      <Select
                        id="state"
                        error={profileForm.formState.errors.state?.message}
                        {...profileForm.register('state', { onChange: () => profileForm.setValue('city', '') })}
                      >
                        <option value="">Selecione o estado</option>
                        {BR_STATES.map((s) => (
                          <option key={s.uf} value={s.uf}>{s.uf} — {s.name}</option>
                        ))}
                      </Select>
                      {profileForm.formState.errors.state && (
                        <p className="text-xs text-red-500">{profileForm.formState.errors.state.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="city" required>Cidade</Label>
                      <CitySelect
                        id="city"
                        uf={profileForm.watch('state')}
                        error={profileForm.formState.errors.city?.message}
                        {...profileForm.register('city')}
                      />
                      {profileForm.formState.errors.city && (
                        <p className="text-xs text-red-500">{profileForm.formState.errors.city.message}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={profileForm.formState.isSubmitting}
                  >
                    Criar conta e escolher plano
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
