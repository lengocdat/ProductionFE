import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DiscoverPage from '@/pages/DiscoverPage'
import MatchesPage from '@/pages/MatchesPage'
import ChatPage from '@/pages/ChatPage'
import ProfilePage from '@/pages/ProfilePage'
import DebatePage from '@/pages/DebatePage'
import DebateRoomPage from '@/pages/DebateRoomPage'
import PremiumPage from '@/pages/PremiumPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import AdminPage from '@/pages/AdminPage'
import VerifyPendingPage from '@/pages/VerifyPendingPage'
import Layout from '@/components/Layout'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <div className="flex h-screen items-center justify-center"><span className="text-muted-foreground">Đang tải...</span></div>
  if (!user) return <Navigate to="/login" replace />
  // Redirect to verify email page if not verified (only if backend supports it)
  if (user.email_verified === false && location.pathname !== '/verify-pending') {
    return <Navigate to="/verify-pending" replace />
  }
  // Redirect to onboarding if no profile (except if already on onboarding page)
  if (!user.has_profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) return <Navigate to="/discover" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/verify-pending" element={<VerifyPendingPage />} />
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/matches" element={<MatchesPage />} />
                  <Route path="/chat/:matchId" element={<ChatPage />} />
                  <Route path="/debate" element={<DebatePage />} />
                  <Route path="/debate/:roomId" element={<DebateRoomPage />} />
                  <Route path="/premium" element={<PremiumPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/discover" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
