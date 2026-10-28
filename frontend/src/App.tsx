import React, { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import CitizenReport from './pages/CitizenReport'
import CitizenReportChat from './pages/CitizenReport_Chat'
import GovDashboard from './pages/GovDashboard'
import AdminDashboard from './pages/AdminDashboard'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import MunicipalAccess from './pages/MunicipalAccess'
import { supabase, supabaseConfigured } from './supabaseClient'
import { LanguageProvider, LanguageSwitcher, useI18n } from './i18n'

function MunicipalRoute({
  authLoading,
  user,
  children,
}: {
  authLoading: boolean
  user: User | null
  children: React.ReactNode
}) {
  const location = useLocation()
  const { t } = useI18n()

  if (authLoading) return <div className="auth-loading">{t('Connecting to city services...')}</div>
  if (!user) {
    return <Navigate to="/municipal-access" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function CitizenRoute({
  authLoading,
  user,
  children,
}: {
  authLoading: boolean
  user: User | null
  children: React.ReactNode
}) {
  const location = useLocation()
  const { t } = useI18n()

  if (authLoading) return <div className="auth-loading">{t('Connecting to city services...')}</div>
  if (!user) {
    return <Navigate to="/citizen-access" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function hasMunicipalApproval(user: User | null) {
  return user?.app_metadata?.role === 'municipal_admin'
    && user.app_metadata?.municipal_approved === true
}

function AppContent() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isHome = pathname === '/'
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(supabaseConfigured)
  const [authError, setAuthError] = useState('')
  const user = session?.user ?? null
  const isMunicipalApproved = hasMunicipalApproval(user)
  const isMunicipalAccount = isMunicipalApproved
    || user?.user_metadata?.requested_role === 'municipal'
  const accountLabel = isMunicipalAccount
    ? t('MUNICIPAL ACCOUNT')
    : t('CITIZEN ACCOUNT')

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    let isMounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession)
        setAuthError('')
      }
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        console.error('Failed to restore Supabase session:', error)
        setAuthError('restore-session')
      }
      setSession(data.session)
      setAuthLoading(false)
    }).catch((error: unknown) => {
      if (!isMounted) return
      console.error('Failed to restore Supabase session:', error)
      setAuthError('restore-session')
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Failed to sign out:', error)
      setAuthError('sign-out')
      return
    }
    setAuthError('')
    navigate('/')
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <Link className="app-brand" to="/">
          <span className="app-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 22.5 16 6l11 16.5H5Z" stroke="currentColor" strokeWidth="1.7" />
              <path d="M10 22.5 16 13l6 9.5M16 6v16.5" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16" cy="22.5" r="2.2" fill="currentColor" />
            </svg>
          </span>
          <span className="app-brand-name">CONCEPCIÓN<span className="app-brand-light">SMART CITY</span></span>
        </Link>
        <div className="app-nav-links">
          <NavLink to="/about">{t('About')}</NavLink>
          {/* <NavLink to="/report">Citizen report</NavLink> */}
          <NavLink to="/report-chat">{t('AI assistant')}</NavLink>
          <NavLink to="/dashboard">{t('3D digital twin')}</NavLink>
          <NavLink to={user ? '/admin' : '/municipal-access'}>{t('City operations')}</NavLink>
        </div>
        <div className="app-nav-right">
          {user ? (
            <div className="app-nav-account">
              <span className={`app-nav-account-role${isMunicipalApproved ? ' is-approved' : ''}`}>
                {accountLabel}
              </span>
              <button className="app-nav-home app-nav-logout" onClick={signOut} type="button">
                {t('Sign out')}
              </button>
            </div>
          ) : (
            <Link className="app-nav-home" to="/citizen-access">{t('Log in / Create account')}</Link>
          )}
          <LanguageSwitcher />
        </div>
      </nav>

      <main className={`app-content${isHome ? ' app-content-home' : ''}${pathname === '/admin' ? ' app-content-admin' : ''}`}>
        {authError && (
          <div
            role="alert"
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '12px 20px',
              borderBottom: '1px solid #fecaca',
            }}
          >
            {authError === 'restore-session'
              ? t('Unable to restore your city account session. Refresh the page or sign in again.')
              : t('Unable to sign out. Please try again.')}
          </div>
        )}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/citizen-access" element={user ? <Navigate to="/report-chat" replace /> : <MunicipalAccess role="citizen" />} />
          <Route path="/report" element={<CitizenRoute authLoading={authLoading} user={user}><CitizenReport /></CitizenRoute>} />
          <Route path="/report-chat" element={<CitizenRoute authLoading={authLoading} user={user}><CitizenReportChat /></CitizenRoute>} />
          <Route
            path="/municipal-access"
            element={user ? <Navigate to="/dashboard" replace /> : <MunicipalAccess role="municipal" />}
          />
          <Route
            path="/dashboard"
            element={(
              <GovDashboard
                readOnlyDemo={authLoading || !isMunicipalApproved}
                publicReports={!isMunicipalApproved}
              />
            )}
          />
          <Route path="/admin" element={
            <MunicipalRoute authLoading={authLoading} user={user}>
              <AdminDashboard readOnlyDemo={!isMunicipalApproved} />
            </MunicipalRoute>
          } />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  )
}
