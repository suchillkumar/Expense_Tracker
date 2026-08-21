import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ExpenseProvider } from './context/ExpenseContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { TransactionList } from './components/Transactions/TransactionList'
import { BudgetsView } from './components/Budgets/BudgetsView'
import { AnalyticsView } from './components/Analytics/AnalyticsView'
import { AIAssistantView } from './components/AI/AIAssistantView'
import { ReportsView } from './components/Reports/ReportsView'
import { ProfileView } from './components/Profile/ProfileView'
import { LoginPage } from './components/Auth/LoginPage'
import { LandingPage } from './components/Landing/LandingPage'

type View =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'ai-assistant'
  | 'reports'
  | 'profile'

function AppContent() {
  const { user } = useAuth()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [view, setView] = useState<View>(() => {
    const param = new URLSearchParams(window.location.search).get('view') as View | null
    return param &&
      ['dashboard', 'transactions', 'budgets', 'analytics', 'ai-assistant', 'reports', 'profile'].includes(param)
      ? param
      : 'dashboard'
  })

  // 1. Unauthenticated users: Can browse public Landing Page or Sign In / Register
  if (!user) {
    if (!showAuthForm) {
      return (
        <LandingPage
          onGetStarted={() => setShowAuthForm(true)}
          onLogin={() => setShowAuthForm(true)}
        />
      )
    }
    return <LoginPage />
  }

  // 2. Authenticated users: Strict 8-item navigation and view routing
  return (
    <Layout active={view} onNavigate={(key) => setView(key as View)}>
      {view === 'dashboard' && <Dashboard onNavigate={(k) => setView(k as View)} />}
      {view === 'transactions' && <TransactionList />}
      {view === 'budgets' && <BudgetsView />}
      {view === 'analytics' && <AnalyticsView />}
      {view === 'ai-assistant' && <AIAssistantView />}
      {view === 'reports' && <ReportsView />}
      {view === 'profile' && <ProfileView />}
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ExpenseProvider>
            <AppContent />
          </ExpenseProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
