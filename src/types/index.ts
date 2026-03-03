/* ============================================================
   VISUMO — Type Definitions
   ============================================================ */

// ─── Enums ──────────────────────────────────────────────────

export type UserType = 'empresa' | 'profissional' | 'fornecedor' | 'fornecedor_empresa' | 'empresa_prestadora' | 'admin'

export type ProjectStatus =
  | 'open'
  | 'in_negotiation'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'pending'
  | 'cancelled'
  | 'expired'

export type BillingCycle = 'monthly' | 'yearly'

export type CouponType =
  | 'percentage'
  | 'fixed_amount'
  | 'free_months'
  | 'lifetime_free'

// ─── Profile ────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  user_type: UserType
  company_name: string | null
  document_number: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  bio: string | null
  website: string | null
  linkedin: string | null
  portfolio_url: string | null
  profile_image_url: string | null
  latitude: number | null
  longitude: number | null
  coverage_radius_km: number | null
  coverage_cities: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Project Category ────────────────────────────────────────

export interface ProjectCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

// ─── Project ─────────────────────────────────────────────────

export interface Project {
  id: string
  client_id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  status: ProjectStatus
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  view_count: number
  created_at: string
  updated_at: string
  // Relations
  client?: Profile
  categories?: ProjectCategory[]
  images?: ProjectImage[]
  proposals_count?: number
}

export interface ProjectImage {
  id: string
  project_id: string
  image_url: string
  display_order: number
  created_at: string
}

// ─── Proposal ────────────────────────────────────────────────

export interface Proposal {
  id: string
  project_id: string
  professional_id: string
  message: string
  proposed_value: number
  estimated_days: number
  status: ProposalStatus
  created_at: string
  updated_at: string
  // Relations
  project?: Project
  professional?: Profile
}

// ─── Chat ────────────────────────────────────────────────────

export interface Conversation {
  id: string
  project_id: string
  proposal_id: string | null
  participant_one_id: string
  participant_two_id: string
  last_message_at: string | null
  created_at: string
  // Relations
  project?: Project
  participant_one?: Profile
  participant_two?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  image_url: string | null
  is_progress_update: boolean
  is_read: boolean
  created_at: string
  // Relations
  sender?: Profile
}

// ─── Portfolio ────────────────────────────────────────────────

export interface PortfolioImage {
  id: string
  profile_id: string
  image_url: string
  title: string | null
  description: string | null
  display_order: number
  created_at: string
}

// ─── Project Attachment ───────────────────────────────────────

export interface ProjectAttachment {
  id: string
  project_id: string
  uploaded_by: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  category: string | null
  caption: string | null
  created_at: string
  uploader?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

// ─── Subscription ─────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  features: string[]
  user_type: UserType
  max_active_projects: number | null
  max_proposals_per_month: number | null
  is_active: boolean
  display_order: number
  payment_link_monthly: string | null
  payment_link_yearly: string | null
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_price: number
  subscription_start_date: string | null
  subscription_end_date: string | null
  trial_end_date: string | null
  auto_renew: boolean
  coupon_code: string | null
  discount_applied: number
  mercadopago_subscription_id: string | null
  created_at: string
  updated_at: string
  // Relations
  plan?: SubscriptionPlan
}

// ─── Coupon ──────────────────────────────────────────────────

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  max_uses: number | null
  current_uses: number
  valid_until: string | null
  applicable_user_types: UserType[] | null
  is_active: boolean
  created_by: string
  created_at: string
}

export interface CouponUsage {
  id: string
  coupon_id: string
  user_id: string
  subscription_id: string
  used_at: string
}

// ─── Product (Fornecedor) ─────────────────────────────────────

export interface Product {
  id: string
  supplier_id: string
  title: string
  description: string | null
  price: number | null
  category: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  supplier?: Profile
}

// ─── API / Form Types ─────────────────────────────────────────

export interface ApiError {
  message: string
  code?: string
}

export interface PaginationParams {
  page: number
  perPage: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  perPage: number
  totalPages: number
}

// ─── Filter Types ─────────────────────────────────────────────

export interface ProjectFilters {
  category?: string
  city?: string
  state?: string
  status?: ProjectStatus
  budgetMin?: number
  budgetMax?: number
  nearbyKm?: number
  userLat?: number
  userLng?: number
}

// ─── Notification ────────────────────────────────────────────

export type NotificationType =
  | 'nova_proposta'
  | 'proposta_aceita'
  | 'proposta_recusada'
  | 'projeto_finalizado'
  | 'nova_avaliacao'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ─── Admin ───────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number
  totalCompanies: number
  totalProfessionals: number
  totalSuppliers: number
  totalProjects: number
  activeProjects: number
  totalSubscriptions: number
  activeSubscriptions: number
  monthlyRevenue: number
}
