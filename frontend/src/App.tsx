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
import { GoalsView } from './components/Goals/GoalsView'
import { TransactionForm } from './components/Transactions/TransactionForm'
import { TransactionType } from './types'

type View =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'ai-assistant'
  | 'reports'
  | 'goals'
  | 'profile'

function AppContent() {
  const { user } = useAuth()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<TransactionType>('expense')
  const [view, setView] = useState<View>(() => {
    const param = new URLSearchParams(window.location.search).get('view') as View | null
    return param &&
      ['dashboard', 'transactions', 'budgets', 'analytics', 'ai-assistant', 'reports', 'goals', 'profile'].includes(param)
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
    return <LoginPage onBackToHome={() => setShowAuthForm(false)} />
  }

  // 2. Authenticated users: Mobile-first navigation and view routing
  return (
    <>
      <Layout
        active={view}
        onNavigate={(key) => setView(key as View)}
        onOpenAddTransaction={(t = 'expense') => {
          setQuickAddType(t)
          setQuickAddOpen(true)
        }}
      >
        {view === 'dashboard' && (
          <Dashboard
            onNavigate={(k) => setView(k as View)}
            onOpenAdd={(t = 'expense') => {
              setQuickAddType(t)
              setQuickAddOpen(true)
            }}
          />
        )}
        {view === 'transactions' && <TransactionList />}
        {view === 'budgets' && <BudgetsView />}
        {view === 'analytics' && <AnalyticsView />}
        {view === 'goals' && <GoalsView />}
        {view === 'ai-assistant' && <AIAssistantView />}
        {view === 'reports' && <ReportsView />}
        {view === 'profile' && <ProfileView />}
      </Layout>

      {/* Global Quick Add Transaction Sheet / Modal */}
      {quickAddOpen && (
        <TransactionForm
          presetType={quickAddType}
          onClose={() => setQuickAddOpen(false)}
        />
      )}
    </>
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
