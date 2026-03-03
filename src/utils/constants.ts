// Estados brasileiros
export const BR_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
]

export const USER_TYPE_LABELS = {
  empresa:            'Empresa',
  profissional:       'Profissional',
  fornecedor:         'Fornecedor',
  fornecedor_empresa: 'Fornecedor/Empresa',
  empresa_prestadora: 'Empresa Prestadora',
  admin:              'Administrador',
} as const

export const PROJECT_STATUS_LABELS = {
  open: 'Aberto',
  in_negotiation: 'Em Negociação',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
} as const

export const PROPOSAL_STATUS_LABELS = {
  pending: 'Aguardando',
  accepted: 'Aceita',
  rejected: 'Recusada',
  withdrawn: 'Retirada',
} as const

export const SUBSCRIPTION_STATUS_LABELS = {
  trial: 'Trial',
  active: 'Ativo',
  pending: 'Aguardando Pagamento',
  cancelled: 'Cancelado',
  expired: 'Expirado',
} as const

export const SPECIALTIES = [
  'Comunicação Visual',
  'Design Gráfico',
  'Identidade Visual',
  'Branding',
  'Impressão Digital',
  'Plotagem',
  'Sinalização',
  'Lettering',
  'Fachadas',
  'Adesivos Vinílicos',
  'Banners e Lonas',
  'Letreiros Luminosos',
  'Displays e Expositores',
  'Stands e Cenografia',
  'Fotografia',
  'Vídeo e Motion',
  'Ilustração',
  'Web Design',
] as const
