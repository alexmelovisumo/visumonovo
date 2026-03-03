import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { AuthGuard } from '@/components/common/AuthGuard'
import { GuestGuard } from '@/components/common/GuestGuard'
import { AdminGuard } from '@/components/common/AdminGuard'

// ─── Auth Pages ───────────────────────────────────────────────
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'

// ─── Public Pages ─────────────────────────────────────────────
import { LandingPage } from '@/pages/public/LandingPage'
import { PlanSelectionPage } from '@/pages/public/PlanSelectionPage'

// ─── Dashboard Pages ──────────────────────────────────────────
import { HomePage } from '@/pages/dashboard/HomePage'
import { ProfilePage } from '@/pages/dashboard/ProfilePage'
import { LocationSetupPage } from '@/pages/dashboard/LocationSetupPage'
import { MyFavoritesPage } from '@/pages/dashboard/MyFavoritesPage'

// ─── Company Pages ────────────────────────────────────────────
import { CreateProjectPage } from '@/pages/dashboard/company/CreateProjectPage'
import { MyProjectsPage } from '@/pages/dashboard/company/MyProjectsPage'
import { ProjectDetailsPage } from '@/pages/dashboard/company/ProjectDetailsPage'
import { EditProjectPage } from '@/pages/dashboard/company/EditProjectPage'

// ─── Professional Pages ───────────────────────────────────────
import { ProjectsListPage } from '@/pages/dashboard/professional/ProjectsListPage'
import { NegotiationsPage } from '@/pages/dashboard/professional/NegotiationsPage'
import { ManageProjectsPage } from '@/pages/dashboard/professional/ManageProjectsPage'
import { ProfessionalsListPage } from '@/pages/dashboard/professional/ProfessionalsListPage'
import { ProfessionalDetailPage } from '@/pages/dashboard/professional/ProfessionalDetailPage'
import { NearbyProfessionalsPage } from '@/pages/dashboard/professional/NearbyProfessionalsPage'
import { ProfessionalStatsPage } from '@/pages/dashboard/professional/ProfessionalStatsPage'

// ─── Supplier Pages ───────────────────────────────────────────
import { ManageProductsPage } from '@/pages/dashboard/supplier/ManageProductsPage'
import { SuppliersListPage } from '@/pages/dashboard/supplier/SuppliersListPage'
import { SupplierDetailPage } from '@/pages/dashboard/supplier/SupplierDetailPage'

// ─── Subscription Pages ───────────────────────────────────────
import { PaymentPendingPage } from '@/pages/dashboard/PaymentPendingPage'
import { RenewSubscriptionPage } from '@/pages/dashboard/RenewSubscriptionPage'
import { ConversationsPage } from '@/pages/dashboard/ConversationsPage'
import { ConversationPage } from '@/pages/dashboard/ConversationPage'

// ─── Admin Pages ──────────────────────────────────────────────
import { AdminDashboard } from '@/pages/dashboard/admin/AdminDashboard'
import { UserManagementPage } from '@/pages/dashboard/admin/UserManagementPage'
import { CouponGeneratorPage } from '@/pages/dashboard/admin/CouponGeneratorPage'
import { PlanManagementPage } from '@/pages/dashboard/admin/PlanManagementPage'
import { CategoryManagementPage } from '@/pages/dashboard/admin/CategoryManagementPage'
import { PaymentLogsPage } from '@/pages/dashboard/admin/PaymentLogsPage'

// ─── Router ───────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/escolher-plano', element: <PlanSelectionPage /> },
    ],
  },

  // Auth routes (only for guests)
  {
    element: <GuestGuard />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <SignUpPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
      { path: '/redefinir-senha', element: <ResetPasswordPage /> },
    ],
  },

  // Protected dashboard routes
  {
    path: '/dashboard',
    element: <AuthGuard><DashboardLayout /></AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/dashboard/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'perfil', element: <ProfilePage /> },
      { path: 'favoritos', element: <MyFavoritesPage /> },
      { path: 'localizacao', element: <LocationSetupPage /> },
      { path: 'aguardando-pagamento', element: <PaymentPendingPage /> },
      { path: 'renovar-assinatura', element: <RenewSubscriptionPage /> },
      { path: 'mensagens', element: <ConversationsPage /> },
      { path: 'mensagens/:id', element: <ConversationPage /> },

      // Company
      { path: 'criar-projeto', element: <CreateProjectPage /> },
      { path: 'meus-projetos', element: <MyProjectsPage /> },
      { path: 'projeto/:id', element: <ProjectDetailsPage /> },
      { path: 'editar-projeto/:id', element: <EditProjectPage /> },

      // Professional
      { path: 'projetos', element: <ProjectsListPage /> },
      { path: 'negociacoes', element: <NegotiationsPage /> },
      { path: 'gerenciar-projetos', element: <ManageProjectsPage /> },
      { path: 'profissionais', element: <ProfessionalsListPage /> },
      { path: 'profissional/:id', element: <ProfessionalDetailPage /> },
      { path: 'profissionais/mapa', element: <NearbyProfessionalsPage /> },
      { path: 'estatisticas', element: <ProfessionalStatsPage /> },

      // Supplier
      { path: 'produtos', element: <ManageProductsPage /> },
      { path: 'fornecedores', element: <SuppliersListPage /> },
      { path: 'fornecedor/:id', element: <SupplierDetailPage /> },

      // Admin (only user_type = 'admin')
      {
        element: <AdminGuard />,
        children: [
          { path: 'admin', element: <AdminDashboard /> },
          { path: 'admin/usuarios', element: <UserManagementPage /> },
          { path: 'admin/cupons', element: <CouponGeneratorPage /> },
          { path: 'admin/planos', element: <PlanManagementPage /> },
          { path: 'admin/categorias', element: <CategoryManagementPage /> },
          { path: 'admin/pagamentos', element: <PaymentLogsPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
])
