import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { es } from './i18nEs'

export type Language = 'es' | 'en'

const STORAGE_KEY = 'concepcion-language'
const DEFAULT_LANGUAGE: Language = 'es'

type TranslateVariables = Record<string, string | number>

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (text: string, variables?: TranslateVariables) => string
}

function readStoredLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return DEFAULT_LANGUAGE
}

function interpolate(text: string, variables?: TranslateVariables) {
  if (!variables) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (
    name in variables ? String(variables[name]) : match
  ))
}

const I18nContext = createContext<I18nContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => undefined,
  t: (text, variables) => interpolate(es[text] ?? text, variables),
})

// English strings are the translation keys; Spanish comes from the dictionary.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore storage failures; the choice still applies for this session.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (text, variables) => interpolate(
      language === 'es' ? (es[text] ?? text) : text,
      variables,
    ),
  }), [language, setLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="language-switcher" role="group" aria-label={t('Language')}>
      {(['es', 'en'] as const).map((option) => (
        <button
          aria-pressed={language === option}
          className={language === option ? 'is-active' : ''}
          key={option}
          lang={option}
          onClick={() => setLanguage(option)}
          title={option === 'es' ? 'Español' : 'English'}
          type="button"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
