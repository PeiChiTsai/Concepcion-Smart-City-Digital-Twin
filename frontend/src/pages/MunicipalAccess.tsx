import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../supabaseClient'
import './MunicipalAccess.css'

export type AccessRole = 'citizen' | 'municipal'

type MunicipalAccessProps = {
  role: AccessRole
}

export default function MunicipalAccess({ role }: MunicipalAccessProps) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = typeof location.state?.from === 'string'
    && (role === 'citizen'
      ? ['/report', '/report-chat'].includes(location.state.from)
      : ['/dashboard', '/admin'].includes(location.state.from))
    ? location.state.from
    : role === 'citizen' ? '/report-chat' : '/dashboard'
  const isMunicipal = role === 'municipal'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add the project URL and anon key to frontend/.env, then restart Vite.')
      return
    }

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const name = String(formData.get('name') ?? '').trim()

    setIsSubmitting(true)
    try {
      if (isCreatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              requested_role: role,
            },
          },
        })

        if (error) {
          setErrorMessage(error.message)
        } else if (data.session) {
          navigate(returnTo, { replace: true })
        } else {
          setMessage('Account created. Check your email to confirm it, then sign in. For instant access, disable email confirmation in your Supabase Auth settings.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setErrorMessage(error.message)
        } else {
          navigate(returnTo, { replace: true })
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="municipal-access">
      <div className="access-grid" aria-hidden="true" />
      <div className="access-card">
        <Link className="access-home-link" to="/">← Back to city portal</Link>
        <div className="access-eyebrow"><span /> {isMunicipal ? 'MUNICIPAL PORTAL' : 'CITIZEN PORTAL'}</div>
        <h1>
          {isCreatingAccount
            ? 'Create your account.'
            : isMunicipal ? 'Welcome back.' : 'Welcome, neighbor.'}
        </h1>
        <p className="access-intro">
          {isCreatingAccount
            ? isMunicipal
              ? 'Create an account to enter the read-only city operations demo.'
              : 'Create a free account to report and follow local issues.'
            : isMunicipal
              ? 'Sign in to explore city operations. Unapproved accounts open in read-only demo mode.'
              : 'Sign in to continue to citizen services.'}
        </p>

        {!supabaseConfigured && (
          <div className="access-error" role="alert">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>frontend/.env</code>, then restart Vite.
          </div>
        )}

        {isMunicipal && (
          <div className="demo-notice" role="note">
            <span aria-hidden="true">ⓘ</span>
            <p><strong>Read-only by default.</strong> Real municipal access requires administrator approval.</p>
          </div>
        )}

        {message && <div className="access-success" role="status">{message}</div>}
        {errorMessage && <div className="access-error" role="alert">{errorMessage}</div>}

        <form className="access-form" onSubmit={handleSubmit}>
          {isCreatingAccount && (
            <label>
              <span>FULL NAME</span>
              <input autoComplete="name" name="name" placeholder="Your name" required />
            </label>
          )}
          <label>
            <span>EMAIL</span>
            <input autoComplete="email" name="email" placeholder={isMunicipal ? 'name@city.gov' : 'you@example.com'} required type="email" />
          </label>
          <label>
            <span>PASSWORD</span>
            <input
              autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
              minLength={isCreatingAccount ? 8 : undefined}
              name="password"
              placeholder={isCreatingAccount ? 'At least 8 characters' : 'Your password'}
              required
              type="password"
            />
          </label>
          <button className="access-submit" disabled={isSubmitting || !supabaseConfigured} type="submit">
            {isSubmitting
              ? 'Please wait...'
              : isCreatingAccount
                ? 'Create free account'
                : 'Sign in'}
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div className="access-switch">
          {isCreatingAccount ? 'Already have an account?' : 'New to the city portal?'}
          <button
            onClick={() => {
              setIsCreatingAccount((current) => !current)
              setMessage('')
              setErrorMessage('')
            }}
            type="button"
          >
            {isCreatingAccount ? 'Sign in' : 'Create an account'}
          </button>
        </div>
        <div className="access-footer">
          <span>CONCEPCIÓN · BIOBÍO</span>
          <span>{isMunicipal ? 'READ-ONLY UNTIL APPROVED' : 'CITIZEN SERVICES'} <i /></span>
        </div>
      </div>
    </section>
  )
}
